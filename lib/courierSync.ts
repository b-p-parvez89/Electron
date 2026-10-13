import { mapCourierStatus } from "@/lib/courier";
import { markPaid, setStatus } from "@/lib/orders";

/** Record a courier status on the order and move the order status accordingly. Unpaid COD orders become paid on delivery. */
export async function applyCourierStatus(order: any, raw: string, note: string) {
  if (!raw) return;
  if (order.courier.status !== raw) {
    order.courier.status = raw;
    order.courier.events.push({ status: raw, note, at: new Date() });
    await order.save();
  }
  const mapped = mapCourierStatus(raw);
  if (!mapped || mapped === order.status) return;
  if (mapped === "shipped" && !["pending", "confirmed", "processing"].includes(order.status)) return;
  await setStatus(order, mapped, `Courier: ${raw}`);
  if (mapped === "delivered" && order.paymentStatus === "unpaid") await markPaid(order);
}
