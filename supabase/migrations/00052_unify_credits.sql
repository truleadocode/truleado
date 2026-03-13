-- =============================================================================
-- Migration 00052: Unify Basic + Premium Tokens → Single Credit System
-- =============================================================================
-- Changes:
--   1. agencies: rename token_balance → credit_balance, drop premium_token_balance
--   2. credit_purchase_config: new table storing USD price per credit
--   3. token_purchases: rename token_quantity → credit_quantity, simplify purchase_type
--   4. token_pricing_config: add apify + scrapecreators rows, update OnSocial to credit units
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. agencies table
-- ---------------------------------------------------------------------------

-- Reset all balances to 0 (no live agencies yet — dev/test only)
UPDATE agencies SET token_balance = 0;

-- Rename token_balance → credit_balance
ALTER TABLE agencies RENAME COLUMN token_balance TO credit_balance;

-- Drop the premium balance (no longer needed)
ALTER TABLE agencies DROP COLUMN IF EXISTS premium_token_balance;

-- ---------------------------------------------------------------------------
-- 2. credit_purchase_config (new single-row global config)
-- ---------------------------------------------------------------------------
-- Stores what agencies pay per credit in USD.
-- Admin can update credit_price_usd without a deploy.
-- Razorpay order amounts are computed at request time:
--   amount = quantity × credit_price_usd × fx_rate(USD → agency_currency)

CREATE TABLE credit_purchase_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_price_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.012,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO credit_purchase_config (credit_price_usd) VALUES (0.012);

-- ---------------------------------------------------------------------------
-- 3. token_purchases table
-- ---------------------------------------------------------------------------

-- Rename token_quantity → credit_quantity
ALTER TABLE token_purchases RENAME COLUMN token_quantity TO credit_quantity;

-- Drop the old check constraint on token_quantity (auto-named by Postgres)
ALTER TABLE token_purchases DROP CONSTRAINT IF EXISTS token_purchases_token_quantity_check;
ALTER TABLE token_purchases ADD CONSTRAINT token_purchases_credit_quantity_check
  CHECK (credit_quantity > 0);

-- Drop old constraint first (it only allows 'basic'/'premium'), then backfill, then re-add
ALTER TABLE token_purchases DROP CONSTRAINT IF EXISTS token_purchases_purchase_type_check;

UPDATE token_purchases SET purchase_type = 'credit';

ALTER TABLE token_purchases ADD CONSTRAINT token_purchases_purchase_type_check
  CHECK (purchase_type IN ('credit'));

-- ---------------------------------------------------------------------------
-- 4. token_pricing_config — add all providers, update OnSocial to credit units
-- ---------------------------------------------------------------------------

-- Change default token_type to 'credit'
ALTER TABLE token_pricing_config ALTER COLUMN token_type SET DEFAULT 'credit';

-- Add Apify: $0.0027/profile, charge 1 credit
INSERT INTO token_pricing_config (provider, action, token_type, provider_cost, internal_cost, agency_id) VALUES
  ('apify', 'profile_fetch', 'credit', 0.002700, 1, NULL)
ON CONFLICT (provider, action, token_type, agency_id) DO UPDATE
  SET provider_cost = EXCLUDED.provider_cost, internal_cost = EXCLUDED.internal_cost, updated_at = now();

-- Add ScrapeCreators: $0.00188/request, charge 1 credit
INSERT INTO token_pricing_config (provider, action, token_type, provider_cost, internal_cost, agency_id) VALUES
  ('scrapecreators', 'post_analytics', 'credit', 0.001880, 1, NULL)
ON CONFLICT (provider, action, token_type, agency_id) DO UPDATE
  SET provider_cost = EXCLUDED.provider_cost, internal_cost = EXCLUDED.internal_cost, updated_at = now();

-- Update OnSocial rows: switch token_type to 'credit', update costs to credit units
-- unlock (no contact): $0.0101 cost → 3 credits
UPDATE token_pricing_config
  SET token_type = 'credit', provider_cost = 0.010100, internal_cost = 3, updated_at = now()
  WHERE provider = 'onsocial' AND action = 'unlock' AND agency_id IS NULL;

-- unlock_with_contact: $0.0202 cost → 5 credits
UPDATE token_pricing_config
  SET token_type = 'credit', provider_cost = 0.020200, internal_cost = 5, updated_at = now()
  WHERE provider = 'onsocial' AND action = 'unlock_with_contact' AND agency_id IS NULL;

-- export_short: $0.0101 cost → 3 credits
UPDATE token_pricing_config
  SET token_type = 'credit', provider_cost = 0.010100, internal_cost = 3, updated_at = now()
  WHERE provider = 'onsocial' AND action = 'export_short' AND agency_id IS NULL;

-- export_full: $0.0202 cost → 5 credits
UPDATE token_pricing_config
  SET token_type = 'credit', provider_cost = 0.020200, internal_cost = 5, updated_at = now()
  WHERE provider = 'onsocial' AND action = 'export_full' AND agency_id IS NULL;

-- import: $0.0101 cost → 3 credits
UPDATE token_pricing_config
  SET token_type = 'credit', provider_cost = 0.010100, internal_cost = 3, updated_at = now()
  WHERE provider = 'onsocial' AND action = 'import' AND agency_id IS NULL;

-- import_with_contact: $0.0202 cost → 5 credits
UPDATE token_pricing_config
  SET token_type = 'credit', provider_cost = 0.020200, internal_cost = 5, updated_at = now()
  WHERE provider = 'onsocial' AND action = 'import_with_contact' AND agency_id IS NULL;

-- audience_report (new): $0.5049 cost → 125 credits
INSERT INTO token_pricing_config (provider, action, token_type, provider_cost, internal_cost, agency_id) VALUES
  ('onsocial', 'audience_report', 'credit', 0.504900, 125, NULL)
ON CONFLICT (provider, action, token_type, agency_id) DO UPDATE
  SET provider_cost = EXCLUDED.provider_cost, internal_cost = EXCLUDED.internal_cost, updated_at = now();
