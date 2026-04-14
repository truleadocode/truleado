-- Scope email OTPs by portal (creator vs client) so simultaneous pending OTPs
-- for the same email across portals don't clobber each other.
ALTER TABLE email_otps
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'creator';

ALTER TABLE email_otps
  ADD CONSTRAINT email_otps_purpose_check CHECK (purpose IN ('creator', 'client'));

DROP INDEX IF EXISTS email_otps_email_idx;
CREATE INDEX email_otps_email_purpose_idx ON email_otps(email, purpose);
