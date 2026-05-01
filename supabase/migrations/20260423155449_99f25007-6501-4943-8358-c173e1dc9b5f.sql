-- Ensure pgcrypto is available (provides crypt() + gen_salt('bf'))
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 1. Add password_hash column
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS password_hash text;

-- 2. Backfill: hash any existing plaintext passwords with bcrypt
UPDATE public.customers
SET password_hash = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL
  AND password <> ''
  AND password_hash IS NULL;

-- 3. Wipe plaintext passwords (we no longer keep them)
UPDATE public.customers
SET password = NULL
WHERE password_hash IS NOT NULL;

-- 4. Verification function (security definer, restricted to service_role)
CREATE OR REPLACE FUNCTION public.verify_customer_password(
  _customer_id uuid,
  _password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.customers
  WHERE id = _customer_id;

  IF stored_hash IS NULL OR stored_hash = '' THEN
    RETURN FALSE;
  END IF;

  RETURN stored_hash = crypt(_password, stored_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_customer_password(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_customer_password(uuid, text) TO service_role;

-- 5. Setter function (security definer, restricted to service_role)
CREATE OR REPLACE FUNCTION public.set_customer_password(
  _customer_id uuid,
  _new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers
  SET password_hash = crypt(_new_password, gen_salt('bf', 10)),
      password = NULL,
      updated_at = now()
  WHERE id = _customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_customer_password(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_customer_password(uuid, text) TO service_role;