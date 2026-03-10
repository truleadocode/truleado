-- Subscription Plans & Payments
-- Adds subscription tier management for agencies

-- 1. Admin-managed pricing catalog
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro')),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  currency TEXT NOT NULL CHECK (currency IN ('INR', 'USD')),
  price_amount INTEGER NOT NULL,  -- smallest unit (paise for INR, cents for USD)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tier, billing_interval, currency)
);

-- Seed placeholder prices (admin will set real prices from panel)
INSERT INTO subscription_plans (tier, billing_interval, currency, price_amount) VALUES
  ('basic', 'monthly', 'INR', 99900),     -- ₹999/mo
  ('basic', 'yearly',  'INR', 999900),    -- ₹9,999/yr
  ('basic', 'monthly', 'USD', 1200),      -- $12/mo
  ('basic', 'yearly',  'USD', 12000),     -- $120/yr
  ('pro',   'monthly', 'INR', 249900),    -- ₹2,499/mo
  ('pro',   'yearly',  'INR', 2499900),   -- ₹24,999/yr
  ('pro',   'monthly', 'USD', 3000),      -- $30/mo
  ('pro',   'yearly',  'USD', 30000);     -- $300/yr

-- 2. New subscription columns on agencies
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT
    CHECK (subscription_tier IN ('basic', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS billing_interval TEXT
    CHECK (billing_interval IN ('monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enterprise_price_monthly INTEGER,
  ADD COLUMN IF NOT EXISTS enterprise_price_yearly INTEGER,
  ADD COLUMN IF NOT EXISTS enterprise_currency TEXT
    CHECK (enterprise_currency IN ('INR', 'USD'));

-- 3. Subscription payment history
CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_payments_agency ON subscription_payments(agency_id);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(status);
