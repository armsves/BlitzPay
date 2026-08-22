import type { Address, Hex } from "viem";
import { error, ok } from "@/lib/api-utils";
import { dripGasTo, executeSponsoredPayment } from "@/lib/gas-sponsor";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "drip") {
      await dripGasTo(body.owner as Address);
      return ok({ gasToppedUp: true });
    }

    const { owner, to, amountUsdc, deadline, signature } = body;
    if (!owner || !to || !amountUsdc || !deadline || !signature) {
      return error("Missing payment fields");
    }

    try {
      const result = await executeSponsoredPayment({
        owner: owner as Address,
        to: to as Address,
        amountUsdc,
        deadline,
        signature: signature as Hex,
      });
      return ok(result);
    } catch {
      await dripGasTo(owner as Address);
      return error("Permit relay failed — gas topped up, retry payment", 502);
    }
  } catch (e: unknown) {
    return error(e instanceof Error ? e.message : "Sponsor failed", 500);
  }
}
