import { NextRequest, NextResponse } from "next/server";
import Order from "@/models/Order";
import CourierProvider from "@/models/CourierProvider";
import { guard, fail } from "@/lib/adminGuard";
import { courierStatus } from "@/lib/courier";
import { applyCourierStatus } from "@/lib/courierSync";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req, true); if (g) return g;
  const { id } = await params;
  const order = await Order.findById(id);
  if (!order?.courier?.consignmentId) return fail("কুরিয়ার বুকিং পাওয়া যায়নি", 404);
  const provider = await CourierProvider.findById(order.courier.providerId).select("+credentials");
  if (!provider) return fail("কুরিয়ার সার্ভিস মুছে ফেলা হয়েছে");
  try {
    const raw = await courierStatus(provider, order.courier.consignmentId);
    await applyCourierStatus(order, raw, "Status refreshed");
    return NextResponse.json({ item: await Order.findById(order._id).lean(), raw });
  } catch (e: any) { return fail(e?.message || "Status refresh failed", 502); }
}
