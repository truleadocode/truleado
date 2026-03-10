-- Team invitations table
CREATE TABLE IF NOT EXISTS agency_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('agency_admin', 'account_manager', 'operator', 'internal_approver')),
  invited_by UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

-- Index for token lookup (used during signup acceptance)
CREATE INDEX IF NOT EXISTS idx_agency_invitations_token ON agency_invitations(token);
-- Index for listing pending invitations per agency
CREATE INDEX IF NOT EXISTS idx_agency_invitations_agency_status ON agency_invitations(agency_id, status);
-- Prevent duplicate pending invitations for same email+agency
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_invitations_unique_pending
  ON agency_invitations(agency_id, email) WHERE status = 'pending';
