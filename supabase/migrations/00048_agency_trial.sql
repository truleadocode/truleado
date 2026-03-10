-- Add trial/subscription tracking columns to agencies
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT
    CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled'))
    DEFAULT 'trial';

-- Backfill existing agencies with 30-day trial from their creation date
UPDATE agencies
SET trial_start_date = created_at,
    trial_end_date = created_at + INTERVAL '30 days',
    trial_days = 30,
    subscription_status = 'trial'
WHERE trial_start_date IS NULL;
