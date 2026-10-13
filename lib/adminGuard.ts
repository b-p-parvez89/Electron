import { NextRequest, NextResponse } from "next/server";
import { forbidden, isSameOrigin, requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";

/** Returns a NextResponse to short-circuit with, or null when the caller is an authenticated admin. */
export async function guard(req: NextRequest | null, mutating = false) {
  if (mutating && req && !isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const admin = await requireAdmin();
  if (!admin) return forbidden();
  await connectDB();
  return null;
}
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
