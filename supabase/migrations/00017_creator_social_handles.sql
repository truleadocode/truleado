-- Add Facebook and LinkedIn handles to creators
-- Required for creator profile editing and future social tabs

ALTER TABLE creators ADD COLUMN IF NOT EXISTS facebook_handle TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS linkedin_handle TEXT;
