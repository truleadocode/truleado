-- =============================================================================
-- Phase 3: Client & Contacts (CRM Foundation)
-- - contacts table: belongs to Client; first_name, last_name, email, mobile,
--   address, department, notes, is_client_approver
-- - Optional user_id: link contact to Truleado user when they have an account
-- =============================================================================

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  mobile TEXT,
  address TEXT,
  department TEXT,
  notes TEXT,
  is_client_approver BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, email)
);

CREATE INDEX idx_contacts_client_id ON contacts(client_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_is_client_approver ON contacts(client_id, is_client_approver) WHERE is_client_approver = true;
CREATE INDEX idx_contacts_user_id ON contacts(user_id) WHERE user_id IS NOT NULL;

COMMENT ON TABLE contacts IS 'People at a client (CRM). is_client_approver: can approve deliverables at client stage. user_id: link to Truleado user when they have an account.';

-- RLS: agency-scoped via client
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Select: users who belong to the agency that owns the client
CREATE POLICY contacts_select ON contacts
  FOR SELECT
  USING (
    public.belongs_to_agency(
      (SELECT c.agency_id FROM clients c WHERE c.id = contacts.client_id)
    )
  );

-- Insert: agency admin or account manager of the client
CREATE POLICY contacts_insert ON contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = contacts.client_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

-- Update: same as insert
CREATE POLICY contacts_update ON contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = contacts.client_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

-- Delete: same as insert
CREATE POLICY contacts_delete ON contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = contacts.client_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );
