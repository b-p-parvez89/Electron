import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const cookieName = "electron_session";
function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  return new TextEncoder().encode(value);
}
export async function createSession(user: { _id: unknown; email: string; role: string; authVersion?: number }) {
  return new SignJWT({ email: user.email, role: user.role, version: user.authVersion || 0, sub: String(user._id) })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
}
export async function setSessionCookie(token: string) {
  (await cookies()).set(cookieName, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 7
  });
}
export async function clearSessionCookie() {
  (await cookies()).set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
export async function getSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: String(payload.sub), email: String(payload.email), role: String(payload.role), version: typeof payload.version === "number" ? payload.version : 0 };
  } catch { return null; }
}
export async function requireUser() {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  const user = await User.findById(session.id).select("_id name email role authVersion");
  return user && (user.authVersion || 0) === session.version ? user : null;
}
export async function requireAdmin() {
  const user = await requireUser();
  return user?.role === "admin" ? user : null;
}
export function unauthorized() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}
export function forbidden() {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}
export function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; use auth and rate limiting too
  try { return new URL(origin).host === req.headers.get("host"); } catch { return false; }
}
