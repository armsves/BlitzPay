import type { Address, Hex } from "viem";
import { error, ok } from "@/lib/api-utils";
import { prepareSponsoredPayment } from "@/lib/gas-sponsor";

export async function POST(req: Request) {
  try {
    const { owner, to, amountUsdc } = await req.json();
    if (!owner || !to || !amountUsdc) {
      return error("Missing owner, to, or amountUsdc");
    }
    const prep = await prepareSponsoredPayment(owner as Address, to as Address, amountUsdc);
    return ok(prep);
  } catch (e: unknown) {
    return error(e instanceof Error ? e.message : "Prepare failed", 500);
  }
}
