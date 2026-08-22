import { createDb, products } from "@blitzpay/db";
import { eq } from "drizzle-orm";
import { ok } from "@/lib/api-utils";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = createDb();

  await db
    .update(products)
    .set({
      name: body.name,
      description: body.description,
      priceUsdc: body.priceUsdc,
      quantity: body.quantity,
      imageUrl: body.imageUrl || null,
      active: body.active ?? true,
    })
    .where(eq(products.id, id));

  return ok({ updated: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createDb();
  await db.delete(products).where(eq(products.id, id));
  return ok({ deleted: true });
}
