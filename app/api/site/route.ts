import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ siteName: s.siteName, phone: s.phone, announcement: s.announcement, logo: s.logo });
}
