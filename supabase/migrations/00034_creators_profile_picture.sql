-- Add profile_picture_url column to creators table
-- Stores the external avatar/profile picture URL from discovery import

ALTER TABLE creators ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
