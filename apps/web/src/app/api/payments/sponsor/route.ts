import type { Address, Hex } from "viem";
import { error, ok } from "@/lib/api-utils";
import { fundCustomerGas, getSponsorBalance, getSponsorInfo } from "@/lib/gas-sponsor";

export async function GET() {
  try {
    const { address } = getSponsorInfo();
    const balance = await getSponsorBalance();
    return ok({
      sponsorAddress: address,
      balanceMon: (Number(balance) / 1e18).toFixed(4),
      ready: balance > BigInt(1e17),
    });
  } catch (e: unknown) {
    return error(e instanceof Error ? e.message : "Sponsor not configured", 503);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const owner = body.owner as Address;
    if (!owner) return error("Missing owner address");

    const result = await fundCustomerGas(owner);
    return ok(result);
  } catch (e: unknown) {
    return error(e instanceof Error ? e.message : "Gas fund failed", 500);
  }
}
