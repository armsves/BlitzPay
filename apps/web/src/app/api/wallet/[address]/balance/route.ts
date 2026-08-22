import { getUsdcBalance } from "@blitzpay/blockchain";
import type { Hex } from "viem";
import { error, ok } from "@/lib/api-utils";

export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  try {
    const balance = await getUsdcBalance(address as Hex);
    return ok({ address, balanceUsdc: balance });
  } catch (e: unknown) {
    return error(e instanceof Error ? e.message : "Balance fetch failed", 500);
  }
}
