-- Make price a generated column in addon_plans, consistent with the addons table.
ALTER TABLE public.addon_plans
  DROP COLUMN price,
  ADD COLUMN price NUMERIC(10,2) GENERATED ALWAYS AS (base_price + vat + tax + surplus_charge) STORED;
