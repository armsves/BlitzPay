import { createDb, merchants, bankDetails } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { createCircleWithdrawal, getOrCreateBalance, CIRCLE_SANDBOX_DELAY_MS } from "@/lib/balance";
import { error, ok } from "@/lib/api-utils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: merchantId } = await params;
  const { amountUsdc } = await req.json();

  if (!amountUsdc || parseFloat(amountUsdc) <= 0) {
    return error("Invalid amount");
  }

  const db = createDb();
  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, merchantId)).limit(1);
  if (!merchant) return error("Merchant not found", 404);
  if (merchant.kybStatus !== "approved") {
    return error("KYB must be approved before withdrawal", 403);
  }

  const [bank] = await db.select().from(bankDetails).where(eq(bankDetails.merchantId, merchantId)).limit(1);
  if (!bank) return error("Bank details required", 400);

  const balance = await getOrCreateBalance(merchantId);
  if (parseFloat(balance.balanceUsdc) < parseFloat(amountUsdc)) {
    return error("Insufficient balance");
  }

  const fiatAmount = (parseFloat(amountUsdc) * 0.999).toFixed(2);

  try {
    const withdrawal = await createCircleWithdrawal({
      merchantId,
      amountUsdc,
      fiatAmount,
      fiatCurrency: bank.currency,
      wireId: bank.circleWireId ?? undefined,
    });

    return ok({
      id: withdrawal.id,
      circleWithdrawalId: withdrawal.circleWithdrawalId,
      amountUsdc,
      fiatAmount,
      fiatCurrency: bank.currency,
      status: "processing",
      completesAt: withdrawal.completesAt.toISOString(),
      delayMs: CIRCLE_SANDBOX_DELAY_MS,
      mocked: withdrawal.mocked,
      sandboxUrl: "https://app-sandbox.circle.com/",
      message: withdrawal.message,
    });
  } catch (e: unknown) {
    return error(e instanceof Error ? e.message : "Withdrawal failed", 400);
  }
}
