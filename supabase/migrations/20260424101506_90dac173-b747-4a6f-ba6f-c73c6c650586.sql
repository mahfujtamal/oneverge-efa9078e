-- Billing history reader
CREATE OR REPLACE FUNCTION public.get_customer_billing_history(_customer_id uuid)
RETURNS TABLE (
  billing_period varchar,
  total_billed numeric,
  services_snapshot text[],
  status varchar,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT billing_period, total_billed, services_snapshot, status, created_at
  FROM public.billing_history
  WHERE customer_id = _customer_id
  ORDER BY created_at DESC
  LIMIT 100;
$$;

-- Payment history reader
CREATE OR REPLACE FUNCTION public.get_customer_payment_history(_customer_id uuid)
RETURNS TABLE (
  transaction_id varchar,
  amount numeric,
  payment_method varchar,
  payment_type varchar,
  status varchar,
  created_at timestamptz,
  metadata jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT transaction_id, amount, payment_method, payment_type, status, created_at, metadata
  FROM public.payments
  WHERE customer_id = _customer_id
  ORDER BY created_at DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_billing_history(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_payment_history(uuid) TO anon, authenticated;