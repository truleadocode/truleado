-- Link deliverables to creators
ALTER TABLE deliverables ADD COLUMN creator_id UUID REFERENCES creators(id) ON DELETE SET NULL;
ALTER TABLE deliverables ADD COLUMN proposal_version_id UUID REFERENCES proposal_versions(id) ON DELETE SET NULL;

CREATE INDEX idx_deliverables_creator_id ON deliverables(creator_id);
CREATE INDEX idx_deliverables_proposal_version_id ON deliverables(proposal_version_id);
