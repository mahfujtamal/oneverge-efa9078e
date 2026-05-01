-- Ensure pgcrypto is installed in the extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate verify_customer_password with extensions in search_path
CREATE OR REPLACE FUNCTION public.verify_customer_password(_customer_id uuid, _password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  stored_hash text;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.customers
  WHERE id = _customer_id;

  IF stored_hash IS NULL OR stored_hash = '' THEN
    RETURN FALSE;
  END IF;

  RETURN stored_hash = extensions.crypt(_password, stored_hash);
END;
$function$;

-- Recreate set_customer_password with extensions in search_path
CREATE OR REPLACE FUNCTION public.set_customer_password(_customer_id uuid, _new_password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE public.customers
  SET password_hash = extensions.crypt(_new_password, extensions.gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = _customer_id;
END;
$function$;