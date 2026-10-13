"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Badge, dt, Field, Modal, useToast } from "./ui";

const blank = () => ({ code: "", description: "", type: "percent", value: 10, minOrder: 0, maxDiscount: 0, usageLimit: 0, startsAt: "", endsAt: "", active: true });
const dloc = (d?: string) => (d ? new Date(d).toISOString().slice(0, 16) : "");

export default function Coupons() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]); const [edit, setEdit] = useState<any>(null);
  const load = useCallback(async () => { try { setItems((await api("/api/admin/coupons")).items); } catch (e: any) { toast(e.message, true); } }, [toast]);
  useEffect(() => { load(); }, [load]);
  async function del(c: any) { if (!confirm(`"${c.code}" মুছবেন?`)) return; try { await api(`/api/admin/coupons/${c._id}`, "DELETE", {}); load(); } catch (e: any) { toast(e.message, true); } }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const b = { code: edit.code.trim().toUpperCase(), description: edit.description, type: edit.type, value: Number(edit.value) || 0, minOrder: Number(edit.minOrder) || 0, maxDiscount: Number(edit.maxDiscount) || 0, usageLimit: Number(edit.usageLimit) || 0, startsAt: edit.startsAt ? new Date(edit.startsAt) : null, endsAt: edit.endsAt ? new Date(edit.endsAt) : null, active: edit.active };
    try { await api(edit._id ? `/api/admin/coupons/${edit._id}` : "/api/admin/coupons", edit._id ? "PUT" : "POST", b); toast("সেভ হয়েছে"); setEdit(null); load(); } catch (er: any) { toast(er.message, true); }
  }
  const set = (k: string) => (e: any) => setEdit({ ...edit, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  return (
    <>
      <div className="toolbar"><button className="btn sm" onClick={() => setEdit(blank())}>+ নতুন কুপন</button></div>
      <div className="panel table-wrap" style={{ padding: 0 }}><table className="table"><thead><tr><th>কোড</th><th>ছাড়</th><th>ন্যূনতম অর্ডার</th><th>ব্যবহার</th><th>মেয়াদ</th><th>স্ট্যাটাস</th><th></th></tr></thead>
        <tbody>{items.map((c) => <tr key={c._id}><td><b>{c.code}</b><div className="muted">{c.description}</div></td><td>{c.type === "percent" ? `${c.value}%${c.maxDiscount ? ` (সর্বোচ্চ ৳${c.maxDiscount})` : ""}` : c.type === "fixed" ? `৳${c.value}` : "ফ্রি ডেলিভারি"}</td><td>৳{c.minOrder}</td><td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td><td>{c.endsAt ? dt(c.endsAt) : "—"}</td><td><Badge v={c.active ? "paid" : "unpaid"} /></td><td style={{ display: "flex", gap: 6 }}><button className="small-btn" onClick={() => setEdit({ ...c, startsAt: dloc(c.startsAt), endsAt: dloc(c.endsAt) })}>এডিট</button><button className="small-btn danger" onClick={() => del(c)}>মুছুন</button></td></tr>)}{!items.length && <tr><td colSpan={7} className="empty">কোনো কুপন নেই</td></tr>}</tbody></table></div>
      {edit && <Modal title={edit._id ? "কুপন এডিট" : "নতুন কুপন"} onClose={() => setEdit(null)}><form className="form" onSubmit={save}>
        <div className="row2"><Field label="কোড *"><input required value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} /></Field><Field label="ধরন"><select value={edit.type} onChange={set("type")}><option value="percent">শতকরা (%)</option><option value="fixed">নির্দিষ্ট টাকা</option><option value="free_shipping">ফ্রি ডেলিভারি</option></select></Field></div>
        <Field label="বিবরণ"><input value={edit.description} onChange={set("description")} /></Field>
        <div className="row4"><Field label="মান"><input type="number" min="0" value={edit.value} onChange={set("value")} disabled={edit.type === "free_shipping"} /></Field><Field label="ন্যূনতম অর্ডার"><input type="number" min="0" value={edit.minOrder} onChange={set("minOrder")} /></Field><Field label="সর্বোচ্চ ছাড় (০=সীমাহীন)"><input type="number" min="0" value={edit.maxDiscount} onChange={set("maxDiscount")} /></Field><Field label="ব্যবহার সীমা (০=সীমাহীন)"><input type="number" min="0" value={edit.usageLimit} onChange={set("usageLimit")} /></Field></div>
        <div className="row2"><Field label="শুরু"><input type="datetime-local" value={edit.startsAt} onChange={set("startsAt")} /></Field><Field label="শেষ"><input type="datetime-local" value={edit.endsAt} onChange={set("endsAt")} /></Field></div>
        <label className="chk"><input type="checkbox" checked={edit.active} onChange={set("active")} /> সক্রিয়</label>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" className="btn secondary sm" onClick={() => setEdit(null)}>বাতিল</button><button className="btn sm">সেভ</button></div></form></Modal>}
    </>
  );
}
