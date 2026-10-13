import { connectDB } from "@/lib/db";
import PaymentGateway from "@/models/PaymentGateway";
import { decryptAll } from "@/lib/crypto";
import type { SslCreds } from "@/lib/sslcommerz";

export async function activeGateways() {
  await connectDB();
  return PaymentGateway.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }).lean() as Promise<any[]>;
}
export async function gatewayByKey(key: string) {
  await connectDB();
  return PaymentGateway.findOne({ key, active: true }).select("+credentials").lean() as Promise<any>;
}
/** DB-configured credentials win; env vars are a fallback so a first deploy works from .env alone. */
export function sslCredsFrom(gw: any): SslCreds {
  const c = decryptAll(gw?.credentials);
  return {
    storeId: c.storeId || process.env.SSLCOMMERZ_STORE_ID || "",
    storePassword: c.storePassword || process.env.SSLCOMMERZ_STORE_PASSWORD || "",
    live: gw ? gw.sandbox === false : process.env.SSLCOMMERZ_IS_LIVE === "true"
  };
}
export async function sslGateway() {
  await connectDB();
  const gw = await PaymentGateway.findOne({ type: "sslcommerz" }).select("+credentials").lean() as any;
  return { gw, creds: sslCredsFrom(gw) };
}
