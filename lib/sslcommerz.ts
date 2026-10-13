export type SslCreds = { storeId: string; storePassword: string; live: boolean };
type InitInput = {
  tran_id: string; total_amount: number; cus_name: string; cus_email: string;
  cus_phone: string; cus_add1: string; cus_city: string; product_name: string; num_of_item?: number;
  success_url: string; fail_url: string; cancel_url: string; ipn_url: string;
};
const sandbox = "https://sandbox.sslcommerz.com";
const live = "https://securepay.sslcommerz.com";
const baseOf = (c: SslCreds) => (c.live ? live : sandbox);

export async function createHostedSession(creds: SslCreds, input: InitInput) {
  if (!creds.storeId || !creds.storePassword) throw new Error("SSLCommerz credentials are not configured");
  const form = new URLSearchParams({
    store_id: creds.storeId, store_passwd: creds.storePassword, total_amount: input.total_amount.toFixed(2),
    currency: "BDT", tran_id: input.tran_id, success_url: input.success_url, fail_url: input.fail_url,
    cancel_url: input.cancel_url, ipn_url: input.ipn_url, shipping_method: "Courier",
    num_of_item: String(input.num_of_item || 1),
    product_name: input.product_name.slice(0, 255) || "Order", product_category: "Electronics", product_profile: "physical-goods",
    cus_name: input.cus_name, cus_email: input.cus_email || "noemail@example.com", cus_add1: input.cus_add1,
    cus_city: input.cus_city, cus_country: "Bangladesh", cus_phone: input.cus_phone,
    ship_name: input.cus_name, ship_add1: input.cus_add1, ship_city: input.cus_city, ship_postcode: "1000", ship_country: "Bangladesh"
  });
  const response = await fetch(`${baseOf(creds)}/gwprocess/v4/api.php`, { method: "POST", body: form, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status !== "SUCCESS" || !data.GatewayPageURL) throw new Error("SSLCommerz could not create a hosted session");
  return { url: String(data.GatewayPageURL), sessionKey: String(data.sessionkey ?? "") };
}

export async function validateTransaction(creds: SslCreds, valId: string) {
  if (!creds.storeId || !creds.storePassword) throw new Error("SSLCommerz credentials are not configured");
  const url = new URL(`${baseOf(creds)}/validator/api/validationserverAPI.php`);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", creds.storeId);
  url.searchParams.set("store_passwd", creds.storePassword);
  url.searchParams.set("v", "1");
  url.searchParams.set("format", "json");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("SSLCommerz validation request failed");
  return response.json() as Promise<{ status?: string; tran_id?: string; amount?: string; currency?: string; risk_level?: string }>;
}
