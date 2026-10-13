import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/adminGuard";
import Order from "@/models/Order";

export async function GET(req: NextRequest) {
  const g = await guard(null); if (g) return g;
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  if (sinceParam && (!since || Number.isNaN(since.getTime()))) {
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
  }

  if (!since) {
    const latest = await Order.findOne().sort({ createdAt: -1 }).select("createdAt").lean() as { createdAt?: Date } | null;
    return NextResponse.json({ orders: [], latestAt: latest?.createdAt?.toISOString() || null });
  }

  const orders = await Order.find({ createdAt: { $gt: since } })
    .select("orderNumber customer.name total createdAt")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return NextResponse.json({
    orders,
    latestAt: orders.length ? new Date(orders[0].createdAt).toISOString() : since.toISOString()
  });
}
