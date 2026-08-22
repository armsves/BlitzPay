import { createDb, merchants } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { ok } from "@/lib/api-utils";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createDb();
  await db.update(merchants).set({ kybStatus: "approved" }).where(eq(merchants.id, id));
  return ok({ kybStatus: "approved" });
}
