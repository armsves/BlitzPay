import { getWithdrawals } from "@/lib/balance";
import { ok } from "@/lib/api-utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await getWithdrawals(id);

  return ok(
    rows.map((w) => ({
      id: w.id,
      merchantId: w.merchantId,
      amountUsdc: w.amountUsdc,
      fiatAmount: w.fiatAmount,
      fiatCurrency: w.fiatCurrency,
      status: w.status,
      portalPayoutId: w.portalPayoutId ?? undefined,
      completesAt: w.completesAt.toISOString(),
      completedAt: w.completedAt?.toISOString(),
      createdAt: w.createdAt.toISOString(),
    }))
  );
}
