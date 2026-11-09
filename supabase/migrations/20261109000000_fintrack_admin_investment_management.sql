-- ==============================================================================
-- Migration: 20261109000000_fintrack_admin_investment_management.sql
-- Description:
--   1. Strict investment ownership immutability trigger (user_id, id).
--   2. Audit trail column performed_by on transactions with ON DELETE RESTRICT.
--   3. Updated RLS policies for admin investment management.
--   4. Hardened enforce_ledger_managed_position() — eliminates GUC bypass,
--      uses current_user check with SECURITY INVOKER.
--   5. Column-level UPDATE privilege hardening on investments.
--   6. Enhanced record_transaction RPC — removes set_config, stores caller
--      actor in performed_by, attributes position to holding owner.
-- Note: Forward-only migration file. Not executed automatically.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Investment Ownership & Identity Immutability Guard
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_investment_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Immutable field: Investment ownership (user_id) cannot be transferred.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Immutable field: Investment ID cannot be modified.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_investment_immutability() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_investment_immutability ON public.investments;
CREATE TRIGGER enforce_investment_immutability
  BEFORE UPDATE OF id, user_id ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_investment_immutability();

-- ------------------------------------------------------------------------------
-- 2. Transaction Audit Trail (Actor Identity)
-- ------------------------------------------------------------------------------

-- Nullable column for historical audit. Existing records remain intact with NULL.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_transactions_performed_by
  ON public.transactions(performed_by);

-- ------------------------------------------------------------------------------
-- 3. Hardened Ledger Trigger — Eliminate GUC Bypass Vulnerability
-- ------------------------------------------------------------------------------
-- PREVIOUS DESIGN: trusted current_setting('fintrack.record_transaction') GUC
--   which any authenticated user could set via set_config(), bypassing the ledger.
-- NEW DESIGN: SECURITY INVOKER — inside record_transaction() (SECURITY DEFINER
--   owned by postgres), current_user = 'postgres'. Direct user UPDATEs execute as
--   the authenticated role, which is NOT 'postgres' or 'supabase_admin'.
--   Combined with column-level REVOKE (section 5), this provides defense-in-depth.

CREATE OR REPLACE FUNCTION public.enforce_ledger_managed_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.quantity IS DISTINCT FROM OLD.quantity
      OR NEW.purchase_price IS DISTINCT FROM OLD.purchase_price)
    AND current_user NOT IN ('postgres', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'Holding quantity and average cost basis can only be changed by recording a BUY or SELL transaction.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_ledger_managed_position() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_ledger_managed_position ON public.investments;
CREATE TRIGGER enforce_ledger_managed_position
  BEFORE UPDATE OF quantity, purchase_price ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_ledger_managed_position();

-- ------------------------------------------------------------------------------
-- 4. Column-Level UPDATE Privilege Hardening on Investments
-- ------------------------------------------------------------------------------
-- Remove broad table-level UPDATE from all non-superuser roles.
-- Grant UPDATE only on permitted metadata columns to authenticated.
-- quantity and purchase_price are exclusively managed by record_transaction().

REVOKE UPDATE ON TABLE public.investments FROM PUBLIC, anon, authenticated;

GRANT UPDATE (asset_name, asset_type, symbol, purchase_date, current_price, currency, notes)
  ON TABLE public.investments TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Update Investment Policies for Administrator Operations
-- ------------------------------------------------------------------------------

-- Allow users to view their own holdings, and active administrators to view all holdings
DROP POLICY IF EXISTS "investments_select_own_or_admin" ON public.investments;
CREATE POLICY "investments_select_own_or_admin"
  ON public.investments
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id AND public.is_active_user())
    OR public.is_admin()
  );

-- Allow admins to insert holdings for active users
DROP POLICY IF EXISTS "investments_insert_own" ON public.investments;
DROP POLICY IF EXISTS "investments_insert_own_or_admin" ON public.investments;
CREATE POLICY "investments_insert_own_or_admin"
  ON public.investments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id AND public.is_active_user())
    OR (
      public.is_admin()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND is_active = true
      )
    )
  );

-- Allow admins to update holding metadata (non-ledger fields) for any user
DROP POLICY IF EXISTS "investments_update_own" ON public.investments;
DROP POLICY IF EXISTS "investments_update_own_or_admin" ON public.investments;
CREATE POLICY "investments_update_own_or_admin"
  ON public.investments
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id AND public.is_active_user())
    OR public.is_admin()
  )
  WITH CHECK (
    (auth.uid() = user_id AND public.is_active_user())
    OR public.is_admin()
  );

