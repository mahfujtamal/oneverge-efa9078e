-- RPC used by src/shared/lib/sessionValidator.ts to validate customer sessions server-side.
-- Returns FALSE if the customer does not exist or their account is disabled/blacklisted.
-- Returns TRUE for all other statuses (active, expired, pending_kyc, etc.) so normal
-- users are not accidentally locked out by transient states.

CREATE OR REPLACE FUNCTION public.verify_customer_session(customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT account_status
  INTO v_status
  FROM public.customers
  WHERE id = customer_id;

  -- Customer not found
  IF v_status IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Explicitly revoked accounts
  IF v_status IN ('blacklisted', 'disabled', 'banned') THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Allow the anon/authenticated roles to call this function
GRANT EXECUTE ON FUNCTION public.verify_customer_session(UUID) TO anon, authenticated;
