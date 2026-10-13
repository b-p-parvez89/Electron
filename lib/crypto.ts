import crypto from "crypto";
function key() {
  const s = process.env.SECRETS_KEY || process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET (or SECRETS_KEY) must be at least 32 characters");
  return crypto.createHash("sha256").update("electron-secrets:" + s).digest();
}
/** AES-256-GCM. Output: enc:v1:<iv>.<tag>.<data> (base64url). */
export function encrypt(plain: string) {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return "enc:v1:" + [iv, tag, data].map((b) => b.toString("base64url")).join(".");
}
export function decrypt(value: string) {
  if (!value || !value.startsWith("enc:v1:")) return value || "";
  try {
    const [iv, tag, data] = value.slice(7).split(".").map((x) => Buffer.from(x, "base64url"));
    const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString("utf8");
  } catch { return ""; }
}
export const isEncrypted = (v: unknown) => typeof v === "string" && v.startsWith("enc:v1:");
export function sha256(v: string) {
  return crypto.createHash("sha256").update(v).digest("hex");
}
export function timingSafeEqual(a: string, b: string) {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}
/** Encrypt every non-empty string value of a flat object; keep previously stored value when the new one is blank or masked. */
export function mergeSecrets(incoming: Record<string, unknown> | undefined, existing: Record<string, string> | undefined) {
  const out: Record<string, string> = { ...(existing || {}) };
  for (const [k, v] of Object.entries(incoming || {})) {
    if (typeof v !== "string") continue;
    if (v === "" || v.startsWith("••")) continue;
    out[k] = encrypt(v.trim());
  }
  return out;
}
export function maskSecrets(obj: Record<string, string> | undefined) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = v ? "••••••••" : "";
  return out;
}
export function decryptAll(obj: Record<string, string> | undefined) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = decrypt(v);
  return out;
}
