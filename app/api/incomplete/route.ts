import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import IncompleteOrder from "@/models/IncompleteOrder";
import { isSameOrigin } from "@/lib/auth";
import { clientIp, isBdMobile, normalizePhone } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  sessionId: z.string().min(8).max(80),
  name: z.string().max(100).optional().default(""), phone: z.string().max(20).optional().default(""),
  email: z.string().max(150).optional().default(""), address: z.string().max(300).optional().default(""), city: z.string().max(100).optional().default(""),
  items: z.array(z.object({ productId: z.string().max(40), variantId: z.string().max(40).optional(), name: z.string().max(180), variantName: z.string().max(100).optional(), quantity: z.number().int().min(1).max(20), price: z.number().min(0), image: z.string().max(1000).optional() })).min(1).max(30)
});

/** Called while the visitor fills the checkout form. Only stored once a valid mobile number is present. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!rateLimit("inc:" + clientIp(req), 60, 10 * 60 * 1000)) return NextResponse.json({ ok: true });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false }, { status: 400 });
  const phone = normalizePhone(p.data.phone);
  if (!isBdMobile(phone)) return NextResponse.json({ ok: true, stored: false });
  try {
    await connectDB();
    const total = p.data.items.reduce((a, i) => a + i.price * i.quantity, 0);
    await IncompleteOrder.updateOne(
      { sessionId: p.data.sessionId, status: { $ne: "recovered" } },
      { $set: { ...p.data, phone, total, lastSeenAt: new Date() }, $setOnInsert: { status: "incomplete" } },
      { upsert: true }
    ).catch(() => {});
    return NextResponse.json({ ok: true, stored: true });
  } catch { return NextResponse.json({ ok: false }, { status: 500 }); }
}
