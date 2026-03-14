-- Add tag column for user-defined logical grouping of deliverable versions
-- Tags replace filename-based versioning: versions with the same tag are grouped together
-- regardless of the actual filename of the uploaded file.

-- Add tag column (nullable first so we can backfill)
ALTER TABLE deliverable_versions ADD COLUMN IF NOT EXISTS tag TEXT;

-- Backfill: use existing file_name as the tag (preserves existing version grouping)
UPDATE deliverable_versions SET tag = COALESCE(file_name, 'untitled') WHERE tag IS NULL;

-- Make NOT NULL with a default
ALTER TABLE deliverable_versions ALTER COLUMN tag SET NOT NULL;
ALTER TABLE deliverable_versions ALTER COLUMN tag SET DEFAULT 'untitled';

-- Drop old file-name-scoped unique constraint
ALTER TABLE deliverable_versions
  DROP CONSTRAINT IF EXISTS deliverable_versions_deliverable_id_file_name_version_number_key;

-- Add new tag-scoped unique constraint
ALTER TABLE deliverable_versions
  ADD CONSTRAINT deliverable_versions_deliverable_id_tag_version_number_key
  UNIQUE (deliverable_id, tag, version_number);
