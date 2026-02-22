
-- Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- User Profiles
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text DEFAULT 'admin',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

-- Security definer function to get org_id for current user
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
$$;

-- Org members can manage their org
CREATE POLICY "Org members can manage own org" ON public.organizations
  FOR ALL USING (id = public.get_user_org_id());

-- Allow inserting orgs during signup (no org yet)
CREATE POLICY "Authenticated users can create orgs" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (true);

-- Clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  contact_email text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped clients" ON public.clients
  FOR ALL USING (organization_id = public.get_user_org_id());

-- Client Rate Tables
CREATE TABLE public.client_rate_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  storage_rate_per_pallet_per_day decimal(10,4),
  storage_rate_per_sku_per_day decimal(10,4),
  receiving_rate_per_pallet decimal(10,4),
  receiving_rate_per_unit decimal(10,4),
  pick_fee_per_unit decimal(10,4),
  pack_fee_per_order decimal(10,4),
  kitting_fee decimal(10,4),
  special_handling_fee decimal(10,4),
  effective_from timestamp with time zone NOT NULL,
  effective_to timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.client_rate_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped rate tables" ON public.client_rate_tables
  FOR ALL USING (organization_id = public.get_user_org_id());

-- Source Files
CREATE TABLE public.source_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  client_id uuid REFERENCES public.clients(id),
  file_type text CHECK (file_type IN ('inventory', 'order', 'receiving', 'client_rates')),
  original_filename text,
  storage_path text,
  status text DEFAULT 'uploaded',
  error_message text,
  column_mapping jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.source_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped source files" ON public.source_files
  FOR ALL USING (organization_id = public.get_user_org_id());

-- Inventory Snapshots
CREATE TABLE public.inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  sku text,
  quantity integer,
  pallet_count integer,
  storage_start_date timestamp with time zone,
  storage_end_date timestamp with time zone,
  warehouse_location text,
  source_file_id uuid REFERENCES public.source_files(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped inventory" ON public.inventory_snapshots
  FOR ALL USING (organization_id = public.get_user_org_id());

-- Order Activities
CREATE TABLE public.order_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  order_id text,
  sku text,
  quantity integer,
  order_date timestamp with time zone,
  handling_type text,
  units_processed integer,
  source_file_id uuid REFERENCES public.source_files(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.order_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped orders" ON public.order_activities
  FOR ALL USING (organization_id = public.get_user_org_id());

-- Receiving Logs
CREATE TABLE public.receiving_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  pallet_count integer,
  units_received integer,
  receiving_date timestamp with time zone,
  receiving_type text,
  source_file_id uuid REFERENCES public.source_files(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.receiving_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped receiving" ON public.receiving_logs
  FOR ALL USING (organization_id = public.get_user_org_id());

-- Billing Runs
CREATE TABLE public.billing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  run_date timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending',
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  total_expected_revenue decimal(12,2),
  total_missing_revenue decimal(12,2),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.billing_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped billing runs" ON public.billing_runs
  FOR ALL USING (organization_id = public.get_user_org_id());

-- Calculated Charges
CREATE TABLE public.calculated_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  billing_run_id uuid REFERENCES public.billing_runs(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  charge_type text,
  reference_id uuid,
  description text,
  quantity decimal(10,2),
  unit_rate decimal(10,4),
  expected_charge decimal(12,2),
  billed_charge decimal(12,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.calculated_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped charges" ON public.calculated_charges
  FOR ALL USING (organization_id = public.get_user_org_id());

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  billing_run_id uuid REFERENCES public.billing_runs(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  invoice_number text UNIQUE NOT NULL,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  subtotal decimal(12,2),
  tax_amount decimal(12,2) DEFAULT 0,
  total_amount decimal(12,2),
  status text DEFAULT 'draft',
  pdf_storage_path text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped invoices" ON public.invoices
  FOR ALL USING (organization_id = public.get_user_org_id());

-- Invoice Line Items
CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  invoice_id uuid REFERENCES public.invoices(id),
  charge_type text,
  description text,
  quantity decimal(10,2),
  unit_rate decimal(10,4),
  line_total decimal(12,2),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped line items" ON public.invoice_line_items
  FOR ALL USING (organization_id = public.get_user_org_id());
