import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Order from "@/models/Order";
import StockMovement from "@/models/StockMovement";
import IncompleteOrder from "@/models/IncompleteOrder";
import { getSettings } from "@/lib/settings";
import { gatewayByKey, sslCredsFrom } from "@/lib/gateways";
import { createHostedSession } from "@/lib/sslcommerz";
import { consumeCoupon, evaluateCoupon, releaseCoupon } from "@/lib/coupons";
import { sendServerEvent } from "@/lib/tracking";

export class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export type PlaceOrderInput = {
  items: { productId: string; variantId?: string; quantity: number }[];
  customer: { name: string; email?: string; phone: string; address: string; city: string; postalCode?: string };
  note?: string; gateway: string; paymentReference?: string; couponCode?: string; sessionId?: string; eventId?: string;
  userId?: string;
  tracking?: { fbp?: string; fbc?: string; ip?: string; ua?: string; url?: string; gaClientId?: string };
};

const isDhaka = (city: string) => /dhaka|ঢাকা|dhaka/i.test(city);

export function calcShipping(s: Awaited<ReturnType<typeof getSettings>>, city: string, subtotalAfterDiscount: number, freeShip: boolean) {
  if (freeShip) return 0;
  if (s.shipping.freeOver > 0 && subtotalAfterDiscount >= s.shipping.freeOver) return 0;
  return isDhaka(city) ? s.shipping.insideDhaka : s.shipping.outsideDhaka;
}

type Reserved = { productId: string; variantId?: string; qty: number };

async function rollback(reserved: Reserved[]) {
  for (const r of reserved) {
    if (r.variantId) await Product.updateOne({ _id: r.productId, "variants._id": r.variantId }, { $inc: { "variants.$.stock": r.qty, soldCount: -r.qty } });
    else await Product.updateOne({ _id: r.productId }, { $inc: { stock: r.qty, soldCount: -r.qty } });
  }
}

export async function placeOrder(input: PlaceOrderInput, origin: string) {
  await connectDB();
  const gw = await gatewayByKey(input.gateway);
  if (!gw) throw new OrderError("এই পেমেন্ট মাধ্যমটি এখন চালু নেই");
  if (gw.type === "manual" && !(input.paymentReference || "").trim()) throw new OrderError("পেমেন্টের ট্রানজেকশন আইডি (TrxID) দিন");
  const settings = await getSettings();

  // merge duplicate lines
  const merged = new Map<string, { productId: string; variantId?: string; quantity: number }>();
  for (const i of input.items) {
    const k = i.productId + ":" + (i.variantId || "");
    const e = merged.get(k);
    if (e) e.quantity += i.quantity; else merged.set(k, { ...i });
  }
  const lines0 = [...merged.values()];
  const products = await Product.find({ _id: { $in: [...new Set(lines0.map((l) => l.productId))] }, active: true }).lean() as any[];
  const pmap = new Map(products.map((p) => [String(p._id), p]));

  const reserved: Reserved[] = [];
  const items: any[] = [];
  let subtotal = 0;
  let couponUsed = "";
  let discount = 0;
  let freeShip = false;
  let orderCreated = false;
  try {
    for (const l of lines0) {
      const p = pmap.get(l.productId);
      if (!p) throw new OrderError("একটি পণ্য আর পাওয়া যাচ্ছে না — কার্ট রিফ্রেশ করুন", 400);
      if (l.quantity > 20) throw new OrderError("একসাথে সর্বোচ্চ ২০টি অর্ডার করা যাবে");
      let unit = p.price, variantName = "", sku = p.sku || "", image = p.images?.[0] || "";
      if (p.variants?.length) {
        const v = p.variants.find((x: any) => String(x._id) === l.variantId);
        if (!v) throw new OrderError(`${p.name}: ভ্যারিয়েন্ট নির্বাচন করুন`);
        const r = await Product.updateOne({ _id: p._id, variants: { $elemMatch: { _id: v._id, stock: { $gte: l.quantity } } } }, { $inc: { "variants.$.stock": -l.quantity, soldCount: l.quantity } });
        if (r.modifiedCount !== 1) throw new OrderError(`${p.name} (${v.name}) স্টকে পর্যাপ্ত নেই`, 409);
        reserved.push({ productId: String(p._id), variantId: String(v._id), qty: l.quantity });
        unit = v.price; variantName = v.name; sku = v.sku || sku; image = v.image || image;
      } else {
        const r = await Product.updateOne({ _id: p._id, stock: { $gte: l.quantity } }, { $inc: { stock: -l.quantity, soldCount: l.quantity } });
        if (r.modifiedCount !== 1) throw new OrderError(`${p.name} স্টকে পর্যাপ্ত নেই`, 409);
        reserved.push({ productId: String(p._id), qty: l.quantity });
      }
      subtotal += unit * l.quantity;
      items.push({ product: p._id, variantId: l.variantId || undefined, variantName, name: p.name, image, sku, quantity: l.quantity, unitPrice: unit });
    }

    if (input.couponCode) {
      const c = await evaluateCoupon(input.couponCode, subtotal);
      if (!c.ok) throw new OrderError(c.error);
      if (!(await consumeCoupon(c.id))) throw new OrderError("কুপনের ব্যবহারের সীমা শেষ");
      couponUsed = c.code; discount = c.discount; freeShip = c.freeShipping;
    }

    const shipping = calcShipping(settings, input.customer.city, subtotal - discount, freeShip);
    const total = Math.max(0, subtotal - discount + shipping);
    const orderNumber = "EL-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const eventId = input.eventId || "ord_" + orderNumber;
    const online = gw.type === "sslcommerz";

    const order = await Order.create({
      orderNumber, user: input.userId || undefined, customer: input.customer, items, subtotal, shipping, discount, couponCode: couponUsed, total,
      note: (input.note || "").slice(0, 400),
      paymentMethod: gw.key, paymentStatus: online || gw.type === "manual" ? "pending" : "unpaid",
      paymentReference: (input.paymentReference || "").trim().slice(0, 80),
      status: "pending", statusHistory: [{ status: "pending", note: "Order placed", at: new Date() }],
      eventId, tracking: input.tracking || {}
    });
    orderCreated = true;
    await StockMovement.insertMany(reserved.map((r) => ({ product: r.productId, variantId: r.variantId, delta: -r.qty, reason: "order", orderNumber })));

    if (input.sessionId) {
      await IncompleteOrder.updateOne({ sessionId: input.sessionId }, { $set: { status: "recovered", recoveredOrder: orderNumber } }).catch(() => {});
    }

    if (online) {
      try {
        const creds = sslCredsFrom(gw);
        const base = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, "");
        const session = await createHostedSession(creds, {
          tran_id: orderNumber, total_amount: total, cus_name: input.customer.name, cus_email: input.customer.email || "", cus_phone: input.customer.phone,
          cus_add1: input.customer.address, cus_city: input.customer.city, product_name: items.map((i) => i.name).join(", ").slice(0, 200), num_of_item: items.length,
          success_url: `${base}/api/payments/sslcommerz/return?status=success`, fail_url: `${base}/api/payments/sslcommerz/return?status=failed`,
          cancel_url: `${base}/api/payments/sslcommerz/return?status=cancelled`, ipn_url: `${base}/api/payments/sslcommerz/ipn`
        });
        order.transactionId = orderNumber;
        await order.save();
        return { order, paymentUrl: session.url };
      } catch (e: any) {
        // gateway unavailable: free the stock and fail the order so inventory never leaks
        await failOrder(orderNumber, "Payment session could not be created");
        throw new OrderError("পেমেন্ট সেশন তৈরি করা যায়নি। অনুগ্রহ করে অন্য মাধ্যম বেছে নিন অথবা পরে চেষ্টা করুন।", 502);
      }
    }

    if (gw.type === "cod") await trackPurchase(order);
    return { order, paymentUrl: undefined as string | undefined };
  } catch (e) {
    // Only undo here if the order document was never created; afterwards restoreStock() owns the cleanup.
    if (!orderCreated) { await rollback(reserved); if (couponUsed) await releaseCoupon(couponUsed); }
    throw e;
  }
}

