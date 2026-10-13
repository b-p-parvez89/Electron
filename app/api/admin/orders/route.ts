import { NextRequest, NextResponse } from "next/server";
import Order from "@/models/Order";
import { guard, esc } from "@/lib/adminGuard";

export async function GET(req: NextRequest) {
  const g = await guard(null); if (g) return g;
  const sp = req.nextUrl.searchParams;
  const filter: any = {};
  const status = sp.get("status"), pay = sp.get("payment"), q = (sp.get("q") || "").trim();
  if (status) filter.status = status;
  if (pay) filter.paymentStatus = pay;
  if (q) { const r = new RegExp(esc(q), "i"); filter.$or = [{ orderNumber: r }, { "customer.phone": r }, { "customer.name": r }]; }
  const page = Math.max(1, Number(sp.get("page") || 1)), limit = 25;
  const [items, total, counts] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }])
  ]);
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit), counts: Object.fromEntries(counts.map((c: any) => [c._id, c.n])) });
}
