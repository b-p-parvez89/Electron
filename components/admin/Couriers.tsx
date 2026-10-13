"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Badge, Field, Modal, useToast } from "./ui";

const TYPES: Record<string, string> = { steadfast: "Steadfast", pathao: "Pathao", custom: "Custom REST API", manual: "Manual (API ছাড়া)" };
const SECRETS: Record<string, [string, string][]> = {
  steadfast: [["apiKey", "API Key"], ["secretKey", "Secret Key"], ["webhookSecret", "Webhook Secret (ঐচ্ছিক)"]],
  pathao: [["clientId", "Client ID"], ["clientSecret", "Client Secret"], ["username", "Merchant Email"], ["password", "Password"], ["webhookSecret", "Webhook Secret (ঐচ্ছিক)"]],
  custom: [["apiKey", "API Key / Token"], ["webhookSecret", "Webhook Secret (ঐচ্ছিক)"]],
  manual: []
};
const blank = () => ({ name: "", type: "steadfast", active: true, isDefault: false, sandbox: false, credentials: {} as any, config: {} as any });

export default function Couriers() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]); const [edit, setEdit] = useState<any>(null);
  const load = useCallback(async () => { try { setItems((await api("/api/admin/couriers")).items); } catch (e: any) { toast(e.message, true); } }, [toast]);
  useEffect(() => { load(); }, [load]);
  async function del(c: any) { if (!confirm(`"${c.name}" মুছবেন?`)) return; try { await api(`/api/admin/couriers/${c._id}`, "DELETE", {}); load(); } catch (e: any) { toast(e.message, true); } }
  return (
    <>
      <div className="notice info" style={{ marginBottom: 14 }}>যত খুশি কুরিয়ার সার্ভিস যোগ করুন। ক্রেডেনশিয়াল এনক্রিপ্টেড অবস্থায় ডাটাবেসে থাকে। অর্ডার পেজ থেকে সার্ভিস বেছে এক ক্লিকে বুকিং করুন।</div>
      <div className="toolbar"><button className="btn sm" onClick={() => setEdit(blank())}>+ কুরিয়ার যোগ করুন</button></div>
      <div className="panel table-wrap" style={{ padding: 0 }}><table className="table"><thead><tr><th>নাম</th><th>ধরন</th><th>স্ট্যাটাস</th><th>ডিফল্ট</th><th></th></tr></thead>
        <tbody>{items.map((c) => <tr key={c._id}><td><b>{c.name}</b></td><td>{TYPES[c.type]}{c.sandbox ? " (sandbox)" : ""}</td><td><Badge v={c.active ? "paid" : "unpaid"} /></td><td>{c.isDefault ? "✓" : ""}</td><td style={{ display: "flex", gap: 6 }}><button className="small-btn" onClick={() => setEdit({ ...c, config: c.config || {}, credentials: c.credentials || {} })}>এডিট</button><button className="small-btn danger" onClick={() => del(c)}>মুছুন</button></td></tr>)}{!items.length && <tr><td colSpan={5} className="empty">কোনো কুরিয়ার নেই</td></tr>}</tbody></table></div>
      {edit && <Form init={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}
function Form({ init, onClose, onSaved }: { init: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const [f, setF] = useState<any>(init); const [busy, setBusy] = useState(false);
  const cred = (k: string, v: string) => setF({ ...f, credentials: { ...f.credentials, [k]: v } });
  const cfg = (k: string, v: string) => setF({ ...f, config: { ...f.config, [k]: v } });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await api(f._id ? `/api/admin/couriers/${f._id}` : "/api/admin/couriers", f._id ? "PUT" : "POST", { name: f.name, type: f.type, active: f.active, isDefault: f.isDefault, sandbox: f.sandbox, config: f.config, credentials: f.credentials }); toast("সেভ হয়েছে"); onSaved(); } catch (er: any) { toast(er.message, true); }
    setBusy(false);
  }
  const hook = typeof window !== "undefined" && f._id ? `${location.origin}/api/courier/webhook/${f._id}` : "";
  const inp = { background: "#060d1e", color: "#fff", border: "1px solid #263f64", borderRadius: 10, padding: 12, width: "100%" } as const;
  return (
    <Modal title={f._id ? "কুরিয়ার এডিট" : "নতুন কুরিয়ার"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="row2"><Field label="নাম *"><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Steadfast / Pathao Dhaka …" /></Field>
          <Field label="ধরন"><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} disabled={!!f._id}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
        {SECRETS[f.type].length > 0 && <div className="row2">{SECRETS[f.type].map(([k, l]) => <Field key={k} label={l}><input type={/password|secret|key/i.test(k) ? "password" : "text"} style={inp} value={f.credentials[k] ?? ""} onChange={(e) => cred(k, e.target.value)} placeholder={f._id ? "অপরিবর্তিত রাখতে খালি রাখুন" : ""} autoComplete="off" /></Field>)}</div>}
        {f.type === "pathao" && <Field label="Store ID *"><input style={inp} value={f.config.storeId || ""} onChange={(e) => cfg("storeId", e.target.value)} /></Field>}
        {f.type === "custom" && <>
          <Field label="Book URL * (POST, https)"><input style={inp} value={f.config.bookUrl || ""} onChange={(e) => cfg("bookUrl", e.target.value)} placeholder="https://api.courier.com/v1/orders" /></Field>
          <Field label="Status URL ({id} ব্যবহার করুন)"><input style={inp} value={f.config.statusUrl || ""} onChange={(e) => cfg("statusUrl", e.target.value)} placeholder="https://api.courier.com/v1/orders/{id}" /></Field>
          <div className="row3"><Field label="Response: consignment id path"><input style={inp} value={f.config.idPath || ""} onChange={(e) => cfg("idPath", e.target.value)} placeholder="data.id" /></Field><Field label="Tracking code path"><input style={inp} value={f.config.trackingPath || ""} onChange={(e) => cfg("trackingPath", e.target.value)} placeholder="data.tracking_code" /></Field><Field label="Status path"><input style={inp} value={f.config.statusPath || ""} onChange={(e) => cfg("statusPath", e.target.value)} placeholder="data.status" /></Field></div>
          <div className="row3"><Field label="Tracking page URL ({code})"><input style={inp} value={f.config.trackingUrl || ""} onChange={(e) => cfg("trackingUrl", e.target.value)} /></Field><Field label="Auth ধরন"><select value={f.config.authScheme || "bearer"} onChange={(e) => cfg("authScheme", e.target.value)}><option value="bearer">Authorization: Bearer</option><option value="header">Custom header</option></select></Field><Field label="Header নাম"><input style={inp} value={f.config.authHeader || ""} onChange={(e) => cfg("authHeader", e.target.value)} placeholder="X-API-Key" /></Field></div>
        </>}
        {f.type === "pathao" && <label className="chk"><input type="checkbox" checked={f.sandbox} onChange={(e) => setF({ ...f, sandbox: e.target.checked })} /> Sandbox মোড</label>}
        <div style={{ display: "flex", gap: 20 }}><label className="chk"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> সক্রিয়</label><label className="chk"><input type="checkbox" checked={f.isDefault} onChange={(e) => setF({ ...f, isDefault: e.target.checked })} /> ডিফল্ট কুরিয়ার</label></div>
        {hook && f.type !== "manual" && <div className="notice info" style={{ wordBreak: "break-all" }}>Webhook URL (কুরিয়ার পোর্টালে বসান): <b>{hook}</b><br />Header: <code>Authorization: Bearer &lt;Webhook Secret&gt;</code></div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" className="btn secondary sm" onClick={onClose}>বাতিল</button><button className="btn sm" disabled={busy}>সেভ</button></div>
      </form>
    </Modal>
  );
}
