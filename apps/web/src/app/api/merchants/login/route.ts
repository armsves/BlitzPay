import { createDb, merchants } from "@blitzpay/db";
import { and, eq } from "drizzle-orm";
import { error, ok, hashPassword, rowToMerchant } from "@/lib/api-utils";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const db = createDb();

  const [row] = await db
    .select()
    .from(merchants)
    .where(and(eq(merchants.email, email), eq(merchants.passwordHash, hashPassword(password))))
    .limit(1);

  if (!row) return error("Invalid credentials", 401);
  return ok(rowToMerchant(row));
}
