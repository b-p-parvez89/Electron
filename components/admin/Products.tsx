"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Badge, Field, ImageList, Modal, Pager, taka, uploadFile, useToast } from "./ui";

const blank = () => ({ name: "", slug: "", sku: "", shortDescription: "", description: "", price: "", compareAtPrice: "", stock: "0", lowStockThreshold: "5", category: "", subcategory: "", brand: "",
  variants: [] as any[], images: [] as string[], spinImages: [] as string[], model3dUrl: "", specs: [] as { key: string; value: string }[], tagsText: "", featured: false, active: true, seoTitle: "", seoDescription: "" });

export default function Products() {
  const toast = useToast();
  const [d, setD] = useState<any>({ items: [], page: 1, pages: 1, total: 0 });
  const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const [cats, setCats] = useState<any[]>([]); const [brands, setBrands] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [share, setShare] = useState<any>(null);
  const load = useCallback(async () => { try { setD(await api(`/api/admin/products?q=${encodeURIComponent(q)}&page=${page}`)); } catch (e: any) { toast(e.message, true); } }, [q, page, toast]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { Promise.all([api("/api/admin/categories"), api("/api/admin/brands")]).then(([c, b]) => { setCats(c.items); setBrands(b.items); }).catch(() => {}); }, []);

  async function openEdit(id?: string) {
    if (!id) { setEdit({ ...blank(), category: cats.find((c) => !c.parent)?._id || "" }); return; }
    try {
      const { item: p } = await api(`/api/admin/products/${id}`);
      setEdit({ ...blank(), ...p, _id: p._id, price: String(p.price), compareAtPrice: p.compareAtPrice ?? "", stock: String(p.stock), lowStockThreshold: String(p.lowStockThreshold ?? 5), category: p.category || "", subcategory: p.subcategory || "", brand: p.brand || "",
        variants: (p.variants || []).map((v: any) => ({ ...v, price: String(v.price), compareAtPrice: v.compareAtPrice ?? "", stock: String(v.stock) })), specs: p.specs || [], tagsText: (p.tags || []).join(", "), sku: p.sku || "" });
    } catch (e: any) { toast(e.message, true); }
  }
  async function del(p: any) {
    if (!confirm(`"${p.name}" মুছবেন? (অর্ডারে থাকা পণ্য আর্কাইভ হবে)`)) return;
    try { const r = await api(`/api/admin/products/${p._id}`, "DELETE", {}); toast(r.archived ? "আর্কাইভ করা হয়েছে" : "মুছে ফেলা হয়েছে"); load(); } catch (e: any) { toast(e.message, true); }
  }
  return (
    <>
      <div className="toolbar"><input placeholder="নাম বা SKU দিয়ে খুঁজুন" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ minWidth: 240 }} /><button className="btn sm" onClick={() => openEdit()} disabled={!cats.length}>+ নতুন পণ্য</button>{!cats.length && <small className="muted">আগে একটি ক্যাটাগরি তৈরি করুন</small>}<span className="muted" style={{ fontSize: 12 }}>মোট {d.total}টি</span></div>
      <div className="panel table-wrap" style={{ padding: 0 }}><table className="table"><thead><tr><th></th><th>পণ্য</th><th>ক্যাটাগরি</th><th>দাম</th><th>স্টক</th><th>স্ট্যাটাস</th><th></th></tr></thead>
        <tbody>{d.items.map((p: any) => {
          const stock = p.variants?.length ? p.variants.reduce((a: number, v: any) => a + v.stock, 0) : p.stock;
          return <tr key={p._id}><td>{p.images?.[0] && <img src={p.images[0]} alt="" width={40} height={40} style={{ objectFit: "contain", background: "#081329", borderRadius: 6 }} />}</td>
            <td><b>{p.name}</b><div className="muted">{p.sku}{p.variants?.length ? ` · ${p.variants.length} ভ্যারিয়েন্ট` : ""}{p.spinImages?.length > 1 ? " · 360°" : ""}{p.model3dUrl ? " · 3D" : ""}</div></td>
            <td>{p.category?.name || "—"}</td><td>{taka(p.price)}</td><td style={{ color: stock <= 0 ? "#ff9bb0" : stock <= (p.lowStockThreshold ?? 5) ? "#ffd27a" : undefined }}>{stock}</td>
            <td><Badge v={p.active ? "paid" : "unpaid"} />{p.featured && <span className="status" style={{ marginLeft: 4 }}>featured</span>}</td>
            <td style={{ display: "flex", gap: 6 }}><button className="small-btn" onClick={() => openEdit(p._id)}>এডিট</button><button className="small-btn" onClick={() => setShare(p)} disabled={!p.active} title={!p.active ? "Inactive product publish করা যাবে না" : "Facebook/Instagram-এ পোস্ট করুন"}>📣 পোস্ট</button><button className="small-btn danger" onClick={() => del(p)}>মুছুন</button></td></tr>;
        })}{!d.items.length && <tr><td colSpan={7} className="empty">কোনো পণ্য নেই</td></tr>}</tbody></table></div>
      <Pager page={d.page} pages={d.pages} set={setPage} />
      {edit && <ProductForm init={edit} cats={cats} brands={brands} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {share && <SocialPostModal product={share} onClose={() => setShare(null)} />}
    </>
  );
}

