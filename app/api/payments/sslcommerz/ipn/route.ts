import { NextRequest, NextResponse } from "next/server";
import { verifyAndMarkPaid } from "@/lib/payments";

/** Server-to-server notification from SSLCommerz. Payment is only trusted after validating val_id with the gateway API. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const r = await verifyAndMarkPaid(String(form.get("tran_id") || ""), String(form.get("val_id") || ""));
    return NextResponse.json(r.ok ? { ok: true } : { error: r.reason }, { status: r.ok ? 200 : 400 });
  } catch { return NextResponse.json({ error: "Payment validation failed" }, { status: 500 }); }
}
