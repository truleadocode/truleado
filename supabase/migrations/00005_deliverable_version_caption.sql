-- Migration: Add caption to deliverable_versions for optional copy/caption
-- Date: 2026-01-28

ALTER TABLE deliverable_versions
  ADD COLUMN IF NOT EXISTS caption TEXT;

