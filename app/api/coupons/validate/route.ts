import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { evaluateCoupon } from "@/lib/coupons";
import { isSameOrigin } from "@/lib/auth";
import { clientIp } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!rateLimit("coupon:" + clientIp(req), 20, 10 * 60 * 1000)) return NextResponse.json({ error: "অনেকবার চেষ্টা করা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন" }, { status: 429 });
  const { code, subtotal } = await req.json().catch(() => ({}));
  await connectDB();
  const r = await evaluateCoupon(String(code || ""), Number(subtotal) || 0);
  return r.ok ? NextResponse.json({ code: r.code, discount: r.discount, freeShipping: r.freeShipping, description: r.description }) : NextResponse.json({ error: r.error }, { status: 400 });
}
