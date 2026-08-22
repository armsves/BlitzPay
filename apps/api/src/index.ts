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

  const existing = db.find("merchants", (r) => r.email === email);
  if (existing) return c.json({ success: false, error: "Email already registered" }, 409);

  const id = nanoid();
  db.insert("merchants", {
    id,
    email,
    password_hash: hashPassword(password),
    business_name: businessName,
    business_type: businessType || "retail",
    tax_id: taxId || "",
    wallet_address: walletAddress,
    kyb_status: "pending",
    created_at: new Date().toISOString(),
  });

  return c.json({ success: true, data: { id, email, businessName } });
});

app.post("/api/merchants/login", async (c) => {
  const { email, password } = await c.req.json();
  const row = db.find("merchants", (r) => r.email === email && r.password_hash === hashPassword(password));

  if (!row) return c.json({ success: false, error: "Invalid credentials" }, 401);
  return c.json({ success: true, data: rowToMerchant(row) });
});

app.get("/api/merchants/:id", (c) => {
  const row = db.get("merchants", c.req.param("id"));
  if (!row) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data: rowToMerchant(row) });
});

// ─── KYB ──────────────────────────────────────────────────────────

app.post("/api/merchants/:id/kyb", async (c) => {
  const merchantId = c.req.param("id");
  const body = await c.req.json();
  const portalCustomerId = `portal_cust_${nanoid(12)}`;

  db.update("merchants", merchantId, {
    kyb_status: "submitted",
    portal_customer_id: portalCustomerId,
  });

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
  db.update("merchants", c.req.param("id"), { kyb_status: "approved" });
  return c.json({ success: true, data: { kybStatus: "approved" } });
});

// ─── Bank Details ─────────────────────────────────────────────────

app.post("/api/merchants/:id/bank", async (c) => {
  const merchantId = c.req.param("id");
  const body = await c.req.json();
  const id = nanoid();
  const portalPaymentMethodId = `pm_${nanoid(12)}`;

  db.insert("bank_details", {
    id,
    merchant_id: merchantId,
    account_holder_name: body.accountHolderName,
    bank_name: body.bankName,
    account_number: body.accountNumber,
    routing_number: body.routingNumber || "",
    iban: body.iban || null,
    swift: body.swift || null,
    country: body.country || "US",
    currency: body.currency || "USD",
    portal_payment_method_id: portalPaymentMethodId,
    created_at: new Date().toISOString(),
  });

  return c.json({
    success: true,
    data: { id, portalPaymentMethodId, message: "Bank details saved. Linked to Portal payout rails." },
  });
});

app.get("/api/merchants/:id/bank", (c) => {
  const rows = db.filter("bank_details", (r) => r.merchant_id === c.req.param("id"));
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

  db.insert("products", {
    id,
    merchant_id: merchantId,
    name: body.name,
    description: body.description || "",
    price_usdc: body.priceUsdc,
    quantity: body.quantity ?? 0,
    image_url: body.imageUrl || null,
    sku: body.sku || null,
    active: 1,
    created_at: new Date().toISOString(),
  });

  return c.json({ success: true, data: { id, ...body } });
});

app.get("/api/merchants/:merchantId/products", (c) => {
  const rows = db.filter("products", (r) => r.merchant_id === c.req.param("merchantId"));
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
  db.update("products", c.req.param("id"), {
    name: body.name,
    description: body.description,
    price_usdc: body.priceUsdc,
    quantity: body.quantity,
    image_url: body.imageUrl || null,
    active: body.active ? 1 : 0,
  });
  return c.json({ success: true });
});

app.delete("/api/products/:id", (c) => {
  db.delete("products", c.req.param("id"));
  return c.json({ success: true });
});

// ─── Invoices ─────────────────────────────────────────────────────

app.post("/api/merchants/:merchantId/invoices", async (c) => {
  const merchantId = c.req.param("merchantId");
  const body = await c.req.json();

  const merchant = db.get("merchants", merchantId);
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

  db.insert("invoices", {
    id,
    merchant_id: merchantId,
    invoice_number: invoiceNumber,
    items_json: JSON.stringify(items),
    subtotal_usdc: subtotal,
    total_usdc: total,
    status: "pending",
    merchant_wallet_address: merchant.wallet_address,
    payment_qr_data: paymentQrData,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  });

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
  const row = db.get("invoices", c.req.param("id"));
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
  const rows = db.filter("invoices", (r) => r.merchant_id === c.req.param("merchantId"));
  const invoices = rows.map((row) => ({
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    totalUsdc: row.total_usdc as string,
    status: row.status as string,
    txHash: row.tx_hash as string | undefined,
    paidAt: row.paid_at as string | undefined,
    createdAt: row.created_at as string,
    items: JSON.parse(row.items_json as string),
    merchantId: row.merchant_id as string,
    subtotalUsdc: row.subtotal_usdc as string,
    merchantWalletAddress: row.merchant_wallet_address as string,
    paymentQrData: row.payment_qr_data as string,
    expiresAt: row.expires_at as string,
  }));
  return c.json({ success: true, data: invoices });
});

// ─── Payments (Instant Settlement) ────────────────────────────────

app.post("/api/payments/confirm", async (c) => {
  const { invoiceId, txHash, blockNumber, status } = await c.req.json();

  if (!invoiceId || !txHash) {
    return c.json({ success: false, error: "Missing invoiceId or txHash" }, 400);
  }

  const paidAt = new Date().toISOString();
  db.update("invoices", invoiceId, { status: "paid", tx_hash: txHash, paid_at: paidAt });

  const invoice = db.get("invoices", invoiceId);
  if (invoice) {
    const items: InvoiceItem[] = JSON.parse(invoice.items_json as string);
    for (const item of items) {
      const product = db.get("products", item.productId);
      if (product && (product.quantity as number) >= item.quantity) {
        db.update("products", item.productId, {
          quantity: (product.quantity as number) - item.quantity,
        });
      }
    }
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

  const merchant = db.get("merchants", merchantId);
  if (!merchant) return c.json({ success: false, error: "Merchant not found" }, 404);
  if (merchant.kyb_status !== "approved") {
    return c.json({ success: false, error: "KYB must be approved before settlement" }, 403);
  }

  const bank = db.find("bank_details", (r) => r.merchant_id === merchantId);
  if (!bank) return c.json({ success: false, error: "Bank details required" }, 400);

  const id = nanoid();
  const portalPayoutId = `payout_${nanoid(12)}`;
  const fiatAmount = (parseFloat(amountUsdc) * 0.999).toFixed(2);

  db.insert("settlements", {
    id,
    merchant_id: merchantId,
    amount_usdc: amountUsdc,
    fiat_amount: fiatAmount,
    fiat_currency: bank.currency,
    status: "processing",
    portal_payout_id: portalPayoutId,
    created_at: new Date().toISOString(),
  });

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
  const rows = db.filter("settlements", (r) => r.merchant_id === c.req.param("id"));
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
