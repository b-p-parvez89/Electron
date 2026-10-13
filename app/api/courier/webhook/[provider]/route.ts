import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import CourierProvider from "@/models/CourierProvider";
import { decryptAll, timingSafeEqual } from "@/lib/crypto";
import { applyCourierStatus } from "@/lib/courierSync";

/**
 * Courier status webhook: POST /api/courier/webhook/<courierProviderId>
 * Authenticated with the provider's "webhookSecret" credential, sent as `Authorization: Bearer <secret>` or `?token=<secret>`.
 * Payload (Steadfast style): { consignment_id, invoice, status, tracking_message }.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> | { provider: string } }) {
  try {
    await connectDB();
    const { provider: providerId } = await params;
    const provider = await CourierProvider.findById(providerId).select("+credentials");
    const secret = decryptAll(provider?.credentials).webhookSecret;
    const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("token") || "";
    if (!provider || !secret || !timingSafeEqual(secret, given)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    const cid = String(b.consignment_id ?? b.consignmentId ?? "");
    const invoice = String(b.invoice ?? b.merchant_order_id ?? "");
    const order = await Order.findOne(cid ? { "courier.consignmentId": cid } : { orderNumber: invoice });
    if (!order) return NextResponse.json({ ok: true, ignored: true });
    await applyCourierStatus(order, String(b.status ?? b.delivery_status ?? ""), String(b.tracking_message || "Webhook update").slice(0, 200));
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Webhook failed" }, { status: 500 }); }
}
