"use client";
import { useCallback, useEffect, useState } from "react";
import { api, dt, taka, useToast } from "./ui";

const ST = ["incomplete", "contacted", "recovered", "ignored"];
export default function Incomplete() {
  const toast = useToast();
  const [d, setD] = useState<any>({ items: [], counts: [] }); const [st, setSt] = useState("incomplete");
  const load = useCallback(async () => { try { setD(await api("/api/admin/incomplete" + (st ? `?status=${st}` : ""))); } catch (e: any) { toast(e.message, true); } }, [st, toast]);
  useEffect(() => { load(); }, [load]);
  const cnt = (s: string) => d.counts.find((c: any) => c._id === s);
  async function patch(id: string, body: any) { try { await api(`/api/admin/incomplete/${id}`, "PATCH", body); load(); } catch (e: any) { toast(e.message, true); } }
  async function del(id: string) { if (!confirm("মুছবেন?")) return; try { await api(`/api/admin/incomplete/${id}`, "DELETE", {}); load(); } catch (e: any) { toast(e.message, true); } }
  return (
    <>
      <div className="notice info" style={{ marginBottom: 14 }}>চেকআউট ফর্মে বৈধ মোবাইল নম্বর দেওয়ার পর অর্ডার সম্পন্ন না করলে এখানে জমা হয়। ফোন/WhatsApp করে অর্ডার কনফার্ম করুন। অর্ডার হয়ে গেলে স্বয়ংক্রিয়ভাবে "recovered" হয়।</div>
      <div className="tabs">{ST.map((s) => <button key={s} className={st === s ? "on" : ""} onClick={() => setSt(s)}>{s} ({cnt(s)?.n || 0}{cnt(s) ? ` · ${taka(cnt(s).value)}` : ""})</button>)}</div>
      <div className="panel table-wrap" style={{ padding: 0 }}><table className="table"><thead><tr><th>কাস্টমার</th><th>কার্ট</th><th>মোট</th><th>শেষ দেখা</th><th>নোট</th><th>অ্যাকশন</th></tr></thead>
        <tbody>{d.items.map((i: any) => (
          <tr key={i._id}><td><b>{i.name || "—"}</b><div className="muted">{i.phone}</div><div className="muted">{[i.address, i.city].filter(Boolean).join(", ")}</div></td>
            <td style={{ whiteSpace: "normal", maxWidth: 260 }}>{i.items.map((x: any) => `${x.name}${x.variantName ? ` (${x.variantName})` : ""} ×${x.quantity}`).join(", ")}</td><td>{taka(i.total)}</td><td>{dt(i.lastSeenAt)}</td>
            <td><input defaultValue={i.note} placeholder="নোট…" onBlur={(e) => e.target.value !== i.note && patch(i._id, { note: e.target.value })} style={{ background: "#060d1e", color: "#fff", border: "1px solid #263f64", borderRadius: 8, padding: 7, width: 150 }} /></td>
            <td><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><a className="small-btn" href={`tel:${i.phone}`}>📞</a><a className="small-btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/88${i.phone}`}>💬</a>
              <select value={i.status} onChange={(e) => patch(i._id, { status: e.target.value })} style={{ background: "#0b1a34", color: "#fff", border: "1px solid #2b4d79", borderRadius: 20, padding: 6, fontSize: 11 }}>{ST.map((s) => <option key={s}>{s}</option>)}</select><button className="small-btn danger" onClick={() => del(i._id)}>×</button></div></td></tr>
        ))}{!d.items.length && <tr><td colSpan={6} className="empty">কিছু নেই</td></tr>}</tbody></table></div>
    </>
  );
}
