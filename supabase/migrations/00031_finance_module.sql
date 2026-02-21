-- =============================================================================
-- 00031: Finance Module
-- =============================================================================
-- Adds campaign-level financial management:
-- - Budget tracking (soft/hard limits)
-- - Creator agreements (financial commitments from accepted proposals)
-- - Manual campaign expenses with receipt uploads
-- - Immutable finance audit logs
-- - Multi-currency support with FX conversion
-- =============================================================================

-- 1. Extend campaigns table with budget fields
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS total_budget NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS budget_control_type TEXT CHECK (budget_control_type IN ('soft', 'hard')) DEFAULT 'soft',
  ADD COLUMN IF NOT EXISTS client_contract_value NUMERIC(15, 2);

-- 2. Creator Agreements (financial commitments from accepted proposals)
CREATE TABLE creator_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_creator_id UUID NOT NULL REFERENCES campaign_creators(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE SET NULL,
  proposal_version_id UUID REFERENCES proposal_versions(id) ON DELETE SET NULL,
  original_amount NUMERIC(15, 2) NOT NULL,
  original_currency TEXT NOT NULL,
  fx_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
  converted_amount NUMERIC(15, 2) NOT NULL,
  converted_currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('committed', 'paid', 'cancelled')) DEFAULT 'committed',
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creator_agreements_campaign ON creator_agreements(campaign_id);
CREATE INDEX idx_creator_agreements_campaign_creator ON creator_agreements(campaign_creator_id);
CREATE INDEX idx_creator_agreements_creator ON creator_agreements(creator_id);
CREATE INDEX idx_creator_agreements_status ON creator_agreements(status);

CREATE TRIGGER update_creator_agreements_updated_at
  BEFORE UPDATE ON creator_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Campaign Expenses (manual non-creator costs)
CREATE TABLE campaign_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ad_spend', 'travel', 'shipping', 'production', 'platform_fees', 'miscellaneous')),
  original_amount NUMERIC(15, 2) NOT NULL,
  original_currency TEXT NOT NULL,
  fx_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
  converted_amount NUMERIC(15, 2) NOT NULL,
  converted_currency TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('unpaid', 'paid')) DEFAULT 'unpaid',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_expenses_campaign ON campaign_expenses(campaign_id);
CREATE INDEX idx_campaign_expenses_category ON campaign_expenses(category);
CREATE INDEX idx_campaign_expenses_status ON campaign_expenses(status);
CREATE INDEX idx_campaign_expenses_created_at ON campaign_expenses(created_at DESC);

CREATE TRIGGER update_campaign_expenses_updated_at
  BEFORE UPDATE ON campaign_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Campaign Finance Logs (immutable audit trail)
CREATE TABLE campaign_finance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}',
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_finance_logs_campaign ON campaign_finance_logs(campaign_id);
CREATE INDEX idx_campaign_finance_logs_action ON campaign_finance_logs(action_type);
CREATE INDEX idx_campaign_finance_logs_created_at ON campaign_finance_logs(created_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE creator_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_finance_logs ENABLE ROW LEVEL SECURITY;

-- creator_agreements: campaign-scoped
CREATE POLICY creator_agreements_select ON creator_agreements
  FOR SELECT
  USING (public.has_campaign_access(creator_agreements.campaign_id));

CREATE POLICY creator_agreements_insert ON creator_agreements
  FOR INSERT
  WITH CHECK (public.has_campaign_access(creator_agreements.campaign_id));

CREATE POLICY creator_agreements_update ON creator_agreements
  FOR UPDATE
  USING (public.has_campaign_access(creator_agreements.campaign_id));

-- campaign_expenses: campaign-scoped
CREATE POLICY campaign_expenses_select ON campaign_expenses
  FOR SELECT
  USING (public.has_campaign_access(campaign_expenses.campaign_id));

CREATE POLICY campaign_expenses_insert ON campaign_expenses
  FOR INSERT
  WITH CHECK (public.has_campaign_access(campaign_expenses.campaign_id));

CREATE POLICY campaign_expenses_update ON campaign_expenses
  FOR UPDATE
  USING (public.has_campaign_access(campaign_expenses.campaign_id));

CREATE POLICY campaign_expenses_delete ON campaign_expenses
  FOR DELETE
  USING (public.has_campaign_access(campaign_expenses.campaign_id));

-- campaign_finance_logs: campaign-scoped (immutable — SELECT and INSERT only)
CREATE POLICY campaign_finance_logs_select ON campaign_finance_logs
  FOR SELECT
  USING (public.has_campaign_access(campaign_finance_logs.campaign_id));

CREATE POLICY campaign_finance_logs_insert ON campaign_finance_logs
  FOR INSERT
  WITH CHECK (public.has_campaign_access(campaign_finance_logs.campaign_id));

-- =============================================================================
-- Storage Bucket for Receipts
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-receipts', 'campaign-receipts', false)
ON CONFLICT (id) DO NOTHING;
