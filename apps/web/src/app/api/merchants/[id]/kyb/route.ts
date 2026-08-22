import { createDb, merchants } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { error, ok } from "@/lib/api-utils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const portalCustomerId = `portal_cust_${nanoid(12)}`;
  const db = createDb();

  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
  if (!merchant) return error("Not found", 404);

  await db
    .update(merchants)
    .set({ kybStatus: "submitted", portalCustomerId })
    .where(eq(merchants.id, id));

  return ok({
    kybStatus: "submitted",
    portalCustomerId,
    message: "KYB submitted to Portal (mocked — real access requires Portal onboarding).",
    submittedData: body,
  });
}
