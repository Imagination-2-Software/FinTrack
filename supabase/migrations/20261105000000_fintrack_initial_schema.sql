-- ==============================================================================
-- FinTrack Institutional Schema Migration (Production Hardened)
-- Migration Name: 20261105000000_fintrack_initial_schema.sql
-- Description: Core tables, constraints, indexes, triggers, and Row Level Security
-- Security Hardening:
--   1. Transaction Immutability & Cross-Tenant Investment Ownership Validation
--   2. Strict Profile Column Security & Self-Reactivation Prevention
--   3. Database-Enforced Account Deactivation (is_active = false locks all data)
--   4. Immutable Email Synchronization (strictly verified auth.users workflow)
--   5. Financial Math Precision Enforcement (quantity * price = total_amount)
--   6. Scoped Parameterless is_admin() & is_active_user() with Least-Privilege Grants
--   7. Nullable Today's P&L Baseline
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper Functions & Timestamp Management
-- ------------------------------------------------------------------------------

-- Generic updated_at timestamp trigger function with fixed search_path using standard now()
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Profiles Table (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  display_currency TEXT NOT NULL DEFAULT 'USD' CHECK (display_currency IN ('USD', 'INR')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on email for administrative lookups and role filtering
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Attach updated_at trigger to profiles
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Security Definer Functions & Profile Protection
-- ------------------------------------------------------------------------------

-- Secure admin verification function operating strictly on current session (auth.uid())
-- Prevents authenticated users from probing arbitrary users' admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT (role = 'admin' AND is_active = TRUE) INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

-- Explicit function permissions for is_admin
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Secure active account verification function operating strictly on current session (auth.uid())
-- Used in RLS policies to immediately block deactivated accounts across all protected data
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_is_active BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT is_active INTO v_is_active
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN COALESCE(v_is_active, FALSE);
END;
$$;

-- Explicit function permissions for is_active_user
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated, service_role;

-- Enforce strict profile column security on updates:
-- 1. Universal Email Protection: profiles.email can ONLY be modified if it matches verified auth.users.email.
--    Direct email edits by normal users, admins, or service-side profile updates are strictly rejected.
-- 2. Immutable Fields: id and created_at cannot be updated by anyone.
-- 3. Administrative Control: role and is_active can ONLY be altered by service_role or confirmed admins.
-- 4. Self-Reactivation Guard: Deactivated users are strictly blocked from setting is_active = true.
-- 5. Normal User Scope: Normal active users can only update full_name, avatar_url, and display_currency.
CREATE OR REPLACE FUNCTION public.enforce_profile_update_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_service_role BOOLEAN;
  v_is_admin_user BOOLEAN;
BEGIN
  -- UNIVERSAL RULE 1: profiles.email MUST strictly match verified auth.users.email
  -- Prevents ANY actor (user, admin, or script) from updating profiles.email out-of-band
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = NEW.id AND email = NEW.email
    ) THEN
      RAISE EXCEPTION 'Access denied: Profile email can only be updated through the verified Supabase Auth workflow.';
    END IF;
  END IF;

  -- UNIVERSAL RULE 2: id and created_at are strictly immutable
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Immutable field: Profile ID cannot be modified.';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Immutable field: Profile creation timestamp cannot be modified.';
  END IF;

  v_is_service_role := (COALESCE(auth.jwt() ->> 'role', '') = 'service_role');
  v_is_admin_user := public.is_admin();

  -- Trusted administrative execution path:
  IF v_is_service_role OR v_is_admin_user THEN
    RETURN NEW;
  END IF;

  -- FOR REGULAR AUTHENTICATED USERS:
  -- Strictly reject privilege escalation and status tampering
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Access denied: Users cannot modify their own role. Administrative privileges required.';
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Access denied: Users cannot modify their active account status. Administrative privileges required.';
  END IF;

  -- Allowed fields for normal self-service updates: full_name, avatar_url, display_currency
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_update_security ON public.profiles;
CREATE TRIGGER trg_enforce_profile_update_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_update_security();

-- Trigger to automatically create profile on Supabase auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    display_currency,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user', -- Always 'user' upon self-registration; client metadata is never trusted for admin
    'USD',
    TRUE,
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to automatically synchronize profiles.email when auth.users.email is updated/verified
CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_sync();

-- ------------------------------------------------------------------------------
-- 4. Investments Table
-- ------------------------------------------------------------------------------

-- Notes on previous_close_price:
-- Nullable without DEFAULT 0 to prevent naive (current_price - 0) bugs.
-- If previous_close_price IS NULL:
--   - If purchase_date == CURRENT_DATE: baseline = purchase_price
--   - If purchase_date < CURRENT_DATE: baseline missing -> Today's P&L is N/A / Pending Baseline
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('Stocks', 'Mutual Funds', 'ETFs', 'Commodities', 'Cryptocurrency')),
  symbol TEXT NOT NULL,
  quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
  purchase_price NUMERIC(18, 4) NOT NULL CHECK (purchase_price >= 0),
  purchase_date DATE NOT NULL,
  current_price NUMERIC(18, 4) NOT NULL CHECK (current_price >= 0),
  previous_close_price NUMERIC(18, 4) CHECK (previous_close_price IS NULL OR previous_close_price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'INR')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Composite unique constraint to enable cross-tenant ownership foreign key verification in transactions
  CONSTRAINT uq_investments_id_user_id UNIQUE (id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_symbol ON public.investments(symbol);
CREATE INDEX IF NOT EXISTS idx_investments_asset_type ON public.investments(asset_type);
CREATE INDEX IF NOT EXISTS idx_investments_created_at ON public.investments(created_at DESC);

-- Attach updated_at trigger to investments
DROP TRIGGER IF EXISTS set_investments_updated_at ON public.investments;
CREATE TRIGGER set_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. Transactions Table (Immutable Financial Ledger)
-- ------------------------------------------------------------------------------
-- Architecture note on Transaction Immutability & Financial Integrity:
-- 1. Transactions are strictly append-only for normal users.
-- 2. UPDATE and DELETE policies are completely omitted for authenticated users.
-- 3. Composite foreign key + trigger guarantees investment_id belongs strictly to the transaction's user_id.
-- 4. Mathematical check constraint enforces total_amount == round(quantity * price, 4) within 0.01 tolerance.
-- 5. Audit & Retention Protection: user_id uses ON DELETE RESTRICT to prevent purging historical ledgers.
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  investment_id UUID,
  asset_symbol TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
  quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
  price NUMERIC(18, 4) NOT NULL CHECK (price >= 0),
  total_amount NUMERIC(18, 4) NOT NULL CHECK (total_amount >= 0),
  transaction_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Composite foreign key: investment must belong to the exact same user_id
  CONSTRAINT fk_transactions_investment_user
    FOREIGN KEY (investment_id, user_id)
    REFERENCES public.investments(id, user_id)
    ON DELETE SET NULL (investment_id),
  -- Financial integrity: total_amount must match quantity * price within 0.01 rounding tolerance
  CONSTRAINT chk_transactions_total_amount_integrity
    CHECK (abs(total_amount - round(quantity * price, 4)) <= 0.01)
);

