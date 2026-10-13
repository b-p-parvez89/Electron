import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import { clientIp, normalizePhone } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

/** Customer-facing tracking. Both the order number and the phone used at checkout are required, so numbers can't be enumerated. */
export async function GET(req: NextRequest) {
  if (!rateLimit("track:" + clientIp(req), 30, 10 * 60 * 1000)) return NextResponse.json({ error: "অনেকবার চেষ্টা করা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন" }, { status: 429 });
  const orderNumber = (req.nextUrl.searchParams.get("orderNumber") || "").trim().toUpperCase();
  const phone = normalizePhone(req.nextUrl.searchParams.get("phone") || "");
  if (!orderNumber || orderNumber.length > 60 || !phone) return NextResponse.json({ error: "অর্ডার নম্বর ও মোবাইল নম্বর দিন" }, { status: 400 });
  try {
    await connectDB();
    const o: any = await Order.findOne({ orderNumber }).select("orderNumber status paymentStatus paymentMethod total subtotal shipping discount createdAt items.name items.variantName items.quantity statusHistory courier.provider courier.trackingCode courier.trackingUrl courier.status customer.phone customer.name").lean();
    if (!o || normalizePhone(o.customer.phone) !== phone) return NextResponse.json({ error: "এই তথ্য দিয়ে কোনো অর্ডার পাওয়া যায়নি" }, { status: 404 });
    const { customer, ...rest } = o;
    return NextResponse.json({ order: { ...rest, customerName: customer.name } });
  } catch { return NextResponse.json({ error: "এই মুহূর্তে ট্র্যাকিং কাজ করছে না" }, { status: 500 }); }
}
