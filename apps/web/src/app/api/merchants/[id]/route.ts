import { createDb, merchants } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { error, ok, rowToMerchant } from "@/lib/api-utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createDb();
  const [row] = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
  if (!row) return error("Not found", 404);
  return ok(rowToMerchant(row));
}
