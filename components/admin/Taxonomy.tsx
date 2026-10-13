"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Badge, Field, Modal, uploadFile, useToast } from "./ui";

export default function Taxonomy() {
  const toast = useToast();
  const [kind, setKind] = useState<"categories" | "brands">("categories");
  const [items, setItems] = useState<any[]>([]); const [all, setAll] = useState<any[]>([]); const [edit, setEdit] = useState<any>(null);
  const load = useCallback(async () => { try { setItems((await api(`/api/admin/${kind}`)).items); if (kind === "categories") setAll((await api("/api/admin/categories")).items); } catch (e: any) { toast(e.message, true); } }, [kind, toast]);
  useEffect(() => { load(); }, [load]);
  async function del(it: any) { if (!confirm(`"${it.name}" মুছবেন?`)) return; try { await api(`/api/admin/${kind}/${it._id}`, "DELETE", {}); toast("মুছে ফেলা হয়েছে"); load(); } catch (e: any) { toast(e.message, true); } }
  const nameOf = (id?: string) => all.find((c) => c._id === id)?.name || "—";
  return (
    <>
      <div className="tabs"><button className={kind === "categories" ? "on" : ""} onClick={() => setKind("categories")}>ক্যাটাগরি / সাব-ক্যাটাগরি</button><button className={kind === "brands" ? "on" : ""} onClick={() => setKind("brands")}>ব্র্যান্ড</button></div>
      <div className="toolbar"><button className="btn sm" onClick={() => setEdit({ name: "", slug: "", parent: "", description: "", image: "", icon: "", sortOrder: 0, logo: "", active: true, seoTitle: "", seoDescription: "" })}>+ নতুন {kind === "categories" ? "ক্যাটাগরি" : "ব্র্যান্ড"}</button></div>
      <div className="panel table-wrap" style={{ padding: 0 }}><table className="table"><thead><tr><th>নাম</th>{kind === "categories" && <th>প্যারেন্ট</th>}<th>Slug</th><th>স্ট্যাটাস</th><th></th></tr></thead>
        <tbody>{items.map((it) => <tr key={it._id}><td><b>{it.icon} {it.name}</b></td>{kind === "categories" && <td>{it.parent ? nameOf(it.parent) : "—"}</td>}<td>{it.slug}</td><td><Badge v={it.active ? "paid" : "unpaid"} /></td><td style={{ display: "flex", gap: 6 }}><button className="small-btn" onClick={() => setEdit({ ...it, parent: it.parent || "" })}>এডিট</button><button className="small-btn danger" onClick={() => del(it)}>মুছুন</button></td></tr>)}{!items.length && <tr><td colSpan={5} className="empty">কিছু নেই</td></tr>}</tbody></table></div>
      {edit && <Form kind={kind} init={edit} cats={all} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}
function Form({ kind, init, cats, onClose, onSaved }: { kind: string; init: any; cats: any[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const [f, setF] = useState<any>(init); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const isCat = kind === "categories"; const imgKey = isCat ? "image" : "logo";
  async function up(file?: File) { if (!file) return; try { setF({ ...f, [imgKey]: await uploadFile(file) }); } catch (e: any) { toast(e.message, true); } }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const body: any = isCat ? { name: f.name, slug: f.slug || undefined, parent: f.parent || null, description: f.description, image: f.image, icon: f.icon, sortOrder: Number(f.sortOrder) || 0, active: f.active, seoTitle: f.seoTitle, seoDescription: f.seoDescription }
      : { name: f.name, slug: f.slug || undefined, logo: f.logo, description: f.description, active: f.active, seoTitle: f.seoTitle, seoDescription: f.seoDescription };
    try { await api(f._id ? `/api/admin/${kind}/${f._id}` : `/api/admin/${kind}`, f._id ? "PUT" : "POST", body); toast("সেভ হয়েছে"); onSaved(); } catch (er: any) { toast(er.message, true); }
    setBusy(false);
  }
  return (
    <Modal title={f._id ? "এডিট" : "নতুন"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="row2"><Field label="নাম *"><input required value={f.name} onChange={set("name")} /></Field><Field label="Slug (খালি রাখলে অটো)"><input value={f.slug} onChange={set("slug")} /></Field></div>
        {isCat && <div className="row3"><Field label="প্যারেন্ট (সাব-ক্যাটাগরির জন্য)"><select value={f.parent} onChange={set("parent")}><option value="">— টপ লেভেল —</option>{cats.filter((c) => !c.parent && c._id !== f._id).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field><Field label="আইকন (ইমোজি)"><input value={f.icon} onChange={set("icon")} maxLength={4} /></Field><Field label="ক্রম"><input type="number" value={f.sortOrder} onChange={set("sortOrder")} /></Field></div>}
        <Field label="বিবরণ"><input value={f.description} onChange={set("description")} maxLength={500} /></Field>
        <Field label={isCat ? "ছবি" : "লোগো"}><div style={{ display: "flex", gap: 8 }}><input type="file" accept="image/*" onChange={(e) => up(e.target.files?.[0])} style={{ flex: 1 }} /><input placeholder="অথবা URL" value={f[imgKey]} onChange={set(imgKey)} style={{ flex: 2 }} /></div>{f[imgKey] && <img src={f[imgKey]} alt="" width={64} height={64} style={{ objectFit: "contain", marginTop: 6 }} />}</Field>
        <div className="row2"><Field label="SEO Title"><input maxLength={70} value={f.seoTitle || ""} onChange={set("seoTitle")} /></Field><Field label="SEO Description"><input maxLength={170} value={f.seoDescription || ""} onChange={set("seoDescription")} /></Field></div>
        <label className="chk"><input type="checkbox" checked={f.active} onChange={set("active")} /> সক্রিয়</label>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" className="btn secondary sm" onClick={onClose}>বাতিল</button><button className="btn sm" disabled={busy}>সেভ</button></div>
      </form>
    </Modal>
  );
}
