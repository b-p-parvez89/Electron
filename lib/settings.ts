import { connectDB } from "@/lib/db";
import Setting from "@/models/Setting";
import { encrypt, decrypt, isEncrypted } from "@/lib/crypto";

export type Settings = {
  siteName: string; tagline: string; logo: string; favicon: string; phone: string; whatsapp: string; email: string; address: string;
  announcement: string;
  banner: { active: boolean; eyebrow: string; title: string; description: string; image: string; buttonText: string; productId: string; linkUrl: string };
  shipping: { insideDhaka: number; outsideDhaka: number; freeOver: number };
  tracking: {
    metaPixelId: string; metaAccessToken: string; metaTestEventCode: string;
    ga4Id: string; ga4ApiSecret: string; gtmId: string; serverSide: boolean;
  };
  socialPublishing: { facebookPageId: string; instagramAccountId: string; pageAccessToken: string; apiVersion: string; autoPublishNewProducts: boolean };
  seo: { title: string; description: string; ogImage: string; keywords: string };
  pageSeo: { path: string; title: string; description: string }[];
  social: { facebook: string; instagram: string; youtube: string };
};

export const defaultSettings: Settings = {
  siteName: "ELECTRON", tagline: "Gear up for a smarter everyday.", logo: "", favicon: "", phone: "", whatsapp: "", email: "", address: "",
  announcement: "সারা বাংলাদেশে হোম ডেলিভারি · ক্যাশ অন ডেলিভারি সুবিধা",
  banner: { active: false, eyebrow: "", title: "", description: "", image: "", buttonText: "এখনই দেখুন", productId: "", linkUrl: "" },
  shipping: { insideDhaka: 70, outsideDhaka: 130, freeOver: 5000 },
  tracking: { metaPixelId: "", metaAccessToken: "", metaTestEventCode: "", ga4Id: "", ga4ApiSecret: "", gtmId: "", serverSide: true },
  socialPublishing: { facebookPageId: "", instagramAccountId: "", pageAccessToken: "", apiVersion: "v23.0", autoPublishNewProducts: false },
  seo: { title: "ELECTRON — Electronics & Gadgets in Bangladesh", description: "হেডফোন, স্মার্টওয়াচ, চার্জার ও গ্যাজেট — ইলেকট্রন থেকে অর্ডার করুন, সারা বাংলাদেশে ডেলিভারি।", ogImage: "", keywords: "electronics, gadgets, headphones, smartwatch, bangladesh" },
  pageSeo: [],
  social: { facebook: "", instagram: "", youtube: "" }
};

const SECRET_FIELDS: (keyof Settings["tracking"])[] = ["metaAccessToken", "ga4ApiSecret"];
let cached: { at: number; value: Settings } | null = null;

function merge(base: any, patch: any): any {
  if (Array.isArray(patch) || patch === null || typeof patch !== "object") return patch === undefined ? base : patch;
  const out: any = { ...base };
  for (const k of Object.keys(patch)) out[k] = merge(base?.[k], patch[k]);
  return out;
}

/** Raw settings (secrets still encrypted). Falls back to defaults if the DB is unreachable. */
export async function getSettings(): Promise<Settings> {
  if (cached && Date.now() - cached.at < 15000) return cached.value;
  let value = defaultSettings;
  try {
    await connectDB();
    const doc = await Setting.findOne({ key: "main" }).lean() as any;
    value = merge(defaultSettings, doc?.data || {});
  } catch {}
  cached = { at: Date.now(), value };
  return value;
}

export function trackingSecrets(s: Settings) {
  return { metaAccessToken: decrypt(s.tracking.metaAccessToken), ga4ApiSecret: decrypt(s.tracking.ga4ApiSecret) };
}

/** Safe for the browser: no secrets. */
export async function getPublicSettings() {
  const s = await getSettings();
  const { metaAccessToken, ga4ApiSecret, ...tracking } = s.tracking;
  const { pageAccessToken, ...socialPublishing } = s.socialPublishing;
  return {
    ...s,
    tracking: { ...tracking, hasMetaToken: !!metaAccessToken, hasGa4Secret: !!ga4ApiSecret },
    socialPublishing: { ...socialPublishing, hasPageAccessToken: !!pageAccessToken }
  };
}

/** For the admin form: secrets are masked. */
export async function getAdminSettings() {
  const s = await getSettings();
  const t: any = { ...s.tracking };
  for (const f of SECRET_FIELDS) t[f] = t[f] ? "••••••••" : "";
  return { ...s, tracking: t, socialPublishing: { ...s.socialPublishing, pageAccessToken: s.socialPublishing.pageAccessToken ? "••••••••" : "" } };
}

export async function saveSettings(patch: Partial<Settings>) {
  await connectDB();
  const current = await getSettings();
  const next: any = merge(current, patch);
  for (const f of SECRET_FIELDS) {
    const incoming = (patch.tracking as any)?.[f];
    if (incoming === undefined || incoming === "" || String(incoming).startsWith("••")) next.tracking[f] = current.tracking[f];
    else next.tracking[f] = isEncrypted(incoming) ? incoming : encrypt(String(incoming).trim());
  }
  const incomingToken = patch.socialPublishing?.pageAccessToken;
  if (incomingToken === undefined || incomingToken === "" || String(incomingToken).startsWith("••")) {
    next.socialPublishing.pageAccessToken = current.socialPublishing.pageAccessToken;
  } else {
    next.socialPublishing.pageAccessToken = isEncrypted(incomingToken) ? incomingToken : encrypt(String(incomingToken).trim());
  }
  await Setting.findOneAndUpdate({ key: "main" }, { $set: { data: next } }, { upsert: true });
  cached = null;
}

export function pageSeo(s: Settings, path: string) {
  return s.pageSeo.find((p) => p.path === path);
}