function SocialPostModal({ product, onClose }: { product: any; onClose: () => void }) {
  const toast = useToast();
  const [facebook, setFacebook] = useState(true);
  const [instagram, setInstagram] = useState(true);
  const [caption, setCaption] = useState(`${product.name}${product.shortDescription ? `\n\n${product.shortDescription}` : ""}`);
  const [busy, setBusy] = useState(false);

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!facebook && !instagram) { toast("কমপক্ষে একটি platform বেছে নিন।", true); return; }
    setBusy(true);
    try {
      const response = await api<{ result: Record<string, { ok: boolean; error?: string }> }>(`/api/admin/products/${product._id}/social`, "POST", {
        platforms: [facebook && "facebook", instagram && "instagram"].filter(Boolean),
        caption
      });
      const outcomes = Object.entries(response.result);
      const succeeded = outcomes.filter(([, value]) => value.ok).map(([platform]) => platform);
      const failed = outcomes.filter(([, value]) => !value.ok);
      if (succeeded.length) toast(`পোস্ট হয়েছে: ${succeeded.join(", ")}`);
      if (failed.length) toast(failed.map(([platform, value]) => `${platform}: ${value.error}`).join(" · "), true);
      if (succeeded.includes("facebook")) setFacebook(false);
      if (succeeded.includes("instagram")) setInstagram(false);
      if (!failed.length) onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "সোশ্যাল পোস্ট করা যায়নি।", true);
    } finally {
      setBusy(false);
    }
  }

  return <Modal title={`${product.name} — সোশ্যাল পোস্ট`} onClose={onClose}>
    <form className="form" onSubmit={publish}>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>পোস্টের সঙ্গে পণ্যের বিস্তারিত পেজের লিংক যোগ হবে।</p>
      <label className="chk"><input type="checkbox" checked={facebook} onChange={(e) => setFacebook(e.target.checked)} /> Facebook Page</label>
      <label className="chk"><input type="checkbox" checked={instagram} onChange={(e) => setInstagram(e.target.checked)} /> Instagram Business/Creator</label>
      <Field label="Caption"><textarea rows={7} maxLength={2000} value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
      <button className="btn" disabled={busy}>{busy ? "পোস্ট হচ্ছে…" : "এখনই পোস্ট করুন"}</button>
      <small className="muted">Meta API credentials Admin → Settings → Facebook ও Instagram পোস্ট অংশে কনফিগার করুন।</small>
    </form>
  </Modal>;
}

