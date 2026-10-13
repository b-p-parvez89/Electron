import Order from "@/models/Order";
import { connectDB } from "@/lib/db";
import { sslGateway } from "@/lib/gateways";
import { validateTransaction } from "@/lib/sslcommerz";
import { markPaid } from "@/lib/orders";

/** Validate with SSLCommerz server-to-server and mark the order paid only if everything matches. */
export async function verifyAndMarkPaid(tranId: string, valId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!tranId || !valId) return { ok: false, reason: "missing reference" };
  await connectDB();
  const order = await Order.findOne({ orderNumber: tranId });
  if (!order) return { ok: false, reason: "order not found" };
  if (order.paymentStatus === "paid") return { ok: true };
  const { creds } = await sslGateway();
  const r = await validateTransaction(creds, valId);
  if (r.status !== "VALID" && r.status !== "VALIDATED") return { ok: false, reason: "gateway did not validate" };
  if (r.tran_id !== tranId) return { ok: false, reason: "transaction mismatch" };
  if (r.currency !== "BDT") return { ok: false, reason: "currency mismatch" };
  if (Math.abs(Number(r.amount) - order.total) > 0.01) return { ok: false, reason: "amount mismatch" };
  if (r.risk_level === "1") return { ok: false, reason: "risk review required" };
  if (order.status === "cancelled") {
    order.statusHistory.push({ status: "cancelled", note: "Payment validated AFTER cancellation — review manually (refund or re-open).", at: new Date() });
    order.paymentStatus = "paid";
    order.gatewayValId = valId;
    await order.save();
    return { ok: true };
  }
  await markPaid(order, valId);
  return { ok: true };
}
