## Goal
Reset `broadband_plans` and seed a uniform pricing matrix: 4 tiers per ISP across all 8 ISPs (32 rows total). All ISPs share identical pricing.

## Pricing matrix
| Tier | Speed | Base | VAT | Tax | Surplus | Price (total) |
|---|---|---|---|---|---|---|
| basic | 5 Mbps | 450 | 50 | 0 | 0 | 500 |
| standard | 15 Mbps | 750 | 50 | 0 | 0 | 800 |
| premium | 30 Mbps | 900 | 100 | 0 | 0 | 1000 |
| ultra | 50 Mbps | 1050 | 150 | 0 | 0 | 1200 |

## Steps
1. `TRUNCATE public.broadband_plans` (data-only operation, run via insert tool).
2. Insert 4 plans for each ISP using `CROSS JOIN` against `isps` so `isp_id` is filled correctly for all 8 ISPs (ISP01–ISP08), no hardcoded UUIDs.
3. Set `name` as `"<Speed> Plan"`, `tier` as basic/standard/premium/ultra, `is_active = true`, `effective_from = now()`.

## SQL (executed via insert tool)
```sql
TRUNCATE TABLE public.broadband_plans;

INSERT INTO public.broadband_plans
  (isp_id, name, tier, speed, base_price, vat, tax, surplus_charge, price, is_active, effective_from)
SELECT i.id, t.name, t.tier, t.speed, t.base_price, t.vat, 0, 0,
       t.base_price + t.vat, true, now()
FROM public.isps i
CROSS JOIN (VALUES
  ('Basic 5 Mbps',    'basic',    '5 Mbps',  450, 50),
  ('Standard 15 Mbps','standard', '15 Mbps', 750, 50),
  ('Premium 30 Mbps', 'premium',  '30 Mbps', 900, 100),
  ('Ultra 50 Mbps',   'ultra',    '50 Mbps', 1050, 150)
) AS t(name, tier, speed, base_price, vat);
```

## Verification
After insert, run `SELECT isp_id, COUNT(*) FROM broadband_plans GROUP BY isp_id` — expect 8 rows, each count = 4.

## Notes
- No schema change, so no migration needed — uses the data-insert tool.
- Existing references in `customer_connections.broadband_plan_id` will be invalidated by truncate. Confirm acceptable (this appears to be a dev seed reset).
