/** Pure helpers shared by server and browser code (no Next.js imports). */
export function money(n: number) {
  return "৳ " + Math.round(n).toLocaleString("en-BD");
}
/** Normalise a Bangladesh mobile number to 01XXXXXXXXX when possible. */
export function normalizePhone(raw: string) {
  let d = String(raw || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+88")) d = d.slice(3);
  else if (d.startsWith("88") && d.length === 13) d = d.slice(2);
  return d;
}
export function isBdMobile(p: string) {
  return /^01[3-9]\d{8}$/.test(p);
}
