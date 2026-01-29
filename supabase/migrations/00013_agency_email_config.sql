-- Agency email (SMTP) configuration for notifications.
-- When present, we create/update a Novu Custom SMTP integration and store its identifier.
CREATE TABLE agency_email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_secure BOOLEAN NOT NULL DEFAULT false,
  smtp_username TEXT,
  smtp_password TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  novu_integration_identifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id)
);

CREATE INDEX idx_agency_email_config_agency_id ON agency_email_config(agency_id);

ALTER TABLE agency_email_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY agency_email_config_select ON agency_email_config
  FOR SELECT USING (
    public.belongs_to_agency(agency_id)
  );

CREATE POLICY agency_email_config_insert ON agency_email_config
  FOR INSERT WITH CHECK (
    public.is_agency_admin(agency_id)
  );

CREATE POLICY agency_email_config_update ON agency_email_config
  FOR UPDATE USING (
    public.is_agency_admin(agency_id)
  );

CREATE POLICY agency_email_config_delete ON agency_email_config
  FOR DELETE USING (
    public.is_agency_admin(agency_id)
  );
