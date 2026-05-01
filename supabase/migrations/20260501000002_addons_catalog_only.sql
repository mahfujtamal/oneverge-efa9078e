-- addons becomes a pure service catalog (id + name only).
-- All pricing moves to addon_plans, which now has a FK to addons.id.

-- 1. Drop pricing from addons (generated column first, then its dependencies)
ALTER TABLE public.addons DROP COLUMN IF EXISTS price;
ALTER TABLE public.addons DROP COLUMN IF EXISTS base_price;
ALTER TABLE public.addons DROP COLUMN IF EXISTS vat;
ALTER TABLE public.addons DROP COLUMN IF EXISTS tax;
ALTER TABLE public.addons DROP COLUMN IF EXISTS surplus_charge;

-- 2. Rename service_id → addon_id in addon_plans
ALTER TABLE public.addon_plans RENAME COLUMN service_id TO addon_id;

-- 3. Rebuild index on the renamed column
DROP INDEX IF EXISTS idx_addon_plans_service;
CREATE INDEX IF NOT EXISTS idx_addon_plans_addon
  ON public.addon_plans (addon_id, is_active, effective_from DESC);

-- 4. Foreign key: addon_plans.addon_id → addons.id
ALTER TABLE public.addon_plans
  ADD CONSTRAINT fk_addon_plans_addon
  FOREIGN KEY (addon_id) REFERENCES public.addons(id);
