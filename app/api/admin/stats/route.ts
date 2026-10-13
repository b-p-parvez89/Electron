import { NextResponse } from "next/server";
import Order from "@/models/Order";
import Product from "@/models/Product";
import IncompleteOrder from "@/models/IncompleteOrder";
import { guard } from "@/lib/adminGuard";

export async function GET() {
  const g = await guard(null); if (g) return g;
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const d7 = new Date(startOfDay.getTime() - 6 * 864e5), d30 = new Date(startOfDay.getTime() - 29 * 864e5), d14 = new Date(startOfDay.getTime() - 13 * 864e5);
  const valid = { status: { $nin: ["cancelled", "returned"] } };
  const sum = async (from: Date) => {
    const r = await Order.aggregate([{ $match: { ...valid, createdAt: { $gte: from } } }, { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }]);
    return { revenue: r[0]?.revenue || 0, orders: r[0]?.orders || 0 };
  };
  const [today, week, month, byStatus, daily, top, products, incomplete, pendingPay] = await Promise.all([
    sum(startOfDay), sum(d7), sum(d30),
    Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { ...valid, createdAt: { $gte: d14 } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Dhaka" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([{ $match: { ...valid, createdAt: { $gte: d30 } } }, { $unwind: "$items" }, { $group: { _id: "$items.name", qty: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } }, { $sort: { qty: -1 } }, { $limit: 5 }]),
    Product.find().select("stock lowStockThreshold variants active").lean() as Promise<any[]>,
    IncompleteOrder.countDocuments({ status: "incomplete" }),
    Order.countDocuments({ paymentStatus: "pending", paymentMethod: { $ne: "sslcommerz" } })
  ]);
  let low = 0, out = 0;
  for (const p of products) {
    const stocks = p.variants?.length ? p.variants.map((v: any) => v.stock) : [p.stock];
    for (const s of stocks) { if (s <= 0) out++; else if (s <= p.lowStockThreshold) low++; }
  }
  return NextResponse.json({ today, week, month, byStatus: Object.fromEntries(byStatus.map((x: any) => [x._id, x.n])), daily, top, lowStock: low, outOfStock: out, incomplete, pendingPay });
}
