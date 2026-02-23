
-- QuickBooks Online connection per organization
CREATE TABLE public.quickbooks_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id text,
  company_name text,
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  status text DEFAULT 'connected',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (organization_id)
);

ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped qb connections" ON public.quickbooks_connections
  FOR ALL USING (organization_id = public.get_user_org_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quickbooks_connections TO authenticated;

-- QuickBooks customer mapping
CREATE TABLE public.quickbooks_customer_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  qb_customer_id text NOT NULL,
  qb_customer_name text,
  mapped_at timestamp with time zone DEFAULT now(),
  UNIQUE (organization_id, client_id)
);

ALTER TABLE public.quickbooks_customer_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped qb customer map" ON public.quickbooks_customer_map
  FOR ALL USING (organization_id = public.get_user_org_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quickbooks_customer_map TO authenticated;

-- Invoice sync tracking columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS qb_invoice_id text,
  ADD COLUMN IF NOT EXISTS qb_invoice_number text,
  ADD COLUMN IF NOT EXISTS qb_synced_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS qb_sync_status text DEFAULT 'pending';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_qb_sync_status ON public.invoices (organization_id, qb_sync_status);
CREATE INDEX IF NOT EXISTS idx_qb_connections_org ON public.quickbooks_connections (organization_id);
