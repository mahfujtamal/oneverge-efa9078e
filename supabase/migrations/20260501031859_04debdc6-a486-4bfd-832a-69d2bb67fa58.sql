UPDATE public.customers c
SET account_status = 'active', updated_at = now()
WHERE c.account_status IN ('feasibility done', 'account created', 'kyc done')
  AND EXISTS (
    SELECT 1 FROM public.customer_connections cc
    WHERE cc.customer_id = c.id
      AND cc.account_status = 'active'
  );