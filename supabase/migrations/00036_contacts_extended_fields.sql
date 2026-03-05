-- Add extended fields to contacts table for comprehensive contact profiles
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS preferred_channel TEXT,
  ADD COLUMN IF NOT EXISTS contact_type TEXT,
  ADD COLUMN IF NOT EXISTS contact_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notification_preference TEXT,
  ADD COLUMN IF NOT EXISTS birthday TEXT;
