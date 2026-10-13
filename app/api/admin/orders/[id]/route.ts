import { NextRequest, NextResponse } from "next/server";
import Order from "@/models/Order";
import { guard, fail } from "@/lib/adminGuard";
import { markPaid, setStatus } from "@/lib/orders";

const STATUS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
const PAY = ["unpaid", "pending", "paid", "failed", "refunded"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(null); if (g) return g;
  const { id } = await params;
  const o = await Order.findById(id).lean();
  return o ? NextResponse.json({ item: o }) : fail("Not found", 404);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req, true); if (g) return g;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const order = await Order.findById(id);
  if (!order) return fail("Not found", 404);
  if (typeof b.adminNote === "string") { order.adminNote = b.adminNote.slice(0, 1000); await order.save(); }
  if (typeof b.courierTracking === "string" && order.courier?.consignmentId) {
    order.courier.trackingCode = b.courierTracking.trim().slice(0, 80);
    if (typeof b.courierUrl === "string" && /^https?:\/\//i.test(b.courierUrl.trim())) order.courier.trackingUrl = b.courierUrl.trim().slice(0, 300);
    await order.save();
  }
  if (PAY.includes(b.paymentStatus) && b.paymentStatus !== order.paymentStatus) {
    if (b.paymentStatus === "paid") await markPaid(order);
    else { order.paymentStatus = b.paymentStatus; await order.save(); }
  }
  if (STATUS.includes(b.status)) await setStatus(order, b.status, typeof b.note === "string" ? b.note.slice(0, 200) : "Updated by admin");
  return NextResponse.json({ item: await Order.findById(id).lean() });
}
