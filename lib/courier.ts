import { decryptAll } from "@/lib/crypto";

/**
 * Courier adapters. Credentials are stored AES-encrypted on the CourierProvider document and decrypted only here.
 *  - steadfast : Steadfast Courier merchant API (Api-Key / Secret-Key)
 *  - pathao    : Pathao Courier merchant API (OAuth password grant + store id)
 *  - custom    : any REST courier — configure URLs and response paths from the admin dashboard
 *  - manual    : no API; the admin books the parcel by phone/portal and enters the tracking code later
 */
export type ParcelInput = {
  orderNumber: string; name: string; phone: string; address: string; city: string; codAmount: number;
  note: string; itemCount: number; itemNames: string; weight: number;
};
export type BookResult = { consignmentId: string; trackingCode: string; trackingUrl: string; status: string };
type Provider = { _id?: any; name: string; type: string; sandbox?: boolean; credentials?: any; config?: any };

async function http(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), init.timeoutMs || 15000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch {}
    return { res, json, text };
  } catch (e: any) {
    throw new Error(e?.name === "AbortError" ? "কুরিয়ার সার্ভার সাড়া দিচ্ছে না (timeout)" : "কুরিয়ার সার্ভারের সাথে সংযোগ করা যায়নি");
  } finally { clearTimeout(t); }
}
const dig = (obj: any, path?: string) => (path ? path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj) : undefined);
const clean = (v: unknown) => String(v ?? "").trim();

/* ---------- Steadfast ---------- */
const SF = "https://portal.packzy.com/api/v1";
function sfHeaders(c: Record<string, string>) {
  return { "Api-Key": c.apiKey || "", "Secret-Key": c.secretKey || "", "Content-Type": "application/json", Accept: "application/json" };
}
async function steadfastBook(p: Provider, i: ParcelInput): Promise<BookResult> {
  const c = decryptAll(p.credentials);
  if (!c.apiKey || !c.secretKey) throw new Error("Steadfast API Key / Secret Key সেট করা নেই");
  const { res, json } = await http(`${SF}/create_order`, {
    method: "POST", headers: sfHeaders(c),
    body: JSON.stringify({ invoice: i.orderNumber, recipient_name: i.name, recipient_phone: i.phone, recipient_address: `${i.address}, ${i.city}`.slice(0, 250), cod_amount: i.codAmount, note: i.note.slice(0, 200), item_description: i.itemNames.slice(0, 200) })
  });
  const cons = json?.consignment;
  if (!res.ok || !cons?.consignment_id) throw new Error(clean(json?.message || json?.errors && JSON.stringify(json.errors)) || "Steadfast বুকিং ব্যর্থ হয়েছে");
  const code = clean(cons.tracking_code);
  return { consignmentId: clean(cons.consignment_id), trackingCode: code, trackingUrl: code ? `https://steadfast.com.bd/t/${encodeURIComponent(code)}` : "", status: clean(cons.status || "in_review") };
}
async function steadfastStatus(p: Provider, id: string) {
  const c = decryptAll(p.credentials);
  const { res, json } = await http(`${SF}/status_by_cid/${encodeURIComponent(id)}`, { headers: sfHeaders(c) });
  if (!res.ok) throw new Error(clean(json?.message) || "Steadfast স্ট্যাটাস আনা যায়নি");
  return clean(json?.delivery_status);
}

/* ---------- Pathao ---------- */
const pathaoBase = (p: Provider) => (p.sandbox ? "https://courier-api-sandbox.pathao.com" : "https://api-hermes.pathao.com");
async function pathaoToken(p: Provider) {
  const c = decryptAll(p.credentials);
  if (!c.clientId || !c.clientSecret || !c.username || !c.password) throw new Error("Pathao ক্রেডেনশিয়াল (client id/secret, username, password) সেট করা নেই");
  const { res, json } = await http(`${pathaoBase(p)}/aladdin/api/v1/issue-token`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: c.clientId, client_secret: c.clientSecret, username: c.username, password: c.password, grant_type: "password" })
  });
  if (!res.ok || !json?.access_token) throw new Error("Pathao লগইন ব্যর্থ — ক্রেডেনশিয়াল যাচাই করুন");
  return String(json.access_token);
}
async function pathaoBook(p: Provider, i: ParcelInput): Promise<BookResult> {
  const storeId = Number(p.config?.storeId);
  if (!storeId) throw new Error("Pathao Store ID (config) সেট করা নেই");
  const token = await pathaoToken(p);
  const { res, json } = await http(`${pathaoBase(p)}/aladdin/api/v1/orders`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      store_id: storeId, merchant_order_id: i.orderNumber, recipient_name: i.name, recipient_phone: i.phone, recipient_address: `${i.address}, ${i.city}`.slice(0, 220),
      delivery_type: 48, item_type: 2, special_instruction: i.note.slice(0, 200), item_quantity: Math.max(1, i.itemCount), item_weight: i.weight || 0.5,
      amount_to_collect: Math.round(i.codAmount), item_description: i.itemNames.slice(0, 200)
    })
  });
  const d = json?.data;
  if (!res.ok || !d?.consignment_id) throw new Error(clean(json?.message) || "Pathao বুকিং ব্যর্থ হয়েছে");
  const cid = clean(d.consignment_id);
  return { consignmentId: cid, trackingCode: cid, trackingUrl: `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(cid)}&phone=${encodeURIComponent(i.phone)}`, status: clean(d.order_status || "Pending") };
}
async function pathaoStatus(p: Provider, id: string) {
  const token = await pathaoToken(p);
  const { res, json } = await http(`${pathaoBase(p)}/aladdin/api/v1/orders/${encodeURIComponent(id)}/info`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!res.ok) throw new Error(clean(json?.message) || "Pathao স্ট্যাটাস আনা যায়নি");
  return clean(json?.data?.order_status);
}

