import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import Order from "@/models/Order";
import { guard, fail } from "@/lib/adminGuard";
import { productSchema } from "@/lib/productSchema";
import { slugify } from "@/lib/http";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(null); if (g) return g;
  const { id } = await params;
  const p = await Product.findById(id).lean();
  return p ? NextResponse.json({ item: p }) : fail("Not found", 404);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req, true); if (g) return g;
  const { id } = await params;
  const parsed = productSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0]?.path.join(".") + ": " + parsed.error.issues[0]?.message);
  const d: any = parsed.data;
  const unset: any = {};
  if (!d.subcategory) { delete d.subcategory; unset.subcategory = 1; }
  if (!d.brand) { delete d.brand; unset.brand = 1; }
  if (d.compareAtPrice === undefined) unset.compareAtPrice = 1;
  if (!d.sku) { delete d.sku; unset.sku = 1; }
  d.slug = slugify(d.slug || d.name);
  d.variants = d.variants.map((v: any) => { if (!v._id) delete v._id; return v; });
  try {
    const p = await Product.findByIdAndUpdate(id, { $set: d, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true, runValidators: true });
    return p ? NextResponse.json({ item: p }) : fail("Not found", 404);
  } catch (e: any) { return fail(e?.code === 11000 ? "Slug বা SKU আগে থেকেই আছে" : "আপডেট করা যায়নি"); }
}
/** Products that appear on orders are archived; untouched ones are removed. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req, true); if (g) return g;
  const { id } = await params;
  if (await Order.exists({ "items.product": id })) {
    await Product.findByIdAndUpdate(id, { active: false });
    return NextResponse.json({ ok: true, archived: true });
  }
  await Product.findByIdAndDelete(id);
  return NextResponse.json({ ok: true, archived: false });
}
