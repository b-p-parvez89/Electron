import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import { guard, fail } from "@/lib/adminGuard";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const g = await guard(null); if (g) return g;
  if (req.nextUrl.searchParams.get("history")) {
    const items = await StockMovement.find().sort({ createdAt: -1 }).limit(100).populate("product", "name").lean();
    return NextResponse.json({ items });
  }
  const products = await Product.find().select("name sku stock lowStockThreshold variants images active").sort({ name: 1 }).lean() as any[];
  const rows: any[] = [];
  for (const p of products) {
    if (p.variants?.length) for (const v of p.variants) rows.push({ productId: String(p._id), variantId: String(v._id), name: p.name, variantName: v.name, sku: v.sku || p.sku || "", stock: v.stock, threshold: p.lowStockThreshold, image: v.image || p.images?.[0] || "", active: p.active });
    else rows.push({ productId: String(p._id), name: p.name, variantName: "", sku: p.sku || "", stock: p.stock, threshold: p.lowStockThreshold, image: p.images?.[0] || "", active: p.active });
  }
  return NextResponse.json({ items: rows });
}

/** { productId, variantId?, mode: "set" | "add", quantity, reason } */
export async function POST(req: NextRequest) {
  const g = await guard(req, true); if (g) return g;
  const admin = await requireAdmin();
  const b = await req.json().catch(() => ({}));
  const qty = Number(b.quantity);
  if (!Number.isFinite(qty) || !b.productId || !["set", "add"].includes(b.mode)) return fail("Invalid input");
  const p: any = await Product.findById(b.productId);
  if (!p) return fail("Product not found", 404);
  let before: number, after: number;
  if (b.variantId) {
    const v = p.variants.id(b.variantId);
    if (!v) return fail("Variant not found", 404);
    before = v.stock; after = b.mode === "set" ? qty : v.stock + qty;
    if (after < 0) return fail("Stock cannot be negative");
    v.stock = Math.floor(after);
  } else {
    before = p.stock; after = b.mode === "set" ? qty : p.stock + qty;
    if (after < 0) return fail("Stock cannot be negative");
    p.stock = Math.floor(after);
  }
  await p.save();
  await StockMovement.create({ product: p._id, variantId: b.variantId, delta: Math.floor(after) - before, reason: String(b.reason || (b.mode === "set" ? "adjustment" : "restock")).slice(0, 80), by: admin?.email });
  return NextResponse.json({ ok: true, stock: Math.floor(after) });
}
