-- Versioned monthly plans for each add-on service.
-- Mirrors the broadband_plans table structure so the same renewal logic applies.
-- effective_from allows date-based pricing versions: the active plan for a given
-- billing date is the one with the highest effective_from <= that date.

CREATE TABLE IF NOT EXISTS public.addon_plans (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      TEXT         NOT NULL,        -- matches ALL_SERVICES[].id (e.g. 'ott', 'cloud_storage')
  name            TEXT         NOT NULL,
  base_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat             NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax             NUMERIC(10,2) NOT NULL DEFAULT 0,
  surplus_charge  NUMERIC(10,2) NOT NULL DEFAULT 0,
  price           NUMERIC(10,2) NOT NULL,       -- total = base + vat + tax + surplus
  effective_from  DATE         NOT NULL DEFAULT CURRENT_DATE,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addon_plans_service
  ON public.addon_plans (service_id, is_active, effective_from DESC);

-- Customers carry per-add-on plan selections as JSONB:
--   {"ott": "<plan_uuid>", "cloud_storage": "<plan_uuid>", ...}
-- active_addon_plans  = what is running this cycle
-- scheduled_addon_plans = what will run next cycle (set by the customer in BillingVault)

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS active_addon_plans    JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scheduled_addon_plans JSONB NOT NULL DEFAULT '{}';

-- RLS: customers can read addon_plans (public catalog).
ALTER TABLE public.addon_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addon_plans_read_all"
  ON public.addon_plans FOR SELECT
  USING (true);
