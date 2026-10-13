import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendServerEvent } from "@/lib/tracking";
import { isSameOrigin } from "@/lib/auth";
import { clientIp } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  name: z.enum(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Search"]), // Purchase is sent by the server itself
  eventId: z.string().min(6).max(80), url: z.string().max(500).optional(), value: z.number().min(0).optional(),
  email: z.string().max(150).optional(), phone: z.string().max(20).optional(),
  contents: z.array(z.object({ id: z.string().max(60), quantity: z.number().int().min(1).max(100), item_price: z.number().min(0), title: z.string().max(180).optional() })).max(30).optional()
});

/** Browser → server relay so Meta CAPI / GA4 MP receive the same event (same event_id) as the browser pixel. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit("trk:" + ip, 120, 60 * 1000)) return NextResponse.json({ ok: true });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false }, { status: 400 });
  const d = p.data;
  const ga = req.cookies.get("_ga")?.value.split(".").slice(2).join(".") || undefined;
  await sendServerEvent({
    name: d.name, eventId: d.eventId, url: d.url, value: d.value, contents: d.contents,
    user: { email: d.email, phone: d.phone, ip, ua: req.headers.get("user-agent") || undefined, fbp: req.cookies.get("_fbp")?.value, fbc: req.cookies.get("_fbc")?.value, gaClientId: ga }
  });
  return NextResponse.json({ ok: true });
}
