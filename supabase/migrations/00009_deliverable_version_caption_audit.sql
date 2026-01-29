-- Migration: Audit trail for deliverable version caption edits
-- Date: 2026-01-29
-- Allows editing caption by creator/agency and records who changed what and when.

CREATE TABLE deliverable_version_caption_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_version_id UUID NOT NULL REFERENCES deliverable_versions(id) ON DELETE CASCADE,
  old_caption TEXT,
  new_caption TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_deliverable_version_caption_audit_version_id
  ON deliverable_version_caption_audit(deliverable_version_id);

CREATE INDEX idx_deliverable_version_caption_audit_changed_at
  ON deliverable_version_caption_audit(changed_at);

COMMENT ON TABLE deliverable_version_caption_audit IS
  'Append-only audit log for caption edits on deliverable versions. Who changed the caption and when.';
