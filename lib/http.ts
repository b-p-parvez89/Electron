import { NextRequest, NextResponse } from "next/server";
export { normalizePhone, isBdMobile } from "@/lib/format";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
export function slugify(input: string) {
  const s = String(input || "").toLowerCase().trim().replace(/[^a-z0-9\u0980-\u09FF]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "item";
}
/** Slug with a short random suffix, used when the plain slug is already taken. */
export function uniqueSlug(input: string) {
  return `${slugify(input)}-${Math.random().toString(36).slice(2, 7)}`;
}
export function safeText(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
/** Best-effort client IP behind Vercel / Cloudflare / nginx. */
export function clientIp(req: NextRequest) {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : "") || h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown";
}
