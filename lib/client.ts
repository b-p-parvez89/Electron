"use client";
/** Browser-side helpers: cart storage, image URLs, analytics events. */
export type CartItem = {
  productId: string; variantId?: string; name: string; variantName?: string; price: number; quantity: number; image?: string; slug?: string;
};
const KEY = "electron_cart_v2";
export const CART_EVENT = "electron:cart";

export function readCart(): CartItem[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function writeCart(items: CartItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  window.dispatchEvent(new Event(CART_EVENT));
}
export function addToCart(item: CartItem) {
  const cart = readCart();
  const f = cart.find((x) => x.productId === item.productId && (x.variantId || "") === (item.variantId || ""));
  if (f) f.quantity = Math.min(20, f.quantity + item.quantity); else cart.push({ ...item, quantity: Math.min(20, item.quantity) });
  writeCart(cart);
  trackEvent("AddToCart", { value: item.price * item.quantity, contents: [{ id: item.productId, quantity: item.quantity, item_price: item.price, title: item.name }] });
}
export function sessionId() {
  try {
    let s = localStorage.getItem("electron_sid");
    if (!s) { s = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("electron_sid", s); }
    return s;
  } catch { return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

/** Resize/optimise Cloudinary images on the fly; other URLs pass through unchanged. */
export function img(url: string | undefined, w = 600) {
  if (!url) return "";
  return url.includes("res.cloudinary.com") && url.includes("/upload/") ? url.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`) : url;
}

type EvName = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "Search";
type Contents = { id: string; quantity: number; item_price: number; title?: string }[];
const GA: Record<EvName, string> = { PageView: "page_view", ViewContent: "view_item", AddToCart: "add_to_cart", InitiateCheckout: "begin_checkout", Purchase: "purchase", Search: "search" };

/**
 * Fire the browser pixel/GA event and mirror it to the server (Meta CAPI + GA4 MP) with the SAME event id for de-duplication.
 * Purchase is sent from the server on order confirmation; here we only fire the browser half using the order's eventId.
 */
export function trackEvent(name: EvName, data: { value?: number; contents?: Contents; eventId?: string; orderId?: string; email?: string; phone?: string } = {}) {
  if (typeof window === "undefined") return;
  const w = window as any;
  const eventId = data.eventId || `${name}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const params: any = { currency: "BDT", value: data.value };
  if (data.contents) { params.content_type = "product"; params.contents = data.contents.map((c) => ({ id: c.id, quantity: c.quantity, item_price: c.item_price })); params.content_ids = data.contents.map((c) => c.id); }
  if (data.orderId) params.order_id = data.orderId;
  try { if (w.fbq) w.fbq("track", name, params, { eventID: eventId }); } catch {}
  try {
    if (w.gtag) w.gtag("event", GA[name], { currency: "BDT", value: data.value, transaction_id: data.orderId, items: data.contents?.map((c) => ({ item_id: c.id, item_name: c.title, quantity: c.quantity, price: c.item_price })) });
    (w.dataLayer = w.dataLayer || []).push({ event: GA[name], ecommerce: { currency: "BDT", value: data.value, transaction_id: data.orderId, items: data.contents?.map((c) => ({ item_id: c.id, item_name: c.title, quantity: c.quantity, price: c.item_price })) } });
  } catch {}
  if (name !== "Purchase") {
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ name, eventId, url: location.href, value: data.value, contents: data.contents, email: data.email, phone: data.phone }) }).catch(() => {});
  }
}
