
-- ============================================================
-- 0. ENUM & ROLE INFRASTRUCTURE
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'customer', 'partner');

-- User roles table (never store roles on profiles!)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer helper to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can manage roles; users can read their own
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 1. CUSTOMERS TABLE
-- ============================================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers read own record"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Customers update own record"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage customers"
  ON public.customers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. PARTNERS TABLE (ISPs, Add-on providers, etc.)
-- ============================================================

CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('isp', 'addon', 'tax')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners read own record"
  ON public.partners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage partners"
  ON public.partners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Helper: get partner ID from auth uid
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_partner_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.partners WHERE user_id = _user_id LIMIT 1
$$;

-- Helper: get customer ID from auth uid
CREATE OR REPLACE FUNCTION public.get_customer_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.customers WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================================
-- 3. TICKETS TABLE (ITSM Engine)
-- ============================================================

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  isp_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  ticket_type TEXT NOT NULL,
  service_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  queue TEXT NOT NULL CHECK (queue IN ('ISP', 'L1A_ADDON', 'L1A_INFRA')),
  priority TEXT NOT NULL CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  source_channel TEXT NOT NULL DEFAULT 'web',
  sla_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Customers read/update their own tickets
CREATE POLICY "Customers read own tickets"
  ON public.tickets FOR SELECT
  USING (customer_id = public.get_customer_id(auth.uid()));

CREATE POLICY "Customers update own tickets"
  ON public.tickets FOR UPDATE
  USING (customer_id = public.get_customer_id(auth.uid()));

CREATE POLICY "Customers create tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

-- ISP partners read tickets in ISP queue assigned to them
CREATE POLICY "ISPs read assigned tickets"
  ON public.tickets FOR SELECT
  USING (
    queue = 'ISP'
    AND isp_id = public.get_partner_id(auth.uid())
  );

-- Admins full access
CREATE POLICY "Admins manage tickets"
  ON public.tickets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. TICKET_MESSAGES TABLE (Chat Thread)
-- ============================================================

CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
  message_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Customers see messages on their own tickets
CREATE POLICY "Customers read own ticket messages"
  ON public.ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND t.customer_id = public.get_customer_id(auth.uid())
    )
  );

-- Customers can post messages on their own tickets
CREATE POLICY "Customers create messages on own tickets"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND t.customer_id = public.get_customer_id(auth.uid())
    )
  );

-- ISPs see messages on tickets assigned to them
CREATE POLICY "ISPs read assigned ticket messages"
  ON public.ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND t.queue = 'ISP'
        AND t.isp_id = public.get_partner_id(auth.uid())
    )
  );

-- Admins full access
CREATE POLICY "Admins manage ticket messages"
  ON public.ticket_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. REVENUE_ALLOCATIONS TABLE (B2B Settlement Engine)
-- ============================================================

CREATE TABLE public.revenue_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('isp', 'addon', 'tax')),
  amount NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  settled_status TEXT NOT NULL DEFAULT 'pending' CHECK (settled_status IN ('pending', 'settled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_allocations ENABLE ROW LEVEL SECURITY;

-- Strictly admin-only
CREATE POLICY "Admins manage revenue allocations"
  ON public.revenue_allocations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_tickets_customer ON public.tickets(customer_id);
CREATE INDEX idx_tickets_isp ON public.tickets(isp_id);
CREATE INDEX idx_tickets_queue ON public.tickets(queue);
CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX idx_revenue_customer ON public.revenue_allocations(customer_id);
CREATE INDEX idx_revenue_partner ON public.revenue_allocations(partner_id);

-- ============================================================
-- 7. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