/* ---------- Custom REST courier ---------- */
/** config: { bookUrl, statusUrl ("{id}" placeholder), idPath, trackingPath, trackingUrl ("{code}"), statusPath, authScheme: "bearer"|"header", authHeader } ; credentials: { apiKey } */
function customHeaders(p: Provider) {
  const c = decryptAll(p.credentials), cfg = p.config || {};
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (c.apiKey) {
    if (cfg.authScheme === "header") h[cfg.authHeader || "X-API-Key"] = c.apiKey;
    else h.Authorization = `Bearer ${c.apiKey}`;
  }
  return h;
}
function assertHttps(u: string) {
  let url: URL; try { url = new URL(u); } catch { throw new Error("কুরিয়ার API URL সঠিক নয়"); }
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) throw new Error("কুরিয়ার API URL অবশ্যই https হতে হবে");
  return url.toString();
}
async function customBook(p: Provider, i: ParcelInput): Promise<BookResult> {
  const cfg = p.config || {};
  if (!cfg.bookUrl) throw new Error("Custom courier-এর Book URL সেট করা নেই");
  const { res, json } = await http(assertHttps(cfg.bookUrl), {
    method: "POST", headers: customHeaders(p),
    body: JSON.stringify({ order_number: i.orderNumber, recipient_name: i.name, recipient_phone: i.phone, recipient_address: i.address, recipient_city: i.city, cod_amount: i.codAmount, note: i.note, item_count: i.itemCount, item_description: i.itemNames, weight: i.weight })
  });
  if (!res.ok) throw new Error(clean(json?.message || json?.error) || `Courier API error (${res.status})`);
  const cid = clean(dig(json, cfg.idPath || "consignment_id") ?? dig(json, "id"));
  if (!cid) throw new Error("কুরিয়ার রেসপন্সে consignment id পাওয়া যায়নি — Response path ঠিক করুন");
  const code = clean(dig(json, cfg.trackingPath || "tracking_code")) || cid;
  return { consignmentId: cid, trackingCode: code, trackingUrl: cfg.trackingUrl ? String(cfg.trackingUrl).replace("{code}", encodeURIComponent(code)) : "", status: clean(dig(json, cfg.statusPath || "status")) || "pending" };
}
async function customStatus(p: Provider, id: string) {
  const cfg = p.config || {};
  if (!cfg.statusUrl) throw new Error("Custom courier-এর Status URL সেট করা নেই");
  const { res, json } = await http(assertHttps(String(cfg.statusUrl).replace("{id}", encodeURIComponent(id))), { headers: customHeaders(p) });
  if (!res.ok) throw new Error(clean(json?.message) || "স্ট্যাটাস আনা যায়নি");
  return clean(dig(json, cfg.statusPath || "status"));
}

/* ---------- public API ---------- */
export async function bookParcel(provider: Provider, input: ParcelInput): Promise<BookResult> {
  switch (provider.type) {
    case "steadfast": return steadfastBook(provider, input);
    case "pathao": return pathaoBook(provider, input);
    case "custom": return customBook(provider, input);
    default: return { consignmentId: `MANUAL-${input.orderNumber}`, trackingCode: "", trackingUrl: "", status: "pending" };
  }
}
export async function courierStatus(provider: Provider, consignmentId: string): Promise<string> {
  switch (provider.type) {
    case "steadfast": return steadfastStatus(provider, consignmentId);
    case "pathao": return pathaoStatus(provider, consignmentId);
    case "custom": return customStatus(provider, consignmentId);
    default: return "";
  }
}

/** Map a raw courier status onto the store's order status. Returns "" when the status should not move the order. */
export function mapCourierStatus(raw: string): "shipped" | "delivered" | "returned" | "" {
  const s = String(raw || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (!s) return "";
  if (/(^|_)(partial_)?delivered($|_)/.test(s) && !/(failed|not_)/.test(s)) return /approval_pending/.test(s) ? "" : "delivered";
  if (/(cancel|return)/.test(s)) return /approval_pending/.test(s) ? "" : "returned";
  if (/(transit|picked|pickup|sorting|hub|assigned|dispatch|out_for|on_the_way|in_review|shipped|hold)/.test(s)) return "shipped";
  return "";
}
