import { createDb, merchants } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { submitSandboxKyb } from "@/lib/circle-sandbox";
import { error, ok } from "@/lib/api-utils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = createDb();

  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
  if (!merchant) return error("Not found", 404);

  const kyb = await submitSandboxKyb({
    businessName: merchant.businessName,
    taxId: body.taxId || merchant.taxId,
  });

  await db
    .update(merchants)
    .set({ kybStatus: "submitted", circleAccountId: kyb.circleAccountId })
    .where(eq(merchants.id, id));

  return ok({
    kybStatus: "submitted",
    circleAccountId: kyb.circleAccountId,
    message: kyb.message,
    sandboxUrl: "https://app-sandbox.circle.com/",
    submittedData: body,
  });
}
