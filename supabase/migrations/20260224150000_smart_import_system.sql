-- Smart Import System: billing_adjustments table + returns support
-- Migration: 20260224150000_smart_import_system

-- ─── billing_adjustments table ────────────────────────────────────────────
-- Stores credit/debit adjustments uploaded via the Smart Import system

CREATE TABLE IF NOT EXISTS billing_adjustments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id         uuid REFERENCES clients(id) ON DELETE SET NULL,
  source_file_id    uuid REFERENCES source_files(id) ON DELETE SET NULL,
  adjustment_amount numeric(10, 2) NOT NULL DEFAULT 0,
  adjustment_date   date,
  adjustment_notes  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE billing_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_adjustments_org_access" ON billing_adjustments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Index for fast org lookups
CREATE INDEX IF NOT EXISTS idx_billing_adjustments_org ON billing_adjustments(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_adjustments_client ON billing_adjustments(client_id);

-- ─── Returns support on order_activities ──────────────────────────────────
-- Add is_return flag and return-specific columns if not already present

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_activities' AND column_name = 'is_return'
  ) THEN
    ALTER TABLE order_activities ADD COLUMN is_return boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_activities' AND column_name = 'return_reason'
  ) THEN
    ALTER TABLE order_activities ADD COLUMN return_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_activities' AND column_name = 'disposition'
  ) THEN
    ALTER TABLE order_activities ADD COLUMN disposition text;
  END IF;
END $$;

-- Index for returns queries
CREATE INDEX IF NOT EXISTS idx_order_activities_is_return ON order_activities(organization_id, is_return)
  WHERE is_return = true;

-- ─── Updated_at trigger for billing_adjustments ───────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_billing_adjustments_updated_at ON billing_adjustments;
CREATE TRIGGER set_billing_adjustments_updated_at
  BEFORE UPDATE ON billing_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
