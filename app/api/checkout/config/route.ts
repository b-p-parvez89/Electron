import { NextResponse } from "next/server";
import { activeGateways } from "@/lib/gateways";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [gws, s] = await Promise.all([activeGateways(), getSettings()]);
    return NextResponse.json({
      gateways: gws.map((g) => ({ key: g.key, name: g.name, type: g.type, instructions: g.instructions, accountNumber: g.accountNumber, logo: g.logo })),
      shipping: s.shipping
    });
  } catch { return NextResponse.json({ gateways: [], shipping: { insideDhaka: 70, outsideDhaka: 130, freeOver: 0 } }, { status: 503 }); }
}
