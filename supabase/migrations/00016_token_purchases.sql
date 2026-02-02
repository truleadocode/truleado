-- Migration: Token Purchases & Billing
-- Adds token_purchases table for tracking Razorpay purchases
-- Adds premium_token_balance column to agencies

-- Add premium token balance to agencies
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS premium_token_balance INTEGER DEFAULT 0;

-- Token purchase records
CREATE TABLE token_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('basic', 'premium')),
  token_quantity INTEGER NOT NULL CHECK (token_quantity > 0),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_token_purchases_agency ON token_purchases(agency_id);
CREATE INDEX idx_token_purchases_status ON token_purchases(status);

-- Updated_at trigger (reuse existing function from initial schema)
ALTER TABLE token_purchases ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TRIGGER set_token_purchases_updated_at
  BEFORE UPDATE ON token_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