-- Indexes for transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_investment_id ON public.transactions(investment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON public.transactions(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);

-- Trigger to validate transaction ownership and auto-calculate total_amount if omitted
CREATE OR REPLACE FUNCTION public.process_transaction_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Verify cross-user investment ownership if investment_id is supplied
  IF NEW.investment_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.investments
      WHERE id = NEW.investment_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Ownership violation: Transaction investment_id (%) does not belong to user (%).',
        NEW.investment_id, NEW.user_id;
    END IF;
  END IF;

  -- 2. Auto-compute total_amount if omitted or zero with positive quantity/price
  IF NEW.total_amount IS NULL OR (NEW.total_amount = 0 AND NEW.quantity > 0 AND NEW.price > 0) THEN
    NEW.total_amount := round(NEW.quantity * NEW.price, 4);
  END IF;

  -- 3. Strict financial math integrity check
  IF abs(NEW.total_amount - round(NEW.quantity * NEW.price, 4)) > 0.01 THEN
    RAISE EXCEPTION 'Financial integrity violation: total_amount (%) does not match quantity (%) * price (%) within 0.01 tolerance.',
      NEW.total_amount, NEW.quantity, NEW.price;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_transaction_integrity ON public.transactions;
CREATE TRIGGER trg_process_transaction_integrity
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_transaction_integrity();

-- ------------------------------------------------------------------------------
-- 6. Watchlist Table
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('Stocks', 'Mutual Funds', 'ETFs', 'Commodities', 'Cryptocurrency')),
  target_price NUMERIC(18, 4),
  current_price NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (current_price >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Prevent duplicate watchlist items for the same user and asset symbol
  CONSTRAINT uq_watchlist_user_symbol UNIQUE (user_id, symbol)
);

