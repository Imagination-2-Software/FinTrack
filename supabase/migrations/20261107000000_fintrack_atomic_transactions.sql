-- FinTrack forward migration: atomic BUY/SELL ledger and currency snapshots.
-- Historical transaction currency is left NULL when it cannot be proven from
-- the original row; future entries snapshot the linked holding's currency.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS currency TEXT;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_currency_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_currency_check
  CHECK (currency IS NULL OR currency IN ('USD', 'INR'));

-- A fully sold position remains as a zero-quantity holding so its identity can
-- continue to be referenced by the retained transaction ledger.
ALTER TABLE public.investments
  DROP CONSTRAINT IF EXISTS investments_quantity_check;

ALTER TABLE public.investments
  DROP CONSTRAINT IF EXISTS investments_quantity_nonnegative;

ALTER TABLE public.investments
  ADD CONSTRAINT investments_quantity_nonnegative
  CHECK (quantity >= 0);

CREATE OR REPLACE FUNCTION public.enforce_ledger_managed_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.quantity IS DISTINCT FROM OLD.quantity
      OR NEW.purchase_price IS DISTINCT FROM OLD.purchase_price)
    AND current_setting('fintrack.record_transaction', true) IS DISTINCT FROM 'active'
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
  v_user_id UUID := auth.uid();
  v_investment public.investments%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
  v_new_quantity NUMERIC;
  v_new_purchase_price NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active authenticated user is required.'
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

  -- Serialize all trades against this holding, then evaluate the latest quantity.
  SELECT *
  INTO v_investment
  FROM public.investments
  WHERE id = p_investment_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investment not found or access denied.'
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

  PERFORM set_config('fintrack.record_transaction', 'active', true);

  UPDATE public.investments
  SET quantity = v_new_quantity,
      purchase_price = v_new_purchase_price
  WHERE id = v_investment.id
    AND user_id = v_user_id;

  PERFORM set_config('fintrack.record_transaction', '', true);

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
    currency
  )
  VALUES (
    v_user_id,
    v_investment.id,
    v_investment.symbol,
    v_investment.asset_name,
    p_transaction_type,
    p_quantity,
    p_price,
    v_total_amount,
    p_transaction_date,
    p_notes,
    v_investment.currency
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.record_transaction(UUID, TEXT, NUMERIC, NUMERIC, DATE, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_transaction(UUID, TEXT, NUMERIC, NUMERIC, DATE, TEXT)
  TO authenticated;

-- All application writes must go through the atomic function. Authenticated
-- ledger reads remain available; updates and deletes remain unavailable.
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.transactions TO authenticated;