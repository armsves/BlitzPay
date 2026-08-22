import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import db from "./db.js";
import { APP_PORTS } from "@blitzpay/shared";
import { createPaymentQrPayload, getUsdcBalance } from "@blitzpay/blockchain";
import type {
  Merchant,
  BankDetails,
  Product,
  Invoice,
  InvoiceItem,
  Settlement,
} from "@blitzpay/shared";

const app = new Hono();

app.use("*", cors({ origin: "*" }));

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function rowToMerchant(row: Record<string, unknown>): Merchant {
  return {
    id: row.id as string,
    email: row.email as string,
    businessName: row.business_name as string,
    businessType: row.business_type as string,
    taxId: row.tax_id as string,
    walletAddress: row.wallet_address as string,
    kybStatus: row.kyb_status as Merchant["kybStatus"],
    portalCustomerId: row.portal_customer_id as string | undefined,
    createdAt: row.created_at as string,
  };
}

// ─── Auth & Merchants ───────────────────────────────────────────────

app.post("/api/merchants/register", async (c) => {
  const body = await c.req.json();
  const { email, password, businessName, businessType, taxId, walletAddress } = body;

  if (!email || !password || !businessName || !walletAddress) {
    return c.json({ success: false, error: "Missing required fields" }, 400);
  }

  const id = nanoid();
  try {
    db.prepare(`
      INSERT INTO merchants (id, email, password_hash, business_name, business_type, tax_id, wallet_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, email, hashPassword(password), businessName, businessType || "retail", taxId || "", walletAddress);

    return c.json({ success: true, data: { id, email, businessName } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Registration failed";
    if (msg.includes("UNIQUE")) return c.json({ success: false, error: "Email already registered" }, 409);
    return c.json({ success: false, error: msg }, 500);
  }
});

app.post("/api/merchants/login", async (c) => {
  const { email, password } = await c.req.json();
  const row = db.prepare("SELECT * FROM merchants WHERE email = ? AND password_hash = ?").get(
    email,
    hashPassword(password)
  ) as Record<string, unknown> | undefined;

  if (!row) return c.json({ success: false, error: "Invalid credentials" }, 401);
  return c.json({ success: true, data: rowToMerchant(row) });
});

app.get("/api/merchants/:id", (c) => {
  const row = db.prepare("SELECT * FROM merchants WHERE id = ?").get(c.req.param("id")) as Record<string, unknown> | undefined;
  if (!row) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data: rowToMerchant(row) });
});

// ─── KYB ──────────────────────────────────────────────────────────

app.post("/api/merchants/:id/kyb", async (c) => {
  const merchantId = c.req.param("id");
  const body = await c.req.json();

  const portalCustomerId = `portal_cust_${nanoid(12)}`;

  db.prepare(`
    UPDATE merchants SET kyb_status = 'submitted', portal_customer_id = ? WHERE id = ?
  `).run(portalCustomerId, merchantId);

  // In production: call Portal API to initiate KYB workflow
  // POST https://api.portalhq.io/clients/me/customers with business details

  return c.json({
    success: true,
    data: {
      kybStatus: "submitted",
      portalCustomerId,
      message: "KYB submitted to Portal. Review typically takes 1-2 business days.",
      submittedData: body,
    },
  });
});

app.post("/api/merchants/:id/kyb/approve", (c) => {
  const merchantId = c.req.param("id");
  db.prepare("UPDATE merchants SET kyb_status = 'approved' WHERE id = ?").run(merchantId);
  return c.json({ success: true, data: { kybStatus: "approved" } });
});

// ─── Bank Details ─────────────────────────────────────────────────

app.post("/api/merchants/:id/bank", async (c) => {
  const merchantId = c.req.param("id");
  const body = await c.req.json();
  const id = nanoid();

  const portalPaymentMethodId = `pm_${nanoid(12)}`;

  db.prepare(`
    INSERT INTO bank_details (id, merchant_id, account_holder_name, bank_name, account_number, routing_number, iban, swift, country, currency, portal_payment_method_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, merchantId, body.accountHolderName, body.bankName, body.accountNumber,
    body.routingNumber || "", body.iban || null, body.swift || null,
    body.country || "US", body.currency || "USD", portalPaymentMethodId
  );

  return c.json({
    success: true,
    data: {
      id,
      portalPaymentMethodId,
      message: "Bank details saved. Linked to Portal payout rails.",
    },
  });
});

app.get("/api/merchants/:id/bank", (c) => {
  const rows = db.prepare("SELECT * FROM bank_details WHERE merchant_id = ?").all(c.req.param("id")) as Record<string, unknown>[];
  const banks: BankDetails[] = rows.map((r) => ({
    id: r.id as string,
    merchantId: r.merchant_id as string,
    accountHolderName: r.account_holder_name as string,
    bankName: r.bank_name as string,
    accountNumber: r.account_number as string,
    routingNumber: r.routing_number as string,
    iban: r.iban as string | undefined,
    swift: r.swift as string | undefined,
    country: r.country as string,
    currency: r.currency as string,
    portalPaymentMethodId: r.portal_payment_method_id as string | undefined,
    createdAt: r.created_at as string,
  }));
  return c.json({ success: true, data: banks });
});

// ─── Products ─────────────────────────────────────────────────────

app.post("/api/merchants/:merchantId/products", async (c) => {
  const merchantId = c.req.param("merchantId");
  const body = await c.req.json();
  const id = nanoid();

  db.prepare(`
    INSERT INTO products (id, merchant_id, name, description, price_usdc, quantity, image_url, sku)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, merchantId, body.name, body.description || "", body.priceUsdc, body.quantity ?? 0, body.imageUrl || null, body.sku || null);

  return c.json({ success: true, data: { id, ...body } });
});

app.get("/api/merchants/:merchantId/products", (c) => {
  const rows = db.prepare("SELECT * FROM products WHERE merchant_id = ? ORDER BY created_at DESC").all(
    c.req.param("merchantId")
  ) as Record<string, unknown>[];

  const products: Product[] = rows.map((r) => ({
    id: r.id as string,
    merchantId: r.merchant_id as string,
    name: r.name as string,
    description: r.description as string,
    priceUsdc: r.price_usdc as string,
    quantity: r.quantity as number,
    imageUrl: r.image_url as string | undefined,
    sku: r.sku as string | undefined,
    active: Boolean(r.active),
    createdAt: r.created_at as string,
  }));

  return c.json({ success: true, data: products });
});

app.put("/api/products/:id", async (c) => {
  const body = await c.req.json();
  db.prepare(`
    UPDATE products SET name = ?, description = ?, price_usdc = ?, quantity = ?, image_url = ?, active = ?
    WHERE id = ?
  `).run(body.name, body.description, body.priceUsdc, body.quantity, body.imageUrl || null, body.active ? 1 : 0, c.req.param("id"));
  return c.json({ success: true });
});

app.delete("/api/products/:id", (c) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(c.req.param("id"));
  return c.json({ success: true });
});

// ─── Invoices ─────────────────────────────────────────────────────

app.post("/api/merchants/:merchantId/invoices", async (c) => {
  const merchantId = c.req.param("merchantId");
  const body = await c.req.json();

  const merchant = db.prepare("SELECT * FROM merchants WHERE id = ?").get(merchantId) as Record<string, unknown> | undefined;
  if (!merchant) return c.json({ success: false, error: "Merchant not found" }, 404);

  const id = nanoid();
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  const items: InvoiceItem[] = body.items;
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.lineTotalUsdc), 0).toFixed(2);
  const total = subtotal;

  const paymentQrData = createPaymentQrPayload({
    invoiceId: id,
    amountUsdc: total,
    merchantAddress: merchant.wallet_address as string,
  });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO invoices (id, merchant_id, invoice_number, items_json, subtotal_usdc, total_usdc, merchant_wallet_address, payment_qr_data, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, merchantId, invoiceNumber, JSON.stringify(items), subtotal, total, merchant.wallet_address, paymentQrData, expiresAt);

  const invoice: Invoice = {
    id,
    merchantId,
    invoiceNumber,
    items,
    subtotalUsdc: subtotal,
    totalUsdc: total,
    status: "pending",
    merchantWalletAddress: merchant.wallet_address as string,
    paymentQrData,
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  return c.json({ success: true, data: invoice });
});

app.get("/api/invoices/:id", (c) => {
  const row = db.prepare("SELECT * FROM invoices WHERE id = ?").get(c.req.param("id")) as Record<string, unknown> | undefined;
  if (!row) return c.json({ success: false, error: "Not found" }, 404);

  const invoice: Invoice = {
    id: row.id as string,
    merchantId: row.merchant_id as string,
    invoiceNumber: row.invoice_number as string,
    items: JSON.parse(row.items_json as string),
    subtotalUsdc: row.subtotal_usdc as string,
    totalUsdc: row.total_usdc as string,
    status: row.status as Invoice["status"],
    merchantWalletAddress: row.merchant_wallet_address as string,
    paymentQrData: row.payment_qr_data as string,
    txHash: row.tx_hash as string | undefined,
    paidAt: row.paid_at as string | undefined,
    expiresAt: row.expires_at as string,
    createdAt: row.created_at as string,
  };

  return c.json({ success: true, data: invoice });
});

app.get("/api/merchants/:merchantId/invoices", (c) => {
  const rows = db.prepare("SELECT * FROM invoices WHERE merchant_id = ? ORDER BY created_at DESC").all(
    c.req.param("merchantId")
  ) as Record<string, unknown>[];

  const invoices = rows.map((row) => ({
    id: row.id as string,
    merchantId: row.merchant_id as string,
    invoiceNumber: row.invoice_number as string,
    items: JSON.parse(row.items_json as string),
    subtotalUsdc: row.subtotal_usdc as string,
    totalUsdc: row.total_usdc as string,
    status: row.status as string,
    merchantWalletAddress: row.merchant_wallet_address as string,
    paymentQrData: row.payment_qr_data as string,
    txHash: row.tx_hash as string | undefined,
    paidAt: row.paid_at as string | undefined,
    expiresAt: row.expires_at as string,
    createdAt: row.created_at as string,
  }));

  return c.json({ success: true, data: invoices });
});

// ─── Payments (Instant Settlement) ──────────────────────────────────

app.post("/api/payments/confirm", async (c) => {
  const { invoiceId, txHash, blockNumber, status } = await c.req.json();

  if (!invoiceId || !txHash) {
    return c.json({ success: false, error: "Missing invoiceId or txHash" }, 400);
  }

  const paidAt = new Date().toISOString();
  db.prepare(`
    UPDATE invoices SET status = 'paid', tx_hash = ?, paid_at = ? WHERE id = ?
  `).run(txHash, paidAt, invoiceId);

  const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId) as Record<string, unknown>;

  // Decrement product quantities
  const items: InvoiceItem[] = JSON.parse(invoice.items_json as string);
  for (const item of items) {
    db.prepare("UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?").run(
      item.quantity, item.productId, item.quantity
    );
  }

  return c.json({
    success: true,
    data: {
      invoiceId,
      txHash,
      blockNumber,
      status,
      paidAt,
      message: "Payment confirmed via eth_sendRawTransactionSync — instant settlement!",
    },
  });
});

app.get("/api/wallet/:address/balance", async (c) => {
  const address = c.req.param("address");
  try {
    const balance = await getUsdcBalance(address as `0x${string}`);
    return c.json({ success: true, data: { address, balanceUsdc: balance } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Balance fetch failed";
    return c.json({ success: false, error: msg }, 500);
  }
});

// ─── Settlements (Portal Payouts) ─────────────────────────────────

app.post("/api/merchants/:id/settle", async (c) => {
  const merchantId = c.req.param("id");
  const { amountUsdc } = await c.req.json();

  const merchant = db.prepare("SELECT * FROM merchants WHERE id = ?").get(merchantId) as Record<string, unknown> | undefined;
  if (!merchant) return c.json({ success: false, error: "Merchant not found" }, 404);
  if (merchant.kyb_status !== "approved") {
    return c.json({ success: false, error: "KYB must be approved before settlement" }, 403);
  }

  const bank = db.prepare("SELECT * FROM bank_details WHERE merchant_id = ? LIMIT 1").get(merchantId) as Record<string, unknown> | undefined;
  if (!bank) return c.json({ success: false, error: "Bank details required" }, 400);

  const id = nanoid();
  const portalPayoutId = `payout_${nanoid(12)}`;
  const fiatAmount = (parseFloat(amountUsdc) * 0.999).toFixed(2); // mock 0.1% fee

  db.prepare(`
    INSERT INTO settlements (id, merchant_id, amount_usdc, fiat_amount, fiat_currency, status, portal_payout_id)
    VALUES (?, ?, ?, ?, ?, 'processing', ?)
  `).run(id, merchantId, amountUsdc, fiatAmount, bank.currency, portalPayoutId);

  // In production:
  // 1. GET /payouts/channels (Portal/Noah)
  // 2. POST /payouts/quote with cryptoAmount
  // 3. POST /payouts with payoutId
  // 4. Send USDC to deposit address from merchant wallet

  return c.json({
    success: true,
    data: {
      id,
      portalPayoutId,
      amountUsdc,
      fiatAmount,
      fiatCurrency: bank.currency,
      status: "processing",
      message: "Settlement initiated via Portal. USDC will be converted and sent to your bank.",
      estimatedArrival: "1-3 business days",
    },
  });
});

app.get("/api/merchants/:id/settlements", (c) => {
  const rows = db.prepare("SELECT * FROM settlements WHERE merchant_id = ? ORDER BY created_at DESC").all(
    c.req.param("id")
  ) as Record<string, unknown>[];

  const settlements: Settlement[] = rows.map((r) => ({
    id: r.id as string,
    merchantId: r.merchant_id as string,
    amountUsdc: r.amount_usdc as string,
    fiatAmount: r.fiat_amount as string,
    fiatCurrency: r.fiat_currency as string,
    status: r.status as Settlement["status"],
    portalPayoutId: r.portal_payout_id as string | undefined,
    txHash: r.tx_hash as string | undefined,
    createdAt: r.created_at as string,
  }));

  return c.json({ success: true, data: settlements });
});

app.get("/api/health", (c) => c.json({ status: "ok", service: "blitzpay-api" }));

const port = APP_PORTS.api;
console.log(`BlitzPay API running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
