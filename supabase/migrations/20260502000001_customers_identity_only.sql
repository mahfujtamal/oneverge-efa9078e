-- customers becomes identity-only.
-- All service/billing/location data is owned exclusively by customer_connections.
-- Run AFTER redeploying register-customer, login, and finalize-payment edge functions.
-- Data is safe: customer_connections already holds all of this from registration.

ALTER TABLE public.customers
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS area_id,
  DROP COLUMN IF EXISTS isp_id,
  DROP COLUMN IF EXISTS broadband_plan_id,
  DROP COLUMN IF EXISTS scheduled_broadband_plan_id,
  DROP COLUMN IF EXISTS speed,
  DROP COLUMN IF EXISTS account_status,
  DROP COLUMN IF EXISTS balance,
  DROP COLUMN IF EXISTS active_services,
  DROP COLUMN IF EXISTS scheduled_services,
  DROP COLUMN IF EXISTS active_addon_plans,
  DROP COLUMN IF EXISTS scheduled_addon_plans;
