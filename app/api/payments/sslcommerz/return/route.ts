import { NextRequest, NextResponse } from "next/server";
import { verifyAndMarkPaid } from "@/lib/payments";
import { failOrder } from "@/lib/orders";
import { connectDB } from "@/lib/db";

/**
 * Browser return from SSLCommerz. The gateway POSTs a form to these URLs; we answer with a 303 redirect to a page.
 * Success is re-validated with the gateway (never trust the redirect); the IPN may also confirm it independently.
 */
async function handle(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") || "returned";
  const base = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
  const go = (path: string) => NextResponse.redirect(base + path, 303);
  let tranId = "", valId = "";
  if (req.method === "POST") {
    try { const f = await req.formData(); tranId = String(f.get("tran_id") || ""); valId = String(f.get("val_id") || ""); } catch {}
  }
  const q = tranId ? `&order=${encodeURIComponent(tranId)}` : "";
  try {
    if (status === "success" && tranId) {
      const r = await verifyAndMarkPaid(tranId, valId);
      return r.ok ? go(`/order-success?order=${encodeURIComponent(tranId)}`) : go(`/payment-result?status=pending${q}`);
    }
    if ((status === "failed" || status === "cancelled") && tranId && req.method === "POST") {
      await connectDB();
      await failOrder(tranId, status === "cancelled" ? "Customer cancelled the payment" : "Payment failed at gateway");
    }
  } catch {}
  return go(`/payment-result?status=${encodeURIComponent(status)}${q}`);
}
export const GET = handle;
export const POST = handle;