function ProductForm({ init, cats, brands, onClose, onSaved }: { init: any; cats: any[]; brands: any[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [p, setP] = useState<any>(init); const [busy, setBusy] = useState(false); const [tab, setTab] = useState("basic");
  const set = (k: string) => (e: any) => setP((x: any) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const top = cats.filter((c) => !c.parent); const subs = cats.filter((c) => c.parent === p.category);
  const setVar = (i: number, k: string, v: any) => setP((x: any) => ({ ...x, variants: x.variants.map((r: any, j: number) => (j === i ? { ...r, [k]: v } : r)) }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const body = {
      name: p.name, slug: p.slug || undefined, sku: p.sku, shortDescription: p.shortDescription, description: p.description, price: p.price, compareAtPrice: p.compareAtPrice, stock: p.stock, lowStockThreshold: p.lowStockThreshold,
      category: p.category, subcategory: p.subcategory, brand: p.brand,
      variants: p.variants.map((v: any) => ({ _id: v._id, name: v.name, sku: v.sku || "", price: v.price, compareAtPrice: v.compareAtPrice, stock: v.stock, image: v.image || "" })),
      images: p.images, spinImages: p.spinImages, model3dUrl: p.model3dUrl, specs: p.specs.filter((s: any) => s.key && s.value), tags: p.tagsText.split(",").map((t: string) => t.trim()).filter(Boolean),
      featured: !!p.featured, active: !!p.active, seoTitle: p.seoTitle, seoDescription: p.seoDescription
    };
    try {
      const response = await api<{ socialPublish?: Record<string, { ok: boolean; error?: string }> }>(p._id ? `/api/admin/products/${p._id}` : "/api/admin/products", p._id ? "PUT" : "POST", body);
      if (response.socialPublish) {
        const outcomes = Object.entries(response.socialPublish);
        const posted = outcomes.filter(([, result]) => result.ok).map(([platform]) => platform);
        const failed = outcomes.filter(([, result]) => !result.ok);
        if (posted.length) toast(`পণ্য সেভ হয়েছে · সোশ্যাল পোস্ট: ${posted.join(", ")}`);
        else toast("পণ্য সেভ হয়েছে, তবে সোশ্যাল পোস্ট হয়নি। Settings ও Meta credentials দেখুন।", true);
        if (failed.length) toast(failed.map(([platform, result]) => `${platform}: ${result.error}`).join(" · "), true);
      } else {
        toast("সেভ হয়েছে");
      }
      onSaved();
    } catch (er: any) { toast(er.message, true); }
    setBusy(false);
  }
  async function glb(f?: File) { if (!f) return; try { toast("3D মডেল আপলোড হচ্ছে…"); const u = await uploadFile(f); setP((x: any) => ({ ...x, model3dUrl: u })); toast("আপলোড সম্পন্ন"); } catch (er: any) { toast(er.message + " — URL পেস্ট করুন", true); } }
  const T = ({ id, t }: { id: string; t: string }) => <button type="button" className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{t}</button>;
  return (
    <Modal title={p._id ? "পণ্য এডিট" : "নতুন পণ্য"} onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <div className="tabs"><T id="basic" t="বেসিক" /><T id="media" t="ছবি / 360° / 3D" /><T id="variants" t={`ভ্যারিয়েন্ট (${p.variants.length})`} /><T id="specs" t="স্পেক ও ট্যাগ" /><T id="seo" t="SEO" /></div>
        {tab === "basic" && <>
          <Field label="পণ্যের নাম *"><input required value={p.name} onChange={set("name")} /></Field>
          <div className="row2"><Field label="Slug (খালি রাখলে অটো)"><input value={p.slug} onChange={set("slug")} /></Field><Field label="SKU"><input value={p.sku} onChange={set("sku")} /></Field></div>
          <Field label="সংক্ষিপ্ত বিবরণ"><input maxLength={300} value={p.shortDescription} onChange={set("shortDescription")} /></Field>
          <Field label="বিস্তারিত বিবরণ *"><textarea required rows={5} value={p.description} onChange={set("description")} /></Field>
          <div className="row4"><Field label="দাম (৳) *"><input required type="number" min="0" value={p.price} onChange={set("price")} /></Field><Field label="আগের দাম (৳)"><input type="number" min="0" value={p.compareAtPrice} onChange={set("compareAtPrice")} /></Field><Field label="স্টক"><input type="number" min="0" value={p.stock} onChange={set("stock")} disabled={p.variants.length > 0} /></Field><Field label="লো-স্টক সীমা"><input type="number" min="0" value={p.lowStockThreshold} onChange={set("lowStockThreshold")} /></Field></div>
          {p.variants.length > 0 && <small className="muted">ভ্যারিয়েন্ট থাকলে স্টক ও দাম ভ্যারিয়েন্ট থেকে আসবে।</small>}
          <div className="row3">
            <Field label="ক্যাটাগরি *"><select required value={p.category} onChange={(e) => setP({ ...p, category: e.target.value, subcategory: "" })}><option value="">বাছুন</option>{top.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
            <Field label="সাব-ক্যাটাগরি"><select value={p.subcategory} onChange={set("subcategory")}><option value="">—</option>{subs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
            <Field label="ব্র্যান্ড"><select value={p.brand} onChange={set("brand")}><option value="">—</option>{brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select></Field>
          </div>
          <div style={{ display: "flex", gap: 20 }}><label className="chk"><input type="checkbox" checked={p.featured} onChange={set("featured")} /> ফিচারড (হোমপেজে দেখাবে)</label><label className="chk"><input type="checkbox" checked={p.active} onChange={set("active")} /> সক্রিয় (দোকানে দেখাবে)</label></div>
        </>}
        {tab === "media" && <>
          <ImageList label="প্রোডাক্ট ছবি" value={p.images} onChange={(v) => setP({ ...p, images: v })} hint="প্রথম ছবিটি কভার ছবি। তীর চিহ্নে ক্রম বদলান।" max={20} />
          <ImageList label="৩৬০° ফ্রেম (ঘুরানো ভিউ)" value={p.spinImages} onChange={(v) => setP({ ...p, spinImages: v })} hint="একই পণ্যের চারদিক থেকে ২০–৪০টি ছবি, ঘড়ির কাঁটার ক্রমে। কমপক্ষে ২টি দিলে ৩৬০° ভিউ চালু হবে।" max={72} />
          <Field label="3D মডেল (.glb / .gltf) — AR সাপোর্টসহ" hint="মডেল দিলে পণ্যের পাতায় ৩D ভিউ ও মোবাইলে AR বাটন দেখাবে।">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input type="file" accept=".glb,.gltf,model/gltf-binary" onChange={(e) => glb(e.target.files?.[0])} style={{ flex: 1 }} /><input placeholder="অথবা .glb URL" value={p.model3dUrl} onChange={set("model3dUrl")} style={{ flex: 2 }} /></div>
          </Field>
        </>}
        {tab === "variants" && <>
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>কালার/সাইজ/স্টোরেজ ইত্যাদি। প্রতিটির আলাদা দাম, স্টক ও ছবি দেওয়া যায়।</p>
          {p.variants.map((v: any, i: number) => (
            <div key={i} className="panel" style={{ padding: 12 }}>
              <div className="row4"><Field label="নাম"><input value={v.name} onChange={(e) => setVar(i, "name", e.target.value)} placeholder="ব্ল্যাক / 128GB" /></Field><Field label="SKU"><input value={v.sku || ""} onChange={(e) => setVar(i, "sku", e.target.value)} /></Field><Field label="দাম"><input type="number" min="0" value={v.price} onChange={(e) => setVar(i, "price", e.target.value)} /></Field><Field label="স্টক"><input type="number" min="0" value={v.stock} onChange={(e) => setVar(i, "stock", e.target.value)} /></Field></div>
              <div className="row2"><Field label="আগের দাম"><input type="number" min="0" value={v.compareAtPrice ?? ""} onChange={(e) => setVar(i, "compareAtPrice", e.target.value)} /></Field><Field label="ছবি URL (ঐচ্ছিক)"><input value={v.image || ""} onChange={(e) => setVar(i, "image", e.target.value)} /></Field></div>
              <button type="button" className="small-btn danger" onClick={() => setP({ ...p, variants: p.variants.filter((_: any, j: number) => j !== i) })}>ভ্যারিয়েন্ট সরান</button>
            </div>
          ))}
          <button type="button" className="small-btn" onClick={() => setP({ ...p, variants: [...p.variants, { name: "", sku: "", price: p.price || "0", compareAtPrice: "", stock: "0", image: "" }] })}>+ ভ্যারিয়েন্ট যোগ করুন</button>
        </>}
        {tab === "specs" && <>
          <h3 style={{ margin: 0, fontSize: 15 }}>স্পেসিফিকেশন</h3>
          {p.specs.map((s: any, i: number) => <div key={i} className="row2" style={{ gridTemplateColumns: "1fr 1.4fr auto" }}><input style={{ background: "#060d1e", color: "#fff", border: "1px solid #263f64", borderRadius: 10, padding: 10 }} placeholder="যেমন: ব্যাটারি" value={s.key} onChange={(e) => setP({ ...p, specs: p.specs.map((x: any, j: number) => (j === i ? { ...x, key: e.target.value } : x)) })} /><input style={{ background: "#060d1e", color: "#fff", border: "1px solid #263f64", borderRadius: 10, padding: 10 }} placeholder="যেমন: ৪০ ঘণ্টা" value={s.value} onChange={(e) => setP({ ...p, specs: p.specs.map((x: any, j: number) => (j === i ? { ...x, value: e.target.value } : x)) })} /><button type="button" className="small-btn danger" onClick={() => setP({ ...p, specs: p.specs.filter((_: any, j: number) => j !== i) })}>×</button></div>)}
          <button type="button" className="small-btn" onClick={() => setP({ ...p, specs: [...p.specs, { key: "", value: "" }] })}>+ স্পেক যোগ</button>
          <Field label="ট্যাগ (কমা দিয়ে আলাদা)" hint="সার্চে কাজে লাগে"><input value={p.tagsText} onChange={set("tagsText")} /></Field>
        </>}
        {tab === "seo" && <>
          <Field label={`SEO Title (${p.seoTitle.length}/70)`}><input maxLength={70} value={p.seoTitle} onChange={set("seoTitle")} /></Field>
          <Field label={`Meta Description (${p.seoDescription.length}/170)`}><textarea maxLength={170} rows={3} value={p.seoDescription} onChange={set("seoDescription")} /></Field>
          <div className="panel" style={{ background: "#08122a", padding: 14 }}><div style={{ color: "#8ab4ff", fontSize: 16 }}>{p.seoTitle || p.name || "পণ্যের শিরোনাম"}</div><div style={{ color: "#7fffc4", fontSize: 12 }}>/products/{p.slug || "slug"}</div><div className="muted" style={{ fontSize: 13 }}>{p.seoDescription || p.shortDescription || p.description.slice(0, 160)}</div></div>
        </>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" className="btn secondary sm" onClick={onClose}>বাতিল</button><button className="btn sm" disabled={busy}>{busy ? "সেভ হচ্ছে…" : "সেভ করুন"}</button></div>
      </form>
    </Modal>
  );
}
