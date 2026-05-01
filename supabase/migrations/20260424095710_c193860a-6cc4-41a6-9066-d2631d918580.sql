
-- 1. Global default installation fees (versioned)
CREATE TABLE IF NOT EXISTS public.default_installation_fees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_fee numeric NOT NULL,
  vat_amount numeric NULL DEFAULT 0,
  tax_amount numeric NULL DEFAULT 0,
  surcharge_amount numeric NULL DEFAULT 0,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now()
);

ALTER TABLE public.default_installation_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read default installation fees"
  ON public.default_installation_fees
  FOR SELECT
  USING (true);

CREATE POLICY "Admins manage default installation fees"
  ON public.default_installation_fees
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Per-ISP installation fee overrides (versioned)
CREATE TABLE IF NOT EXISTS public.isp_installation_fees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  isp_id uuid NOT NULL,
  base_fee numeric NOT NULL,
  vat_amount numeric NULL DEFAULT 0,
  tax_amount numeric NULL DEFAULT 0,
  surcharge_amount numeric NULL DEFAULT 0,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT isp_installation_fees_isp_id_fkey
    FOREIGN KEY (isp_id) REFERENCES public.isps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_isp_installation_fees_isp
  ON public.isp_installation_fees (isp_id, start_date DESC);

ALTER TABLE public.isp_installation_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read isp installation fees"
  ON public.isp_installation_fees
  FOR SELECT
  USING (true);

CREATE POLICY "Admins manage isp installation fees"
  ON public.isp_installation_fees
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Resolver function: per-ISP override, falling back to global default
CREATE OR REPLACE FUNCTION public.calculate_detailed_installation_fee(p_isp_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_record record;
  v_default record;
  v_total numeric;
BEGIN
  -- A. ISP-specific exception
  IF p_isp_id IS NOT NULL THEN
    SELECT * INTO v_record
    FROM public.isp_installation_fees
    WHERE isp_id = p_isp_id
      AND start_date <= now()
      AND (end_date IS NULL OR end_date >= now())
    ORDER BY start_date DESC
    LIMIT 1;
  END IF;

  -- B. Global default fallback
  IF v_record IS NULL THEN
    SELECT * INTO v_default
    FROM public.default_installation_fees
    WHERE start_date <= now()
      AND (end_date IS NULL OR end_date >= now())
    ORDER BY start_date DESC
    LIMIT 1;

    IF v_default IS NULL THEN
      RETURN json_build_object(
        'base_fee', 0,
        'vat_amount', 0,
        'tax_amount', 0,
        'surcharge_amount', 0,
        'total_fee', 0,
        'valid_from', NULL,
        'valid_until', NULL,
        'is_fallback', true,
        'is_missing', true
      );
    END IF;

    v_total := COALESCE(v_default.base_fee,0) + COALESCE(v_default.vat_amount,0)
             + COALESCE(v_default.tax_amount,0) + COALESCE(v_default.surcharge_amount,0);

    RETURN json_build_object(
      'base_fee', v_default.base_fee,
      'vat_amount', v_default.vat_amount,
      'tax_amount', v_default.tax_amount,
      'surcharge_amount', v_default.surcharge_amount,
      'total_fee', v_total,
      'valid_from', v_default.start_date,
      'valid_until', v_default.end_date,
      'is_fallback', true,
      'is_missing', false
    );
  END IF;

  v_total := COALESCE(v_record.base_fee,0) + COALESCE(v_record.vat_amount,0)
           + COALESCE(v_record.tax_amount,0) + COALESCE(v_record.surcharge_amount,0);

  RETURN json_build_object(
    'base_fee', v_record.base_fee,
    'vat_amount', v_record.vat_amount,
    'tax_amount', v_record.tax_amount,
    'surcharge_amount', v_record.surcharge_amount,
    'total_fee', v_total,
    'valid_from', v_record.start_date,
    'valid_until', v_record.end_date,
    'is_fallback', false,
    'is_missing', false
  );
END;
$function$;

-- 4. Seed an initial global default (only if none exists)
INSERT INTO public.default_installation_fees (base_fee, vat_amount, tax_amount, surcharge_amount)
SELECT 850, 100, 30, 20
WHERE NOT EXISTS (SELECT 1 FROM public.default_installation_fees);
