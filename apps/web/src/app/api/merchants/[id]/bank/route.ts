import { createDb, bankDetails } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ok } from "@/lib/api-utils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: merchantId } = await params;
  const body = await req.json();
  const db = createDb();
  const bankId = nanoid();
  const portalPaymentMethodId = `pm_mock_${nanoid(10)}`;

  await db.insert(bankDetails).values({
    id: bankId,
    merchantId,
    accountHolderName: body.accountHolderName,
    bankName: body.bankName,
    accountNumber: body.accountNumber,
    routingNumber: body.routingNumber || "",
    iban: body.iban || null,
    swift: body.swift || null,
    country: body.country || "US",
    currency: body.currency || "USD",
    portalPaymentMethodId,
  });

  return ok({
    id: bankId,
    portalPaymentMethodId,
    message: "Bank details saved (Portal mocked — payout rails simulated).",
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: merchantId } = await params;
  const db = createDb();
  const rows = await db.select().from(bankDetails).where(eq(bankDetails.merchantId, merchantId));

  return ok(
    rows.map((r) => ({
      id: r.id,
      merchantId: r.merchantId,
      accountHolderName: r.accountHolderName,
      bankName: r.bankName,
      accountNumber: r.accountNumber,
      routingNumber: r.routingNumber,
      iban: r.iban ?? undefined,
      swift: r.swift ?? undefined,
      country: r.country,
      currency: r.currency,
      portalPaymentMethodId: r.portalPaymentMethodId ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}
