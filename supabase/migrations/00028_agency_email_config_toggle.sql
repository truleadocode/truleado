-- Add toggle for custom SMTP usage
-- When use_custom_smtp is false or NULL, the default Mailgun integration is used
-- When true, the agency's custom SMTP integration is used (with tenant conditions)

ALTER TABLE agency_email_config
ADD COLUMN use_custom_smtp BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN agency_email_config.use_custom_smtp IS
  'When true, use custom SMTP integration for this agency. When false, use default Mailgun.';
