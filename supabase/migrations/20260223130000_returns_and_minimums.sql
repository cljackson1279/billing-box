-- Returns log table
CREATE TABLE IF NOT EXISTS public.returns_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  order_id text,
  units_returned integer NOT NULL DEFAULT 0,
  return_date date NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.returns_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped returns_log" ON public.returns_log
  FOR ALL USING (organization_id = public.get_user_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.returns_log TO authenticated;

CREATE INDEX IF NOT EXISTS idx_returns_log_org_client ON public.returns_log (organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_returns_log_date ON public.returns_log (return_date);

-- Add return fee and monthly minimum columns to client_rate_tables
ALTER TABLE public.client_rate_tables
  ADD COLUMN IF NOT EXISTS return_fee_per_unit decimal(10,4),
  ADD COLUMN IF NOT EXISTS return_fee_per_order decimal(10,4),
  ADD COLUMN IF NOT EXISTS monthly_minimum_fee decimal(10,2),
  ADD COLUMN IF NOT EXISTS freight_adjustment_fee decimal(10,2);

-- Revenue alerts table (used by Prompt #3 too)
CREATE TABLE IF NOT EXISTS public.revenue_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  alert_type text NOT NULL, -- 'unbilled_storage', 'unbilled_pick', 'monthly_minimum', 'returns_unbilled'
  leak_amount decimal(10,2) DEFAULT 0,
  description text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.revenue_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped revenue_alerts" ON public.revenue_alerts
  FOR ALL USING (organization_id = public.get_user_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_alerts TO authenticated;

CREATE INDEX IF NOT EXISTS idx_revenue_alerts_org ON public.revenue_alerts (organization_id, is_resolved);

-- Client health scores table (used by Prompt #3)
CREATE TABLE IF NOT EXISTS public.client_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  recovery_rate decimal(5,2) DEFAULT 0,
  leak_risk_score decimal(5,2) DEFAULT 0,
  last_billed_at timestamp with time zone,
  total_recovered decimal(12,2) DEFAULT 0,
  total_leaked decimal(12,2) DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (organization_id, client_id)
);

ALTER TABLE public.client_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped client_health_scores" ON public.client_health_scores
  FOR ALL USING (organization_id = public.get_user_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_health_scores TO authenticated;

-- Client portal links table (used by Prompt #4)
CREATE TABLE IF NOT EXISTS public.client_portal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (organization_id, client_id)
);

ALTER TABLE public.client_portal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped portal links" ON public.client_portal_links
  FOR ALL USING (organization_id = public.get_user_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_links TO authenticated;
