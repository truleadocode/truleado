-- Add import pricing to token_pricing_config
-- Import without contact: 0.02 per creator
-- Import with contact: 0.04 per creator

INSERT INTO token_pricing_config (provider, action, token_type, provider_cost, internal_cost, agency_id)
SELECT 'onsocial', 'import', 'premium', 0.02, 0.02, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM token_pricing_config WHERE provider = 'onsocial' AND action = 'import' AND agency_id IS NULL
);

INSERT INTO token_pricing_config (provider, action, token_type, provider_cost, internal_cost, agency_id)
SELECT 'onsocial', 'import_with_contact', 'premium', 0.04, 0.04, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM token_pricing_config WHERE provider = 'onsocial' AND action = 'import_with_contact' AND agency_id IS NULL
);
