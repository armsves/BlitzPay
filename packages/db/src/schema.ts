import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const merchants = pgTable("merchants", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull().default("retail"),
  taxId: text("tax_id").notNull().default(""),
  walletAddress: text("wallet_address").notNull(),
  kybStatus: text("kyb_status").notNull().default("pending"),
  portalCustomerId: text("portal_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankDetails = pgTable("bank_details", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => merchants.id),
  accountHolderName: text("account_holder_name").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  routingNumber: text("routing_number").notNull().default(""),
  iban: text("iban"),
  swift: text("swift"),
  country: text("country").notNull().default("US"),
  currency: text("currency").notNull().default("USD"),
  portalPaymentMethodId: text("portal_payment_method_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => merchants.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceUsdc: text("price_usdc").notNull(),
  quantity: integer("quantity").notNull().default(0),
  imageUrl: text("image_url"),
  sku: text("sku"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => merchants.id),
  invoiceNumber: text("invoice_number").notNull(),
  itemsJson: text("items_json").notNull(),
  subtotalUsdc: text("subtotal_usdc").notNull(),
  totalUsdc: text("total_usdc").notNull(),
  status: text("status").notNull().default("pending"),
  merchantWalletAddress: text("merchant_wallet_address").notNull(),
  paymentQrData: text("payment_qr_data").notNull(),
  txHash: text("tx_hash"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const merchantBalances = pgTable("merchant_balances", {
  merchantId: text("merchant_id").primaryKey().references(() => merchants.id),
  balanceUsdc: numeric("balance_usdc", { precision: 18, scale: 6 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const balanceLedger = pgTable("balance_ledger", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => merchants.id),
  type: text("type").notNull(), // credit | debit
  amountUsdc: text("amount_usdc").notNull(),
  balanceAfter: text("balance_after").notNull(),
  referenceType: text("reference_type").notNull(), // payment | withdrawal
  referenceId: text("reference_id").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => merchants.id),
  amountUsdc: text("amount_usdc").notNull(),
  fiatAmount: text("fiat_amount").notNull(),
  fiatCurrency: text("fiat_currency").notNull().default("USD"),
  status: text("status").notNull().default("processing"), // processing | completed | failed
  portalPayoutId: text("portal_payout_id"),
  completesAt: timestamp("completes_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
