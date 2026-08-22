import { getLedger } from "@/lib/balance";
import { ok } from "@/lib/api-utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entries = await getLedger(id);

  return ok(
    entries.map((e) => ({
      id: e.id,
      merchantId: e.merchantId,
      type: e.type,
      amountUsdc: e.amountUsdc,
      balanceAfter: e.balanceAfter,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    }))
  );
}
