-- Allow customers to schedule a broadband plan change for their next billing cycle.
-- NULL means "stay on current plan"; a non-null value tells the renewal cron
-- to switch to this plan at the start of the next cycle.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS scheduled_broadband_plan_id UUID
    REFERENCES public.broadband_plans(id) ON DELETE SET NULL;
