-- =============================================================================
-- Deliverable Tracking (Immutable URLs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS deliverable_tracking_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  deliverable_name TEXT NOT NULL,
  started_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deliverable_id)
);

CREATE TABLE IF NOT EXISTS deliverable_tracking_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_record_id UUID NOT NULL REFERENCES deliverable_tracking_records(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tracking_record_id, display_order)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deliverable_tracking_records_deliverable_id
  ON deliverable_tracking_records(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_tracking_records_campaign_id
  ON deliverable_tracking_records(campaign_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_tracking_urls_tracking_record_id
  ON deliverable_tracking_urls(tracking_record_id);

ALTER TABLE deliverable_tracking_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_tracking_urls ENABLE ROW LEVEL SECURITY;

-- Users can view tracking records for deliverables in their agency
CREATE POLICY deliverable_tracking_records_select ON deliverable_tracking_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = deliverable_tracking_records.client_id
        AND public.belongs_to_agency(c.agency_id)
    )
  );

-- Authenticated agency users can insert tracking records
CREATE POLICY deliverable_tracking_records_insert ON deliverable_tracking_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = deliverable_tracking_records.client_id
        AND public.has_agency_role(c.agency_id, ARRAY['agency_admin', 'account_manager', 'operator', 'internal_approver'])
    )
  );

-- Users can view tracking URLs for deliverables in their agency
CREATE POLICY deliverable_tracking_urls_select ON deliverable_tracking_urls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM deliverable_tracking_records dtr
      JOIN clients c ON c.id = dtr.client_id
      WHERE dtr.id = deliverable_tracking_urls.tracking_record_id
        AND public.belongs_to_agency(c.agency_id)
    )
  );

-- Authenticated agency users can insert tracking URLs
CREATE POLICY deliverable_tracking_urls_insert ON deliverable_tracking_urls
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM deliverable_tracking_records dtr
      JOIN clients c ON c.id = dtr.client_id
      WHERE dtr.id = deliverable_tracking_urls.tracking_record_id
        AND public.has_agency_role(c.agency_id, ARRAY['agency_admin', 'account_manager', 'operator', 'internal_approver'])
    )
  );
