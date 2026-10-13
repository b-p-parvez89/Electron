import { NextRequest, NextResponse } from "next/server";
import Order from "@/models/Order";
import CourierProvider from "@/models/CourierProvider";
import { guard, fail } from "@/lib/adminGuard";
import { bookParcel } from "@/lib/courier";
import { setStatus } from "@/lib/orders";

/** Book the order with the chosen courier provider and store the consignment/tracking data. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req, true); if (g) return g;
  const { id } = await params;
  const { providerId } = await req.json().catch(() => ({}));
  const [order, provider] = await Promise.all([
    Order.findById(id),
    CourierProvider.findOne({ _id: providerId, active: true }).select("+credentials")
  ]);
  if (!order) return fail("Order not found", 404);
  if (!provider) return fail("কুরিয়ার সার্ভিস নির্বাচন করুন (সক্রিয় থাকতে হবে)");
  if (order.courier?.consignmentId) return fail("এই অর্ডার আগেই কুরিয়ারে পাঠানো হয়েছে", 409);
  if (["cancelled", "returned", "delivered"].includes(order.status)) return fail("এই স্ট্যাটাসের অর্ডার কুরিয়ারে পাঠানো যাবে না");
  try {
    const r = await bookParcel(provider, {
      orderNumber: order.orderNumber, name: order.customer.name, phone: order.customer.phone, address: order.customer.address, city: order.customer.city,
      codAmount: order.paymentStatus === "paid" ? 0 : order.total, note: order.note || "", itemCount: order.items.reduce((a: number, i: any) => a + i.quantity, 0),
      itemNames: order.items.map((i: any) => `${i.name}${i.variantName ? " (" + i.variantName + ")" : ""} x${i.quantity}`).join(", "), weight: 0.5
    });
    order.courier = {
      providerId: provider._id, provider: provider.name, consignmentId: r.consignmentId, trackingCode: r.trackingCode, trackingUrl: r.trackingUrl,
      status: r.status, bookedAt: new Date(), events: [{ status: r.status, note: `Booked with ${provider.name}`, at: new Date() }]
    } as any;
    await order.save();
    await setStatus(order, "shipped", `Sent to ${provider.name}`);
    return NextResponse.json({ item: await Order.findById(order._id).lean() });
  } catch (e: any) { return fail(e?.message || "Courier booking failed", 502); }
}
