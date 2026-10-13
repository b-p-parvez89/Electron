"use client";
import { useCallback, useEffect, useState } from "react";
import { api, dt, Field, Modal, useToast } from "./ui";

export default function Inventory() {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]); const [hist, setHist] = useState<any[] | null>(null); const [q, setQ] = useState(""); const [only, setOnly] = useState("");
  const [adj, setAdj] = useState<any>(null);
  const load = useCallback(async () => { try { setRows((await api("/api/admin/inventory")).items); } catch (e: any) { toast(e.message, true); } }, [toast]);
  useEffect(() => { load(); }, [load]);
  const vis = rows.filter((r) => (!q || (r.name + r.variantName + r.sku).toLowerCase().includes(q.toLowerCase())) && (only === "low" ? r.stock > 0 && r.stock <= r.threshold : only === "out" ? r.stock <= 0 : true));
  async function showHist() { try { setHist((await api("/api/admin/inventory?history=1")).items); } catch (e: any) { toast(e.message, true); } }
  return (
    <>
      <div className="toolbar"><input placeholder="খুঁজুন…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={only} onChange={(e) => setOnly(e.target.value)}><option value="">সব</option><option value="low">লো স্টক</option><option value="out">স্টক আউট</option></select>
        <button className="small-btn" onClick={showHist}>স্টক মুভমেন্ট হিস্ট্রি</button></div>
      <div className="panel table-wrap" style={{ padding: 0 }}><table className="table"><thead><tr><th>পণ্য</th><th>SKU</th><th>স্টক</th><th>অবস্থা</th><th></th></tr></thead>
        <tbody>{vis.map((r) => <tr key={r.productId + (r.variantId || "")}><td><b>{r.name}</b>{r.variantName && <div className="muted">{r.variantName}</div>}</td><td>{r.sku || "—"}</td><td><b>{r.stock}</b></td>
          <td>{r.stock <= 0 ? <span className="status s-failed">স্টক আউট</span> : r.stock <= r.threshold ? <span className="status s-pending">লো স্টক</span> : <span className="status s-paid">ঠিক আছে</span>}</td>
          <td><button className="small-btn" onClick={() => setAdj({ ...r, mode: "add", quantity: "", reason: "" })}>স্টক পরিবর্তন</button></td></tr>)}{!vis.length && <tr><td colSpan={5} className="empty">কিছু নেই</td></tr>}</tbody></table></div>
      {adj && <Modal title={`স্টক: ${adj.name}${adj.variantName ? " — " + adj.variantName : ""}`} onClose={() => setAdj(null)}>
        <form className="form" onSubmit={async (e) => { e.preventDefault(); try { await api("/api/admin/inventory", "POST", { productId: adj.productId, variantId: adj.variantId, mode: adj.mode, quantity: Number(adj.quantity), reason: adj.reason }); toast("স্টক আপডেট হয়েছে"); setAdj(null); load(); } catch (er: any) { toast(er.message, true); } }}>
          <p className="muted" style={{ margin: 0 }}>বর্তমান স্টক: <b>{adj.stock}</b></p>
          <div className="row2"><Field label="ধরন"><select value={adj.mode} onChange={(e) => setAdj({ ...adj, mode: e.target.value })}><option value="add">যোগ / বিয়োগ (+/−)</option><option value="set">নির্দিষ্ট সংখ্যায় সেট করুন</option></select></Field><Field label={adj.mode === "add" ? "পরিমাণ (বিয়োগে − দিন)" : "নতুন স্টক"}><input required type="number" value={adj.quantity} onChange={(e) => setAdj({ ...adj, quantity: e.target.value })} /></Field></div>
          <Field label="কারণ"><input value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} placeholder="restock / damaged / stock count" /></Field>
          <button className="btn sm">আপডেট</button></form></Modal>}
      {hist && <Modal title="স্টক মুভমেন্ট (সর্বশেষ ১০০)" onClose={() => setHist(null)} wide><div className="table-wrap"><table className="table"><thead><tr><th>সময়</th><th>পণ্য</th><th>পরিবর্তন</th><th>কারণ</th><th>অর্ডার/ইউজার</th></tr></thead><tbody>{hist.map((h) => <tr key={h._id}><td>{dt(h.createdAt)}</td><td>{h.product?.name || "—"}</td><td style={{ color: h.delta < 0 ? "#ff9bb0" : "#7fffc4" }}>{h.delta > 0 ? "+" : ""}{h.delta}</td><td>{h.reason}</td><td>{h.orderNumber || h.by || ""}</td></tr>)}</tbody></table></div></Modal>}
    </>
  );
}
