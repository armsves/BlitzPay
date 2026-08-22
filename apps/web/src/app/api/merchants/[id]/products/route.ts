import { createDb, products } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ok } from "@/lib/api-utils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: merchantId } = await params;
  const body = await req.json();
  const id = nanoid();
  const db = createDb();

  await db.insert(products).values({
    id,
    merchantId,
    name: body.name,
    description: body.description || "",
    priceUsdc: body.priceUsdc,
    quantity: body.quantity ?? 0,
    imageUrl: body.imageUrl || null,
    sku: body.sku || null,
    active: true,
  });

  return ok({ id, ...body });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: merchantId } = await params;
  const db = createDb();
  const rows = await db.select().from(products).where(eq(products.merchantId, merchantId));

  return ok(
    rows.map((r) => ({
      id: r.id,
      merchantId: r.merchantId,
      name: r.name,
      description: r.description,
      priceUsdc: r.priceUsdc,
      quantity: r.quantity,
      imageUrl: r.imageUrl ?? undefined,
      sku: r.sku ?? undefined,
      active: r.active,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}