-- Allow admins to delete holdings (transactions retain immutable history via ON DELETE SET NULL)
DROP POLICY IF EXISTS "investments_delete_own" ON public.investments;
DROP POLICY IF EXISTS "investments_delete_own_or_admin" ON public.investments;
CREATE POLICY "investments_delete_own_or_admin"
  ON public.investments
  FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = user_id AND public.is_active_user())
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 6. Enhanced record_transaction RPC (Atomic Ledger with Audit Actor)
-- ------------------------------------------------------------------------------
-- KEY CHANGES from previous version:
--   - REMOVED: set_config('fintrack.record_transaction', ...) calls
--   - The UPDATE on quantity/purchase_price succeeds because this function is
--     SECURITY DEFINER owned by postgres, so current_user = 'postgres' which
--     passes the hardened enforce_ledger_managed_position() trigger check.
--   - performed_by stores the actual calling user (v_caller_id = auth.uid())
--   - user_id stores the investment owner (v_holding_user_id)

CREATE OR REPLACE FUNCTION public.record_transaction(
  p_investment_id UUID,
  p_transaction_type TEXT,
  p_quantity NUMERIC,
  p_price NUMERIC,
  p_transaction_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := public.is_admin();
  v_investment public.investments%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
  v_new_quantity NUMERIC;
  v_new_purchase_price NUMERIC;
  v_total_amount NUMERIC;
  v_holding_user_id UUID;
BEGIN
  IF v_caller_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active authenticated user or administrator is required.'
      USING ERRCODE = '42501';
  END IF;

  IF p_investment_id IS NULL
    OR p_transaction_type IS NULL
    OR p_transaction_type NOT IN ('BUY', 'SELL')
    OR p_quantity IS NULL
    OR p_quantity <= 0
    OR p_quantity > 999999999999
    OR p_price IS NULL
    OR p_price < 0
    OR p_price > 99999999999999
    OR p_transaction_date IS NULL
    OR (p_notes IS NOT NULL AND length(p_notes) > 2000)
  THEN
    RAISE EXCEPTION 'Transaction input is invalid.'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize trades on this holding. Normal users must own the holding;
  -- administrators may execute trades for any active user.
  SELECT *
  INTO v_investment
  FROM public.investments
  WHERE id = p_investment_id
    AND (user_id = v_caller_id OR v_is_admin)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investment not found or access denied.'
      USING ERRCODE = '42501';
  END IF;

  v_holding_user_id := v_investment.user_id;

  -- Ensure the holding user profile is active
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_holding_user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Cannot record transaction for a deactivated user.'
      USING ERRCODE = '42501';
  END IF;

  IF p_transaction_type = 'SELL' AND p_quantity > v_investment.quantity THEN
    RAISE EXCEPTION 'Insufficient available quantity for this sale.'
      USING ERRCODE = '23514';
  END IF;

  IF p_transaction_type = 'BUY' THEN
    v_new_quantity := v_investment.quantity + p_quantity;
    v_new_purchase_price := round(
      (
        v_investment.quantity * v_investment.purchase_price
        + p_quantity * p_price
      ) / v_new_quantity,
      4
    );
  ELSE
    v_new_quantity := v_investment.quantity - p_quantity;
    v_new_purchase_price := v_investment.purchase_price;
  END IF;

  IF v_new_quantity > 999999999999 THEN
    RAISE EXCEPTION 'Resulting holding quantity exceeds the supported range.'
      USING ERRCODE = '22003';
  END IF;

  v_total_amount := round(p_quantity * p_price, 4);
  IF v_total_amount > 99999999999999.9999 THEN
    RAISE EXCEPTION 'Transaction total exceeds the supported range.'
      USING ERRCODE = '22003';
  END IF;

  -- No set_config needed. This function runs as SECURITY DEFINER (owner: postgres),
  -- so current_user = 'postgres' which satisfies the hardened trigger check.
  UPDATE public.investments
  SET quantity = v_new_quantity,
      purchase_price = v_new_purchase_price
  WHERE id = v_investment.id
    AND user_id = v_holding_user_id;

  -- Insert ledger record with both holding owner (user_id) and acting initiator (performed_by)
  INSERT INTO public.transactions (
    user_id,
    investment_id,
    asset_symbol,
    asset_name,
    transaction_type,
    quantity,
    price,
    total_amount,
    transaction_date,
    notes,
    currency,
    performed_by
  )
  VALUES (
    v_holding_user_id,
    v_investment.id,
    v_investment.symbol,
    v_investment.asset_name,
    p_transaction_type,
    p_quantity,
    p_price,
    v_total_amount,
    p_transaction_date,
    p_notes,
    v_investment.currency,
    v_caller_id
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.record_transaction(UUID, TEXT, NUMERIC, NUMERIC, DATE, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_transaction(UUID, TEXT, NUMERIC, NUMERIC, DATE, TEXT)
  TO authenticated;
