import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin, getSession } from "@/lib/auth";
import { placeOrder, OrderError } from "@/lib/orders";
import { clientIp, isBdMobile, normalizePhone } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  items: z.array(z.object({ productId: z.string().regex(/^[a-f\d]{24}$/i), variantId: z.string().regex(/^[a-f\d]{24}$/i).optional(), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
  customer: z.object({
    name: z.string().trim().min(2).max(100), phone: z.string().trim().min(10).max(20),
    email: z.string().trim().max(150).optional().default(""), address: z.string().trim().min(5).max(300), city: z.string().trim().min(2).max(100), postalCode: z.string().max(12).optional()
  }),
  note: z.string().max(400).optional(), gateway: z.string().min(1).max(60), paymentReference: z.string().max(80).optional(),
  couponCode: z.string().max(40).optional(), sessionId: z.string().max(80).optional(), eventId: z.string().max(80).optional()
});

/** Public checkout endpoint. Prices, stock and shipping are always recomputed on the server. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit("order:" + ip, 12, 10 * 60 * 1000)) return NextResponse.json({ error: "অনেকবার চেষ্টা করা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন" }, { status: 429 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "অর্ডারের তথ্য ঠিকভাবে পূরণ করুন" }, { status: 400 });
  const d = p.data;
  const phone = normalizePhone(d.customer.phone);
  if (!isBdMobile(phone)) return NextResponse.json({ error: "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)" }, { status: 400 });
  if (d.customer.email && !z.string().email().safeParse(d.customer.email).success) return NextResponse.json({ error: "ইমেইল ঠিকানা সঠিক নয়" }, { status: 400 });
  try {
    const session = await getSession();
    const ga = req.cookies.get("_ga")?.value.split(".").slice(2).join(".") || undefined;
    const { order, paymentUrl } = await placeOrder({
      items: d.items, customer: { ...d.customer, phone }, note: d.note, gateway: d.gateway, paymentReference: d.paymentReference,
      couponCode: d.couponCode, sessionId: d.sessionId, eventId: d.eventId, userId: session?.id,
      tracking: { ip, ua: req.headers.get("user-agent") || undefined, fbp: req.cookies.get("_fbp")?.value, fbc: req.cookies.get("_fbc")?.value, url: req.headers.get("referer") || undefined, gaClientId: ga }
    }, req.nextUrl.origin);
    return NextResponse.json({ order: { orderNumber: order.orderNumber, total: order.total, eventId: order.eventId, phone, status: order.status }, paymentUrl }, { status: 201 });
  } catch (e: any) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("placeOrder failed", e);
    return NextResponse.json({ error: "অর্ডার করা যায়নি, আবার চেষ্টা করুন" }, { status: 500 });
  }
}
