import { createDb, merchantBalances, balanceLedger, withdrawals } from "@blitzpay/db";
import { eq, and, lte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createSandboxWithdrawal, CIRCLE_SANDBOX_DELAY_MS } from "./circle-sandbox";

export { CIRCLE_SANDBOX_DELAY_MS };

export async function getOrCreateBalance(merchantId: string) {
  const db = createDb();
  const [existing] = await db
    .select()
    .from(merchantBalances)
    .where(eq(merchantBalances.merchantId, merchantId))
    .limit(1);

  if (existing) return existing;

  await db.insert(merchantBalances).values({ merchantId, balanceUsdc: "0" });
  return { merchantId, balanceUsdc: "0", updatedAt: new Date() };
}

export async function creditBalance(
  merchantId: string,
  amountUsdc: string,
  referenceType: string,
  referenceId: string,
  description: string
) {
  const db = createDb();
  const current = await getOrCreateBalance(merchantId);
  const newBalance = (parseFloat(current.balanceUsdc) + parseFloat(amountUsdc)).toFixed(6);

  await db
    .update(merchantBalances)
    .set({ balanceUsdc: newBalance, updatedAt: new Date() })
    .where(eq(merchantBalances.merchantId, merchantId));

  await db.insert(balanceLedger).values({
    id: nanoid(),
    merchantId,
    type: "credit",
    amountUsdc,
    balanceAfter: newBalance,
    referenceType,
    referenceId,
    description,
  });

  return newBalance;
}

export async function debitBalance(
  merchantId: string,
  amountUsdc: string,
  referenceType: string,
  referenceId: string,
  description: string
) {
  const db = createDb();
  const current = await getOrCreateBalance(merchantId);
  const currentBal = parseFloat(current.balanceUsdc);
  const debit = parseFloat(amountUsdc);

  if (currentBal < debit) {
    throw new Error("Insufficient balance");
  }

  const newBalance = (currentBal - debit).toFixed(6);

  await db
    .update(merchantBalances)
    .set({ balanceUsdc: newBalance, updatedAt: new Date() })
    .where(eq(merchantBalances.merchantId, merchantId));

  await db.insert(balanceLedger).values({
    id: nanoid(),
    merchantId,
    type: "debit",
    amountUsdc,
    balanceAfter: newBalance,
    referenceType,
    referenceId,
    description,
  });

  return newBalance;
}

export async function createCircleWithdrawal(params: {
  merchantId: string;
  amountUsdc: string;
  fiatAmount: string;
  fiatCurrency: string;
  wireId?: string;
}) {
  const db = createDb();
  const id = nanoid();

  const circle = await createSandboxWithdrawal({
    amountUsdc: params.amountUsdc,
    fiatAmount: params.fiatAmount,
    fiatCurrency: params.fiatCurrency,
    wireId: params.wireId,
  });

  await debitBalance(
    params.merchantId,
    params.amountUsdc,
    "withdrawal",
    id,
    `Circle Sandbox withdraw to bank (${circle.circleWithdrawalId})`
  );

  await db.insert(withdrawals).values({
    id,
    merchantId: params.merchantId,
    amountUsdc: params.amountUsdc,
    fiatAmount: params.fiatAmount,
    fiatCurrency: params.fiatCurrency,
    status: "processing",
    circleWithdrawalId: circle.circleWithdrawalId,
    completesAt: circle.completesAt,
  });

  return { id, ...circle, status: "processing" as const };
}

/** Complete withdrawals whose Circle sandbox wire delay has elapsed */
export async function processPendingWithdrawals(merchantId?: string) {
  const db = createDb();
  const now = new Date();

  const pending = await db
    .select()
    .from(withdrawals)
    .where(
      merchantId
        ? and(eq(withdrawals.merchantId, merchantId), eq(withdrawals.status, "processing"), lte(withdrawals.completesAt, now))
        : and(eq(withdrawals.status, "processing"), lte(withdrawals.completesAt, now))
    );

  for (const w of pending) {
    await db
      .update(withdrawals)
      .set({ status: "completed", completedAt: now })
      .where(eq(withdrawals.id, w.id));
  }

  return pending.length;
}

export async function getLedger(merchantId: string, limit = 50) {
  const db = createDb();
  return db
    .select()
    .from(balanceLedger)
    .where(eq(balanceLedger.merchantId, merchantId))
    .orderBy(desc(balanceLedger.createdAt))
    .limit(limit);
}

export async function getWithdrawals(merchantId: string) {
  await processPendingWithdrawals(merchantId);
  const db = createDb();
  return db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.merchantId, merchantId))
    .orderBy(desc(withdrawals.createdAt));
}
