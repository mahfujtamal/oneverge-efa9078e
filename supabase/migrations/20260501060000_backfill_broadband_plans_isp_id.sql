-- Backfill broadband_plans.isp_id so direct ISP-based queries work.
--
-- Priority 1: use isp_area_plans (canonical pivot — authoritative for any plan
--             that was registered through the ISP plan catalogue).
-- Priority 2: derive from customer_connections (covers plans assigned directly
--             to customers without a matching isp_area_plans row).

-- Pass 1: isp_area_plans → broadband_plans
UPDATE public.broadband_plans bp
SET isp_id = iap.isp_id
FROM public.isp_area_plans iap
WHERE iap.plan_id = bp.id
  AND bp.isp_id IS NULL;

-- Pass 2: customer_connections → broadband_plans (for any remaining nulls)
UPDATE public.broadband_plans bp
SET isp_id = cc.isp_id
FROM public.customer_connections cc
WHERE cc.broadband_plan_id = bp.id
  AND bp.isp_id IS NULL
  AND cc.isp_id IS NOT NULL;
