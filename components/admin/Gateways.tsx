"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Badge, Field, Modal, useToast } from "./ui";

const TYPES: Record<string, string> = { cod: "ক্যাশ অন ডেলিভারি", sslcommerz: "SSLCommerz (অনলাইন)", manual: "ম্যানুয়াল (bKash/Nagad/Rocket Send Money)" };
const blank = () => ({ key: "", name: "", type: "manual", active: true, sandbox: true, sortOrder: 10, instructions: "", accountNumber: "", logo: "", credentials: {} as any });

export default function Gateways() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]); const [edit, setEdit] = useState<any>(null);
  const load = useCallback(async () => { try { setItems((await api("/api/admin/gateways")).items); } catch (e: any) { toast(e.message, true); } }, [toast]);
  useEffect(() => { load(); }, [load]);
  async function del(g: any) { if (!confirm(`"${g.name}" মুছবেন?`)) return; try { await api(`/api/admin/gateways/${g._id}`, "DELETE", {}); load(); } catch (e: any) { toast(e.message, true); } }
  return (
    <>
      <div className="notice info" style={{ marginBottom: 14 }}>COD, SSLCommerz (একাধিক অ্যাকাউন্ট/স্টোর) এবং bKash/Nagad/Rocket-এর মতো ম্যানুয়াল পেমেন্ট যত খুশি যোগ করুন। ডেভেলপমেন্টে SSLCommerz <b>Sandbox</b> মোড চালু রাখুন; লাইভ করার আগে মার্চেন্ট অ্যাপ্রুভাল নিন।</div>
      <div className="toolbar"><button className="btn sm" onClick={() => setEdit(blank())}>+ পেমেন্ট মাধ্যম যোগ করুন</button></div>
      <div className="panel table-wrap" style={{ padding: 0 }}><table className="table"><thead><tr><th>নাম</th><th>Key</th><th>ধরন</th><th>মোড</th><th>স্ট্যাটাস</th><th></th></tr></thead>
        <tbody>{items.map((g) => <tr key={g._id}><td><b>{g.name}</b></td><td>{g.key}</td><td>{TYPES[g.type]}</td><td>{g.type === "sslcommerz" ? (g.sandbox ? "Sandbox" : "LIVE") : "—"}</td><td><Badge v={g.active ? "paid" : "unpaid"} /></td><td style={{ display: "flex", gap: 6 }}><button className="small-btn" onClick={() => setEdit({ ...g, credentials: g.credentials || {} })}>এডিট</button><button className="small-btn danger" onClick={() => del(g)}>মুছুন</button></td></tr>)}{!items.length && <tr><td colSpan={6} className="empty">কোনো পেমেন্ট মাধ্যম নেই — COD যোগ করুন</td></tr>}</tbody></table></div>
      {edit && <Form init={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}
function Form({ init, onClose, onSaved }: { init: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const [f, setF] = useState<any>(init); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const body: any = { key: f.key || undefined, name: f.name, type: f.type, active: f.active, sandbox: f.sandbox, sortOrder: Number(f.sortOrder) || 0, instructions: f.instructions, accountNumber: f.accountNumber, logo: f.logo, credentials: f.type === "sslcommerz" ? f.credentials : {} };
    if (!f._id) body.key = (f.key || f.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try { await api(f._id ? `/api/admin/gateways/${f._id}` : "/api/admin/gateways", f._id ? "PUT" : "POST", body); toast("সেভ হয়েছে"); onSaved(); } catch (er: any) { toast(er.message, true); }
    setBusy(false);
  }
  return (
    <Modal title={f._id ? "পেমেন্ট মাধ্যম এডিট" : "নতুন পেমেন্ট মাধ্যম"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="row2"><Field label="নাম (চেকআউটে দেখাবে) *"><input required value={f.name} onChange={set("name")} /></Field><Field label="ধরন"><select value={f.type} onChange={set("type")} disabled={!!f._id}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
        <div className="row2"><Field label="Key (ইউনিক, ইংরেজি)" hint="খালি রাখলে নাম থেকে অটো"><input value={f.key} onChange={set("key")} disabled={!!f._id} /></Field><Field label="ক্রম"><input type="number" value={f.sortOrder} onChange={set("sortOrder")} /></Field></div>
        {f.type === "sslcommerz" && <>
          <div className="row2"><Field label="Store ID"><input autoComplete="off" value={f.credentials.storeId ?? ""} onChange={(e) => setF({ ...f, credentials: { ...f.credentials, storeId: e.target.value } })} placeholder={f._id ? "অপরিবর্তিত রাখতে খালি রাখুন" : ""} /></Field><Field label="Store Password"><input type="password" autoComplete="new-password" value={f.credentials.storePassword ?? ""} onChange={(e) => setF({ ...f, credentials: { ...f.credentials, storePassword: e.target.value } })} placeholder={f._id ? "অপরিবর্তিত রাখতে খালি রাখুন" : ""} /></Field></div>
          <label className="chk"><input type="checkbox" checked={f.sandbox} onChange={set("sandbox")} /> Sandbox (টেস্ট) মোড — লাইভ করতে টিক তুলে দিন</label>
          <div className="notice">SSLCommerz মার্চেন্ট প্যানেলে IPN URL দিন: <b>{typeof window !== "undefined" ? location.origin : ""}/api/payments/sslcommerz/ipn</b></div></>}
        {f.type === "manual" && <><Field label="অ্যাকাউন্ট নম্বর"><input value={f.accountNumber} onChange={set("accountNumber")} placeholder="01XXXXXXXXX (Personal)" /></Field><Field label="নির্দেশনা (চেকআউটে দেখাবে)"><textarea rows={2} maxLength={600} value={f.instructions} onChange={set("instructions")} placeholder="Send Money করে TrxID নিচে দিন।" /></Field></>}
        <label className="chk"><input type="checkbox" checked={f.active} onChange={set("active")} /> সক্রিয়</label>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" className="btn secondary sm" onClick={onClose}>বাতিল</button><button className="btn sm" disabled={busy}>সেভ</button></div>
      </form>
    </Modal>
  );
}
