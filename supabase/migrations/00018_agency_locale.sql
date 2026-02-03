-- Add locale settings for agencies
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'en';

COMMENT ON COLUMN agencies.currency_code IS 'ISO 4217 currency code (e.g., USD).';
COMMENT ON COLUMN agencies.timezone IS 'IANA timezone name (e.g., America/New_York).';
COMMENT ON COLUMN agencies.language_code IS 'BCP-47 language tag (e.g., en, en-US).';
