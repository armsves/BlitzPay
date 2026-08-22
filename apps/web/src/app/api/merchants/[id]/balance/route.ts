import { getOrCreateBalance } from "@/lib/balance";
import { ok } from "@/lib/api-utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const balance = await getOrCreateBalance(id);
  return ok({
    merchantId: id,
    balanceUsdc: parseFloat(balance.balanceUsdc).toFixed(2),
    updatedAt: balance.updatedAt.toISOString(),
  });
}
