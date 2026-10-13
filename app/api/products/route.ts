import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "@/lib/catalog";

/** Public read-only product search (used for quick search / integrations). Admin writes live under /api/admin/products. */
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const num = (v: string | null) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
  const r = await listProducts({ q: (sp.get("q") || "").slice(0, 80) || undefined, category: sp.get("category") || undefined, brand: sp.get("brand") || undefined, min: num(sp.get("min")), max: num(sp.get("max")), sort: sp.get("sort") || undefined, page: num(sp.get("page")) });
  return NextResponse.json({ products: r.items, total: r.total, pages: r.pages, page: r.page });
}
