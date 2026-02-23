-- Returns tracking on order_activities
ALTER TABLE order_activities ADD COLUMN IF NOT EXISTS is_return boolean DEFAULT false;
ALTER TABLE order_activities ADD COLUMN IF NOT EXISTS return_reason text;
ALTER TABLE order_activities ADD COLUMN IF NOT EXISTS return_disposition text;

-- Monthly minimums on client_rate_tables
ALTER TABLE client_rate_tables ADD COLUMN IF NOT EXISTS monthly_minimum_fee numeric(10,2) DEFAULT 0;
ALTER TABLE client_rate_tables ADD COLUMN IF NOT EXISTS minimum_applies_to text DEFAULT 'total';

-- Returns rate on client_rate_tables
ALTER TABLE client_rate_tables ADD COLUMN IF NOT EXISTS returns_processing_fee_per_unit numeric(10,4) DEFAULT 0;
ALTER TABLE client_rate_tables ADD COLUMN IF NOT EXISTS returns_restocking_fee_pct numeric(5,2) DEFAULT 0;

-- Revenue Alerts
CREATE TABLE IF NOT EXISTS revenue_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  billing_run_id uuid REFERENCES billing_runs(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  description text,
  leak_amount numeric(12,2) DEFAULT 0,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE revenue_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revenue_alerts_org_access" ON revenue_alerts FOR ALL USING (
  organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
);

-- Client Health Scores
CREATE TABLE IF NOT EXISTS client_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  billing_run_id uuid REFERENCES billing_runs(id) ON DELETE CASCADE,
  leak_risk_score numeric(5,2) DEFAULT 0,
  total_expected numeric(12,2) DEFAULT 0,
  total_recovered numeric(12,2) DEFAULT 0,
  alert_count integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (organization_id, client_id, billing_run_id)
);
ALTER TABLE client_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_health_scores_org_access" ON client_health_scores FOR ALL USING (
  organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
);

-- Client Portal Links
CREATE TABLE IF NOT EXISTS client_portal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (organization_id, client_id)
);
ALTER TABLE client_portal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_links_org_access" ON client_portal_links FOR ALL USING (
  organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
);
CREATE POLICY "portal_links_public_token_read" ON client_portal_links FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_revenue_alerts_org ON revenue_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_revenue_alerts_unresolved ON revenue_alerts(organization_id, is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_client_health_scores_org ON client_health_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_links_token ON client_portal_links(token);