-- Email OTP authentication table for creator portal
-- Replaces Firebase magic links with reliable 6-digit OTP flow
CREATE TABLE IF NOT EXISTS email_otps (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL,
  otp_hash      TEXT        NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_otps_email_idx ON email_otps(email);
CREATE INDEX email_otps_expires_at_idx ON email_otps(expires_at);

ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;
-- No RLS policies: table is accessed exclusively via service role key in API routes