/** Return reserved stock + coupon use. Idempotent. */
export async function restoreStock(order: any) {
  const claimed = await Order.updateOne({ _id: order._id, stockRestored: false }, { $set: { stockRestored: true } });
  if (claimed.modifiedCount !== 1) return;
  const reserved: Reserved[] = order.items.map((i: any) => ({ productId: String(i.product), variantId: i.variantId || undefined, qty: i.quantity }));
  await rollback(reserved);
  await StockMovement.insertMany(reserved.map((r) => ({ product: r.productId, variantId: r.variantId, delta: r.qty, reason: "cancel", orderNumber: order.orderNumber })));
  if (order.couponCode) await releaseCoupon(order.couponCode);
}

export async function failOrder(orderNumber: string, note: string) {
  const order = await Order.findOne({ orderNumber });
  if (!order || order.paymentStatus === "paid") return;
  order.paymentStatus = "failed";
  order.status = "cancelled";
  order.statusHistory.push({ status: "cancelled", note, at: new Date() });
  await order.save();
  await restoreStock(order);
}

export async function setStatus(order: any, status: string, note = "") {
  if (order.status === status) return order;
  order.status = status;
  order.statusHistory.push({ status, note, at: new Date() });
  await order.save();
  if (status === "cancelled" || status === "returned") await restoreStock(order);
  return order;
}

export async function markPaid(order: any, valId?: string) {
  order.paymentStatus = "paid";
  if (valId) order.gatewayValId = valId;
  if (order.status === "pending") { order.status = "confirmed"; order.statusHistory.push({ status: "confirmed", note: "Payment received", at: new Date() }); }
  await order.save();
  await trackPurchase(order);
}

/** Fire the server-side Purchase event exactly once per order. */
export async function trackPurchase(order: any) {
  const claimed = await Order.updateOne({ _id: order._id, purchaseTracked: { $ne: true } }, { $set: { purchaseTracked: true } });
  if (claimed.modifiedCount !== 1) return;
  await sendServerEvent({
    name: "Purchase", eventId: order.eventId || "ord_" + order.orderNumber, url: order.tracking?.url, value: order.total, orderId: order.orderNumber,
    user: { email: order.customer.email, phone: order.customer.phone, name: order.customer.name, ip: order.tracking?.ip, ua: order.tracking?.ua, fbp: order.tracking?.fbp, fbc: order.tracking?.fbc, gaClientId: order.tracking?.gaClientId },
    contents: order.items.map((i: any) => ({ id: String(i.product), quantity: i.quantity, item_price: i.unitPrice, title: i.name }))
  });
}
