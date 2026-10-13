import { NextRequest, NextResponse } from "next/server";
import Order from "@/models/Order";
import { guard, esc } from "@/lib/adminGuard";

/** Customers are derived from orders (grouped by phone), so guest checkouts are covered too. */
export async function GET(req: NextRequest) {
  const g = await guard(null); if (g) return g;
  const sp = req.nextUrl.searchParams;
  const phone = sp.get("phone");
  if (phone) {
    const orders = await Order.find({ "customer.phone": phone }).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ orders });
  }
  const q = (sp.get("q") || "").trim();
  const match: any = {};
  if (q) { const r = new RegExp(esc(q), "i"); match.$or = [{ "customer.phone": r }, { "customer.name": r }, { "customer.email": r }]; }
  const items = await Order.aggregate([
    { $match: match }, { $sort: { createdAt: -1 } },
    { $group: {
      _id: "$customer.phone", name: { $first: "$customer.name" }, email: { $first: "$customer.email" }, city: { $first: "$customer.city" }, address: { $first: "$customer.address" },
      orders: { $sum: 1 }, lastOrder: { $max: "$createdAt" },
      spent: { $sum: { $cond: [{ $in: ["$status", ["cancelled", "returned"]] }, 0, "$total"] } },
      cancelled: { $sum: { $cond: [{ $in: ["$status", ["cancelled", "returned"]] }, 1, 0] } }
    } },
    { $sort: { spent: -1 } }, { $limit: 300 }
  ]);
  return NextResponse.json({ items });
}
