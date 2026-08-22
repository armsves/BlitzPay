import { createDb, merchants, invoices } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createPaymentQrPayload } from "@blitzpay/blockchain";
import type { InvoiceItem } from "@blitzpay/shared";
import { error, ok } from "@/lib/api-utils";

export async function POST(req: Request, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  const body = await req.json();
  const db = createDb();

  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, merchantId)).limit(1);
  if (!merchant) return error("Merchant not found", 404);

  const id = nanoid();
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  const items: InvoiceItem[] = body.items;
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.lineTotalUsdc), 0).toFixed(2);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const paymentQrData = createPaymentQrPayload({
    invoiceId: id,
    amountUsdc: subtotal,
    merchantAddress: merchant.walletAddress,
  });

  await db.insert(invoices).values({
    id,
    merchantId,
    invoiceNumber,
    itemsJson: JSON.stringify(items),
    subtotalUsdc: subtotal,
    totalUsdc: subtotal,
    status: "pending",
    merchantWalletAddress: merchant.walletAddress,
    paymentQrData,
    expiresAt,
  });

  return ok({
    id,
    merchantId,
    invoiceNumber,
    items,
    subtotalUsdc: subtotal,
    totalUsdc: subtotal,
    status: "pending",
    merchantWalletAddress: merchant.walletAddress,
    paymentQrData,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  const db = createDb();
  const rows = await db.select().from(invoices).where(eq(invoices.merchantId, merchantId));

  return ok(
    rows.map((row) => ({
      id: row.id,
      merchantId: row.merchantId,
      invoiceNumber: row.invoiceNumber,
      items: JSON.parse(row.itemsJson),
      subtotalUsdc: row.subtotalUsdc,
      totalUsdc: row.totalUsdc,
      status: row.status,
      merchantWalletAddress: row.merchantWalletAddress,
      paymentQrData: row.paymentQrData,
      txHash: row.txHash ?? undefined,
      paidAt: row.paidAt?.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }))
  );
}
