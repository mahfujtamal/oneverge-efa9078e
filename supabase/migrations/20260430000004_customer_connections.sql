-- Per-customer broadband connections.
-- Each row is one active (or pending) broadband subscription.
-- A customer may hold connections across multiple ISPs / areas simultaneously.

CREATE TABLE IF NOT EXISTS public.customer_connections (
  id                         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id                UUID          NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  connection_label           TEXT          NOT NULL DEFAULT 'Primary',
  isp_id                     UUID          REFERENCES public.isps(id) ON DELETE SET NULL,
  area_id                    UUID          REFERENCES public.areas(id) ON DELETE SET NULL,
  broadband_plan_id          UUID          REFERENCES public.broadband_plans(id) ON DELETE SET NULL,
  scheduled_broadband_plan_id UUID         REFERENCES public.broadband_plans(id) ON DELETE SET NULL,
  speed                      TEXT,
  address                    TEXT,
  account_status             TEXT          NOT NULL DEFAULT 'account created',
  balance                    NUMERIC(12,2) NOT NULL DEFAULT 0,
  active_services            TEXT[]        NOT NULL DEFAULT '{}',
  scheduled_services         TEXT[]        NOT NULL DEFAULT '{}',
  active_addon_plans         JSONB         NOT NULL DEFAULT '{}',
  scheduled_addon_plans      JSONB         NOT NULL DEFAULT '{}',
  is_primary                 BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_connections_customer
  ON public.customer_connections (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_connections_isp
  ON public.customer_connections (isp_id);
CREATE INDEX IF NOT EXISTS idx_customer_connections_status
  ON public.customer_connections (account_status);

-- Migrate existing customer connection data — one row per existing customer.
-- is_primary = TRUE marks these as the original "first" connections.
INSERT INTO public.customer_connections (
  customer_id, connection_label,
  isp_id, area_id, broadband_plan_id, scheduled_broadband_plan_id,
  speed, address, account_status, balance,
  active_services, scheduled_services,
  active_addon_plans, scheduled_addon_plans,
  is_primary, created_at
)
SELECT
  id,
  'Primary',
  isp_id,
  area_id,
  broadband_plan_id,
  scheduled_broadband_plan_id,
  COALESCE(speed, '50 Mbps'),
  address,
  COALESCE(account_status, 'account created'),
  COALESCE(balance, 0)::NUMERIC(12,2),
  COALESCE(active_services, '{}'),
  COALESCE(scheduled_services, '{}'),
  COALESCE(active_addon_plans, '{}'),
  COALESCE(scheduled_addon_plans, '{}'),
  TRUE,
  created_at
FROM public.customers
WHERE id IS NOT NULL;

-- Add connection_id to billing_history so history is scoped per connection.
ALTER TABLE public.billing_history
  ADD COLUMN IF NOT EXISTS connection_id UUID
    REFERENCES public.customer_connections(id) ON DELETE SET NULL;

-- RLS: public read (browser can load a customer's own connections).
-- All writes are handled by service-role edge functions.
ALTER TABLE public.customer_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connections_read_all"
  ON public.customer_connections FOR SELECT
  USING (true);
