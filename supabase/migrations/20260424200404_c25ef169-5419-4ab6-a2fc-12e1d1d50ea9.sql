-- Drop dead RLS policies that reference get_partner_id() before dropping the function
DROP POLICY IF EXISTS "ISPs read assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "ISPs read assigned ticket messages" ON public.ticket_messages;

-- Drop unused tables
DROP TABLE IF EXISTS public.staff_users CASCADE;
DROP TABLE IF EXISTS public.network_telemetry CASCADE;
DROP TABLE IF EXISTS public.revenue_allocations CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;

-- Drop the now-orphaned partner helper function
DROP FUNCTION IF EXISTS public.get_partner_id(uuid) CASCADE;