import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "blitzpay.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    kyb_status TEXT DEFAULT 'pending',
    portal_customer_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bank_details (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    account_holder_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    routing_number TEXT NOT NULL,
    iban TEXT,
    swift TEXT,
    country TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    portal_payment_method_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_usdc TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    image_url TEXT,
    sku TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    invoice_number TEXT NOT NULL,
    items_json TEXT NOT NULL,
    subtotal_usdc TEXT NOT NULL,
    total_usdc TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    merchant_wallet_address TEXT NOT NULL,
    payment_qr_data TEXT NOT NULL,
    tx_hash TEXT,
    paid_at TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    amount_usdc TEXT NOT NULL,
    fiat_amount TEXT,
    fiat_currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    portal_payout_id TEXT,
    tx_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export default db;
