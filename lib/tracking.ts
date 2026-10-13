import { getSettings, trackingSecrets } from "@/lib/settings";
import { sha256 } from "@/lib/crypto";
import { normalizePhone } from "@/lib/http";

export type ServerEvent = {
  name: "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "Search";
  eventId: string;
  url?: string;
  user?: { email?: string; phone?: string; name?: string; ip?: string; ua?: string; fbp?: string; fbc?: string; gaClientId?: string };
  value?: number;
  currency?: string;
  orderId?: string;
  contents?: { id: string; quantity: number; item_price: number; title?: string }[];
};

const norm = (v?: string) => (v || "").trim().toLowerCase();
function hashPhone(p?: string) {
  const d = normalizePhone(p || "");
  if (!d) return undefined;
  return sha256(d.startsWith("01") ? "88" + d : d);
}

/**
 * Server-side events (Meta Conversions API + GA4 Measurement Protocol). The same eventId is sent by the browser
 * pixel so the platforms can de-duplicate. Failures never break checkout.
 */
export async function sendServerEvent(ev: ServerEvent) {
  try {
    const s = await getSettings();
    if (!s.tracking.serverSide) return;
    const sec = trackingSecrets(s);
    const jobs: Promise<unknown>[] = [];

    if (s.tracking.metaPixelId && sec.metaAccessToken) {
      const u = ev.user || {};
      const body: any = {
        data: [{
          event_name: ev.name, event_time: Math.floor(Date.now() / 1000), event_id: ev.eventId,
          action_source: "website", event_source_url: ev.url,
          user_data: {
            em: u.email ? [sha256(norm(u.email))] : undefined,
            ph: hashPhone(u.phone) ? [hashPhone(u.phone)] : undefined,
            fn: u.name ? [sha256(norm(u.name.split(" ")[0]))] : undefined,
            client_ip_address: u.ip, client_user_agent: u.ua, fbp: u.fbp, fbc: u.fbc, country: [sha256("bd")]
          },
          custom_data: {
            currency: ev.currency || "BDT", value: ev.value, order_id: ev.orderId,
            content_type: "product", contents: ev.contents?.map((c) => ({ id: c.id, quantity: c.quantity, item_price: c.item_price })),
            content_ids: ev.contents?.map((c) => c.id), num_items: ev.contents?.reduce((a, c) => a + c.quantity, 0)
          }
        }],
        test_event_code: s.tracking.metaTestEventCode || undefined
      };
      jobs.push(fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(s.tracking.metaPixelId)}/events?access_token=${encodeURIComponent(sec.metaAccessToken)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      }));
    }

    if (s.tracking.ga4Id && sec.ga4ApiSecret) {
      const map: Record<string, string> = { PageView: "page_view", ViewContent: "view_item", AddToCart: "add_to_cart", InitiateCheckout: "begin_checkout", Purchase: "purchase", Search: "search" };
      const clientId = ev.user?.gaClientId || sha256(ev.eventId).slice(0, 20);
      jobs.push(fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(s.tracking.ga4Id)}&api_secret=${encodeURIComponent(sec.ga4ApiSecret)}`, {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          events: [{
            name: map[ev.name] || ev.name.toLowerCase(),
            params: {
              currency: ev.currency || "BDT", value: ev.value, transaction_id: ev.orderId,
              items: ev.contents?.map((c) => ({ item_id: c.id, item_name: c.title, quantity: c.quantity, price: c.item_price }))
            }
          }]
        })
      }));
    }
    await Promise.allSettled(jobs);
  } catch {}
}
