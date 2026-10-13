import { NextRequest, NextResponse } from "next/server";
import IncompleteOrder from "@/models/IncompleteOrder";
import { guard } from "@/lib/adminGuard";

export async function GET(req: NextRequest) {
  const g = await guard(null); if (g) return g;
  const status = req.nextUrl.searchParams.get("status");
  const filter: any = status ? { status } : {};
  const [items, counts] = await Promise.all([
    IncompleteOrder.find(filter).sort({ lastSeenAt: -1 }).limit(200).lean(),
    IncompleteOrder.aggregate([{ $group: { _id: "$status", n: { $sum: 1 }, value: { $sum: "$total" } } }])
  ]);
  return NextResponse.json({ items, counts });
}
