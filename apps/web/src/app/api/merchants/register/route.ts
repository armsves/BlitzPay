import { createDb, merchants } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { error, ok, hashPassword } from "@/lib/api-utils";
import { getOrCreateBalance } from "@/lib/balance";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, businessName, businessType, taxId, walletAddress } = body;

  if (!email || !password || !businessName || !walletAddress) {
    return error("Missing required fields");
  }

  const db = createDb();
  const [existing] = await db.select().from(merchants).where(eq(merchants.email, email)).limit(1);
  if (existing) return error("Email already registered", 409);

  const id = nanoid();
  await db.insert(merchants).values({
    id,
    email,
    passwordHash: hashPassword(password),
    businessName,
    businessType: businessType || "retail",
    taxId: taxId || "",
    walletAddress,
    kybStatus: "pending",
  });

  await getOrCreateBalance(id);

  return ok({ id, email, businessName });
}
