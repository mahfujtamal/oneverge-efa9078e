-- Add ISP and broadband plan references to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS isp_id uuid NULL,
  ADD COLUMN IF NOT EXISTS broadband_plan_id uuid NULL;

-- Foreign keys (SET NULL on delete to preserve customer rows)
ALTER TABLE public.customers
  ADD CONSTRAINT customers_isp_id_fkey
  FOREIGN KEY (isp_id) REFERENCES public.isps(id) ON DELETE SET NULL;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_broadband_plan_id_fkey
  FOREIGN KEY (broadband_plan_id) REFERENCES public.broadband_plans(id) ON DELETE SET NULL;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_isp_id ON public.customers(isp_id);
CREATE INDEX IF NOT EXISTS idx_customers_broadband_plan_id ON public.customers(broadband_plan_id);