"use client";
import { useEffect, useState } from "react";
import { api, Field, uploadFile, useToast } from "./ui";

type BannerProduct = { _id: string; name: string; slug: string; active: boolean };

const SETTING_SECTIONS = [
  ["site", "🏪 সাইট তথ্য"],
  ["banner", "🖼️ হোমপেজ ব্যানার"],
  ["shipping", "🚚 ডেলিভারি"],
  ["tracking", "📡 ট্র্যাকিং"],
  ["publishing", "📣 সোশ্যাল পোস্ট"],
  ["seo", "🔍 SEO"]
] as const;

function SettingsSection({ title, active, children }: { title: string; active: boolean; children: React.ReactNode }) {
  return <section className="panel form" hidden={!active} style={{ marginBottom: 16 }}><h3 style={{ margin: 0 }}>{title}</h3>{children}</section>;
}

export default function Settings() {
  const toast = useToast();
  const [s, setS] = useState<any>(null); const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<(typeof SETTING_SECTIONS)[number][0]>("site");
  const [products, setProducts] = useState<BannerProduct[]>([]);
  useEffect(() => { api("/api/admin/settings").then((d) => setS(d.settings)).catch((e) => toast(e.message, true)); }, [toast]);
  useEffect(() => {
    api<{ items: BannerProduct[]; pages: number }>("/api/admin/products?page=1").then(async (first) => {
      const rest = await Promise.all(Array.from({ length: first.pages - 1 }, (_, index) => api<{ items: BannerProduct[] }>(`/api/admin/products?page=${index + 2}`)));
      setProducts([...first.items, ...rest.flatMap((page) => page.items)].filter((product) => product.active));
    }).catch((e) => toast("ব্যানারের জন্য পণ্য লোড করা যায়নি: " + e.message, true));
  }, [toast]);
  if (!s) return <p className="muted">লোড হচ্ছে…</p>;
  const top = (k: string) => (e: any) => setS({ ...s, [k]: e.target.value });
  const sub = (g: string, k: string, num?: boolean) => (e: any) => setS({ ...s, [g]: { ...s[g], [k]: e.target.type === "checkbox" ? e.target.checked : num ? e.target.value : e.target.value } });
  async function save() {
    setBusy(true);
    const t = s.tracking;
    const body = {
      siteName: s.siteName, tagline: s.tagline, logo: s.logo, favicon: s.favicon, phone: s.phone, whatsapp: s.whatsapp, email: s.email, address: s.address, announcement: s.announcement,
      banner: s.banner,
      shipping: { insideDhaka: Number(s.shipping.insideDhaka) || 0, outsideDhaka: Number(s.shipping.outsideDhaka) || 0, freeOver: Number(s.shipping.freeOver) || 0 },
      tracking: { metaPixelId: t.metaPixelId, metaAccessToken: t.metaAccessToken, metaTestEventCode: t.metaTestEventCode, ga4Id: t.ga4Id, ga4ApiSecret: t.ga4ApiSecret, gtmId: t.gtmId, serverSide: !!t.serverSide },
      socialPublishing: s.socialPublishing,
      seo: s.seo, pageSeo: s.pageSeo.filter((p: any) => p.path), social: s.social
    };
    try { const d = await api("/api/admin/settings", "PUT", body); setS(d.settings); toast("সেটিংস সেভ হয়েছে"); } catch (e: any) { toast(e.message, true); }
    setBusy(false);
  }
  async function logo(f?: File) { if (!f) return; try { setS({ ...s, logo: await uploadFile(f) }); } catch (e: any) { toast(e.message, true); } }
  async function favicon(f?: File) { if (!f) return; try { setS({ ...s, favicon: await uploadFile(f) }); } catch (e: any) { toast(e.message, true); } }
  async function bannerImage(f?: File) { if (!f) return; try { const image = await uploadFile(f); setS((current: any) => ({ ...current, banner: { ...current.banner, image } })); } catch (e: any) { toast(e.message, true); } }
  const bannerField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setS((current: any) => ({ ...current, banner: { ...current.banner, [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value } }));
  return (
    <div style={{ maxWidth: 900 }}>
      <nav className="settings-section-nav" aria-label="সেটিংস বিভাগ" role="tablist">
        {SETTING_SECTIONS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={section === id} className={section === id ? "on" : ""} onClick={() => setSection(id)}>{label}</button>)}
      </nav>
      <SettingsSection title="🏪 সাইট তথ্য" active={section === "site"}>
        <div className="row2"><Field label="সাইটের নাম"><input value={s.siteName} onChange={top("siteName")} /></Field><Field label="ট্যাগলাইন"><input value={s.tagline} onChange={top("tagline")} /></Field></div>
        <div className="row2">
          <Field label="ওয়েবসাইট লোগো (ঐচ্ছিক)" hint="সাইটের header এবং সার্চ ইঞ্জিনের Organization logo হিসেবে ব্যবহৃত হবে।">
            <div style={{ display: "flex", gap: 8 }}><input type="file" accept="image/*" onChange={(e) => logo(e.target.files?.[0])} style={{ flex: 1, minWidth: 0 }} /><input aria-label="ওয়েবসাইট লোগো URL" placeholder="লোগোর URL" value={s.logo} onChange={top("logo")} style={{ flex: 2, minWidth: 0 }} /></div>
            {s.logo && <img src={s.logo} alt="ওয়েবসাইট লোগোর preview" style={{ maxWidth: 180, maxHeight: 72, objectFit: "contain", background: "#fff", padding: 8, borderRadius: 8 }} />}
          </Field>
          <Field label="ফ্যাভিকন (ঐচ্ছিক)" hint="ব্রাউজার tab ও search result-এর favicon। বর্গাকার PNG, ICO বা SVG ব্যবহার করুন।">
            <div style={{ display: "flex", gap: 8 }}><input type="file" accept="image/*,.ico,.svg" onChange={(e) => favicon(e.target.files?.[0])} style={{ flex: 1, minWidth: 0 }} /><input aria-label="ফ্যাভিকন URL" placeholder="ফ্যাভিকনের URL" value={s.favicon} onChange={top("favicon")} style={{ flex: 2, minWidth: 0 }} /></div>
            {s.favicon && <img src={s.favicon} alt="ফ্যাভিকন preview" style={{ width: 48, height: 48, objectFit: "contain", background: "#fff", padding: 4, borderRadius: 8 }} />}
          </Field>
        </div>
        <div className="row3"><Field label="ফোন"><input value={s.phone} onChange={top("phone")} /></Field><Field label="WhatsApp নম্বর"><input value={s.whatsapp} onChange={top("whatsapp")} placeholder="8801XXXXXXXXX" /></Field><Field label="ইমেইল"><input value={s.email} onChange={top("email")} /></Field></div>
        <Field label="ঠিকানা"><input value={s.address} onChange={top("address")} /></Field>
        <Field label="অ্যানাউন্সমেন্ট বার (খালি রাখলে লুকানো)"><input value={s.announcement} onChange={top("announcement")} /></Field>
        <div className="row3"><Field label="Facebook"><input value={s.social.facebook} onChange={sub("social", "facebook")} /></Field><Field label="Instagram"><input value={s.social.instagram} onChange={sub("social", "instagram")} /></Field><Field label="YouTube"><input value={s.social.youtube} onChange={sub("social", "youtube")} /></Field></div>
      </SettingsSection>
      <SettingsSection title="🖼️ হোমপেজ ব্যানার (নেভিগেশনের নিচে)" active={section === "banner"}>
        <label className="chk"><input type="checkbox" checked={!!s.banner.active} onChange={bannerField("active")} /> কাস্টম ব্যানার চালু করুন</label>
        <div className="row2"><Field label="ছোট শিরোনাম"><input maxLength={80} value={s.banner.eyebrow} onChange={bannerField("eyebrow")} placeholder="যেমন: নতুন কালেকশন" /></Field><Field label="ব্যানারের শিরোনাম"><input maxLength={160} value={s.banner.title} onChange={bannerField("title")} placeholder="আপনার প্রচারের শিরোনাম" /></Field></div>
        <Field label="বর্ণনা"><textarea rows={3} maxLength={500} value={s.banner.description} onChange={bannerField("description")} placeholder="ব্যানারের সংক্ষিপ্ত বিবরণ" /></Field>
        <Field label="ব্যানার ছবি" hint="নিজস্ব ছবি না দিলে নির্বাচিত পণ্যের প্রথম ছবিটি ব্যানারে দেখাবে।">
          <div style={{ display: "flex", gap: 8 }}><input type="file" accept="image/*" onChange={(e) => bannerImage(e.target.files?.[0])} style={{ flex: 1, minWidth: 0 }} /><input aria-label="ব্যানার ছবির URL" placeholder="ছবির URL" value={s.banner.image} onChange={bannerField("image")} style={{ flex: 2, minWidth: 0 }} /></div>
          {s.banner.image && <img src={s.banner.image} alt="ব্যানার ছবির preview" style={{ maxWidth: 240, maxHeight: 100, objectFit: "contain", background: "#fff", padding: 6, borderRadius: 8 }} />}
        </Field>
        <div className="row2"><Field label="বাটনের লেখা"><input maxLength={50} value={s.banner.buttonText} onChange={bannerField("buttonText")} /></Field><Field label="বাটন লিংক (ঐচ্ছিক)" hint="পণ্য বাছলে সেটির বিস্তারিত পেজে যাবে। পণ্য না বাছলে এই লিংক ব্যবহার হবে।"><input maxLength={500} value={s.banner.linkUrl} onChange={bannerField("linkUrl")} placeholder="/shop বা https://..." /></Field></div>
        <Field label="ব্যানারের সঙ্গে পণ্য যুক্ত করুন (ঐচ্ছিক)">
          <select value={s.banner.productId} onChange={bannerField("productId")}><option value="">কোনো পণ্য নয়</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select>
        </Field>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>পণ্য নির্বাচন করলে ব্যানারের ছবি/বাটন সেই পণ্যের বিস্তারিত পেজে যাবে। কোনো পণ্য না থাকলে কেবল কাস্টম ব্যানার ও লিংক দেখানো হবে।</p>
      </SettingsSection>
      <SettingsSection title="🚚 ডেলিভারি চার্জ" active={section === "shipping"}>
        <div className="row3"><Field label="ঢাকার ভেতরে (৳)"><input type="number" min="0" value={s.shipping.insideDhaka} onChange={sub("shipping", "insideDhaka")} /></Field><Field label="ঢাকার বাইরে (৳)"><input type="number" min="0" value={s.shipping.outsideDhaka} onChange={sub("shipping", "outsideDhaka")} /></Field><Field label="এর বেশি অর্ডারে ফ্রি (০ = বন্ধ)"><input type="number" min="0" value={s.shipping.freeOver} onChange={sub("shipping", "freeOver")} /></Field></div>
      </SettingsSection>
      <SettingsSection title="📡 ট্র্যাকিং ও অ্যানালিটিক্স" active={section === "tracking"}>
        <div className="row3"><Field label="Meta Pixel ID"><input value={s.tracking.metaPixelId} onChange={sub("tracking", "metaPixelId")} /></Field><Field label="Conversions API Access Token" hint="সার্ভার-সাইড ট্র্যাকিংয়ের জন্য"><input type="password" autoComplete="new-password" value={s.tracking.metaAccessToken} onChange={sub("tracking", "metaAccessToken")} /></Field><Field label="Meta Test Event Code"><input value={s.tracking.metaTestEventCode} onChange={sub("tracking", "metaTestEventCode")} /></Field></div>
        <div className="row3"><Field label="GA4 Measurement ID"><input value={s.tracking.ga4Id} onChange={sub("tracking", "ga4Id")} placeholder="G-XXXXXXX" /></Field><Field label="GA4 API Secret"><input type="password" autoComplete="new-password" value={s.tracking.ga4ApiSecret} onChange={sub("tracking", "ga4ApiSecret")} /></Field><Field label="Google Tag Manager ID"><input value={s.tracking.gtmId} onChange={sub("tracking", "gtmId")} placeholder="GTM-XXXXXXX" /></Field></div>
        <label className="chk"><input type="checkbox" checked={s.tracking.serverSide} onChange={sub("tracking", "serverSide")} /> সার্ভার-সাইড ট্র্যাকিং চালু (Meta CAPI + GA4 Measurement Protocol, ডি-ডুপ্লিকেশনসহ)</label>
      </SettingsSection>
      <SettingsSection title="📣 Facebook ও Instagram পোস্ট" active={section === "publishing"}>
        <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>Meta Graph API দিয়ে Facebook Page এবং যুক্ত Instagram Business/Creator account-এ পণ্য পোস্ট হবে। ব্যক্তিগত Facebook profile সমর্থিত নয়। Meta app-এ pages_manage_posts, pages_read_engagement ও instagram_content_publish অনুমতি নিয়ে Page Access Token তৈরি করুন; Page ও Instagram account একই Meta Business-এ যুক্ত থাকতে হবে। Token server-এ encrypted থাকবে।</p>
        <div className="row2">
          <Field label="Facebook Page ID"><input value={s.socialPublishing.facebookPageId} onChange={(e) => setS({ ...s, socialPublishing: { ...s.socialPublishing, facebookPageId: e.target.value } })} /></Field>
          <Field label="Instagram Professional Account ID"><input value={s.socialPublishing.instagramAccountId} onChange={(e) => setS({ ...s, socialPublishing: { ...s.socialPublishing, instagramAccountId: e.target.value } })} /></Field>
        </div>
        <div className="row2">
          <Field label="Meta Page Access Token" hint={s.socialPublishing.pageAccessToken ? "Token আগে থেকে সংরক্ষিত। ফাঁকা রাখলে বর্তমান token থাকবে; বদলাতে নতুন token দিন।" : "Page-এ পোস্ট করার অনুমতিসহ long-lived Page Access Token দিন।"}>
            <input type="password" autoComplete="new-password" value={s.socialPublishing.pageAccessToken} onChange={(e) => setS({ ...s, socialPublishing: { ...s.socialPublishing, pageAccessToken: e.target.value } })} placeholder={s.socialPublishing.pageAccessToken ? "••••••••" : "Page Access Token"} />
          </Field>
          <Field label="Graph API Version"><input value={s.socialPublishing.apiVersion} onChange={(e) => setS({ ...s, socialPublishing: { ...s.socialPublishing, apiVersion: e.target.value } })} placeholder="v23.0" /></Field>
        </div>
        <label className="chk"><input type="checkbox" checked={!!s.socialPublishing.autoPublishNewProducts} onChange={(e) => setS({ ...s, socialPublishing: { ...s.socialPublishing, autoPublishNewProducts: e.target.checked } })} /> নতুন active product যোগ হলে Facebook ও Instagram-এ স্বয়ংক্রিয়ভাবে পোস্ট করুন</label>
        <p className="muted" style={{ margin: 0, fontSize: 11, lineHeight: 1.7 }}>এটি চালু করলে নতুন active product তৈরি হওয়ার পর যত platform ID configure করা আছে সেখানে publish করার চেষ্টা হবে। Editing বা inactive product-এ auto-post হবে না। App-এর অনুমতি ও account linking Meta Business/Developer থেকে configure করতে হবে।</p>
      </SettingsSection>
      <SettingsSection title="🔍 ডিফল্ট SEO" active={section === "seo"}>
        <Field label={`Title (${s.seo.title.length}/70)`}><input maxLength={70} value={s.seo.title} onChange={sub("seo", "title")} /></Field>
        <Field label={`Description (${s.seo.description.length}/170)`}><textarea rows={2} maxLength={170} value={s.seo.description} onChange={sub("seo", "description")} /></Field>
        <div className="row2"><Field label="Keywords"><input value={s.seo.keywords} onChange={sub("seo", "keywords")} /></Field><Field label="OG Image URL"><input value={s.seo.ogImage} onChange={sub("seo", "ogImage")} /></Field></div>
      </SettingsSection>
      <SettingsSection title="📄 পেজ-ভিত্তিক SEO" active={section === "seo"}>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>যেমন path: <code>/shop</code>, <code>/pages/about</code></p>
        {s.pageSeo.map((p: any, i: number) => <div key={i} className="row3" style={{ gridTemplateColumns: "1fr 1.2fr 2fr auto" }}>
          <input placeholder="/path" value={p.path} onChange={(e) => setS({ ...s, pageSeo: s.pageSeo.map((x: any, j: number) => (j === i ? { ...x, path: e.target.value } : x)) })} style={{ background: "#060d1e", color: "#fff", border: "1px solid #263f64", borderRadius: 10, padding: 10 }} />
          <input placeholder="Title" maxLength={70} value={p.title} onChange={(e) => setS({ ...s, pageSeo: s.pageSeo.map((x: any, j: number) => (j === i ? { ...x, title: e.target.value } : x)) })} style={{ background: "#060d1e", color: "#fff", border: "1px solid #263f64", borderRadius: 10, padding: 10 }} />
          <input placeholder="Description" maxLength={170} value={p.description} onChange={(e) => setS({ ...s, pageSeo: s.pageSeo.map((x: any, j: number) => (j === i ? { ...x, description: e.target.value } : x)) })} style={{ background: "#060d1e", color: "#fff", border: "1px solid #263f64", borderRadius: 10, padding: 10 }} />
          <button type="button" className="small-btn danger" onClick={() => setS({ ...s, pageSeo: s.pageSeo.filter((_: any, j: number) => j !== i) })}>×</button></div>)}
        <button type="button" className="small-btn" onClick={() => setS({ ...s, pageSeo: [...s.pageSeo, { path: "", title: "", description: "" }] })}>+ পেজ যোগ</button>
      </SettingsSection>
      <button className="btn" onClick={save} disabled={busy}>{busy ? "সেভ হচ্ছে…" : "সব সেটিংস সেভ করুন"}</button>
    </div>
  );
}
