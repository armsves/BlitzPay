import { createDb, invoices } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { error, ok } from "@/lib/api-utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createDb();
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!row) return error("Not found", 404);

  return ok({
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
  });
}