-- Indexes for watchlist queries
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON public.watchlist(symbol);

-- Attach updated_at trigger to watchlist
DROP TRIGGER IF EXISTS set_watchlist_updated_at ON public.watchlist;
CREATE TRIGGER set_watchlist_updated_at
  BEFORE UPDATE ON public.watchlist
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. Row Level Security (RLS) Configuration
-- Hardened with public.is_active_user() to immediately block deactivated accounts
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Profiles Policies
-- ------------------------------------------------------------------------------
-- Users can read their own profile (including deactivated status for frontend feedback)
-- Administrators can read all profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- Only ACTIVE users can update their own profile; deactivated accounts are barred from updates
-- Administrators can update any profile (e.g. reactivate or deactivate users)
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = id AND public.is_active_user()) OR public.is_admin())
  WITH CHECK ((auth.uid() = id AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
CREATE POLICY "profiles_delete_admin_only"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- Investments Policies
-- Deactivated users (is_active = false) are barred from accessing or modifying holdings
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "investments_select_own_or_admin" ON public.investments;
CREATE POLICY "investments_select_own_or_admin"
  ON public.investments
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "investments_insert_own" ON public.investments;
CREATE POLICY "investments_insert_own"
  ON public.investments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

DROP POLICY IF EXISTS "investments_update_own" ON public.investments;
CREATE POLICY "investments_update_own"
  ON public.investments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_active_user())
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

DROP POLICY IF EXISTS "investments_delete_own" ON public.investments;
CREATE POLICY "investments_delete_own"
  ON public.investments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_active_user());

-- ------------------------------------------------------------------------------
-- Transactions Policies (Strictly Append-Only for Active Users)
-- Deactivated users are barred from querying or creating transactions
-- UPDATE and DELETE policies are completely omitted for authenticated users.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "transactions_select_own_or_admin" ON public.transactions;
CREATE POLICY "transactions_select_own_or_admin"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

-- Explicitly drop legacy/boilerplate policies if they existed
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;

-- ------------------------------------------------------------------------------
-- Watchlist Policies
-- Deactivated users are barred from accessing or modifying watchlist items
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "watchlist_select_own_or_admin" ON public.watchlist;
DROP POLICY IF EXISTS "watchlist_select_own" ON public.watchlist;
CREATE POLICY "watchlist_select_own_or_admin"
  ON public.watchlist
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "watchlist_insert_own" ON public.watchlist;
CREATE POLICY "watchlist_insert_own"
  ON public.watchlist
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

DROP POLICY IF EXISTS "watchlist_update_own" ON public.watchlist;
CREATE POLICY "watchlist_update_own"
  ON public.watchlist
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_active_user())
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

DROP POLICY IF EXISTS "watchlist_delete_own" ON public.watchlist;
CREATE POLICY "watchlist_delete_own"
  ON public.watchlist
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_active_user());
