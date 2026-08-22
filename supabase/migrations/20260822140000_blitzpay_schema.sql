-- BlitzPay schema for Supabase Postgres
-- Run in Supabase SQL Editor or via: supabase db push

CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'retail',
  tax_id TEXT NOT NULL DEFAULT '',
  wallet_address TEXT NOT NULL,
  kyb_status TEXT NOT NULL DEFAULT 'pending',
  circle_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_details (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  routing_number TEXT NOT NULL DEFAULT '',
  iban TEXT,
  swift TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  currency TEXT NOT NULL DEFAULT 'USD',
  circle_wire_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_usdc TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  sku TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  invoice_number TEXT NOT NULL,
  items_json TEXT NOT NULL,
  subtotal_usdc TEXT NOT NULL,
  total_usdc TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  merchant_wallet_address TEXT NOT NULL,
  payment_qr_data TEXT NOT NULL,
  tx_hash TEXT,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_balances (
  merchant_id TEXT PRIMARY KEY REFERENCES merchants(id),
  balance_usdc NUMERIC(18, 6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS balance_ledger (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  type TEXT NOT NULL,
  amount_usdc TEXT NOT NULL,
  balance_after TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  amount_usdc TEXT NOT NULL,
  fiat_amount TEXT NOT NULL,
  fiat_currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'processing',
  circle_withdrawal_id TEXT,
  completes_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_details_merchant ON bank_details(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_merchant ON invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_merchant ON balance_ledger(merchant_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_merchant ON withdrawals(merchant_id);
