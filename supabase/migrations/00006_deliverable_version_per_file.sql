-- Migration: Version deliverables per file name
-- Date: 2026-01-28

-- Previous schema had a unique constraint on (deliverable_id, version_number)
-- which assumed a single file stream per deliverable.
-- We now want independent versioning per file name so multiple files
-- can exist under a single deliverable, each with their own versions.

ALTER TABLE deliverable_versions
  DROP CONSTRAINT IF EXISTS deliverable_versions_deliverable_id_version_number_key;

ALTER TABLE deliverable_versions
  ADD CONSTRAINT deliverable_versions_deliverable_id_file_name_version_number_key
  UNIQUE (deliverable_id, file_name, version_number);

