import { createDb, invoices, products } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import type { InvoiceItem } from "@blitzpay/shared";
import { creditBalance } from "@/lib/balance";
import { error, ok } from "@/lib/api-utils";

export async function POST(req: Request) {
  const { invoiceId, txHash, blockNumber, status } = await req.json();

  if (!invoiceId || !txHash) {
    return error("Missing invoiceId or txHash");
  }

  const db = createDb();
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice) return error("Invoice not found", 404);
  if (invoice.status === "paid") {
    return ok({ invoiceId, txHash, message: "Already paid" });
  }

  const paidAt = new Date();
  await db
    .update(invoices)
    .set({ status: "paid", txHash, paidAt })
    .where(eq(invoices.id, invoiceId));

  const items: InvoiceItem[] = JSON.parse(invoice.itemsJson);
  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (product && product.quantity >= item.quantity) {
      await db
        .update(products)
        .set({ quantity: product.quantity - item.quantity })
        .where(eq(products.id, item.productId));
    }
  }

  const newBalance = await creditBalance(
    invoice.merchantId,
    invoice.totalUsdc,
    "payment",
    invoiceId,
    `Payment received for ${invoice.invoiceNumber}`
  );

  return ok({
    invoiceId,
    txHash,
    blockNumber,
    status,
    paidAt: paidAt.toISOString(),
    merchantBalanceUsdc: newBalance,
    message: "Payment confirmed — instant settlement, balance credited!",
  });
}
