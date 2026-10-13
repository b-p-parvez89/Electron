"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Badge, dt, Field, Modal, Pager, taka, useToast } from "./ui";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
const PAY = ["unpaid", "pending", "paid", "failed", "refunded"];

export default function Orders() {
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], counts: {}, pages: 1, page: 1, total: 0 });
  const [f, setF] = useState({ status: "", payment: "", q: "", page: 1 });
  const [open, setOpen] = useState<any>(null);
  const load = useCallback(async () => {
    const p = new URLSearchParams(); if (f.status) p.set("status", f.status); if (f.payment) p.set("payment", f.payment); if (f.q) p.set("q", f.q); p.set("page", String(f.page));
    try { setData(await api("/api/admin/orders?" + p)); } catch (e: any) { toast(e.message, true); }
  }, [f, toast]);
  useEffect(() => { load(); }, [load]);
  const total = Object.values<number>(data.counts).reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="tabs">
        <button className={!f.status ? "on" : ""} onClick={() => setF({ ...f, status: "", page: 1 })}>সব ({total})</button>
        {STATUSES.map((s) => <button key={s} className={f.status === s ? "on" : ""} onClick={() => setF({ ...f, status: s, page: 1 })}>{s} ({data.counts[s] || 0})</button>)}
      </div>
      <div className="toolbar">
        <input placeholder="অর্ডার নং / ফোন / নাম" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} />
        <select value={f.payment} onChange={(e) => setF({ ...f, payment: e.target.value, page: 1 })}><option value="">সব পেমেন্ট</option>{PAY.map((p) => <option key={p}>{p}</option>)}</select>
        <button className="small-btn" onClick={load}>রিফ্রেশ</button>
      </div>
      <div className="panel table-wrap" style={{ padding: 0 }}><table className="table"><thead><tr><th>অর্ডার</th><th>কাস্টমার</th><th>মোট</th><th>পেমেন্ট</th><th>স্ট্যাটাস</th><th>কুরিয়ার</th><th>সময়</th><th></th></tr></thead>
        <tbody>{data.items.map((o: any) => (
          <tr key={o._id}><td><b>{o.orderNumber}</b></td><td>{o.customer.name}<div className="muted">{o.customer.phone}</div></td><td>{taka(o.total)}</td>
            <td>{o.paymentMethod}<div><Badge v={o.paymentStatus} /></div></td><td><Badge v={o.status} /></td><td>{o.courier?.provider || "—"}</td><td>{dt(o.createdAt)}</td>
            <td><button className="small-btn" onClick={() => setOpen(o._id)}>খুলুন</button></td></tr>
        ))}{!data.items.length && <tr><td colSpan={8} className="empty">কোনো অর্ডার নেই</td></tr>}</tbody></table></div>
      <Pager page={data.page} pages={data.pages} set={(n) => setF({ ...f, page: n })} />
      {open && <OrderModal id={open} onClose={() => { setOpen(null); load(); }} />}
    </>
  );
}

function OrderModal({ id, onClose }: { id: string; onClose: () => void }) {
  const toast = useToast();
  const [o, setO] = useState<any>(null); const [couriers, setCouriers] = useState<any[]>([]);
  const [pid, setPid] = useState(""); const [note, setNote] = useState(""); const [adminNote, setAdminNote] = useState(""); const [busy, setBusy] = useState(false);
  const [trk, setTrk] = useState({ code: "", url: "" });
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api(`/api/admin/orders/${id}`), api("/api/admin/couriers")]);
    setO(a.item); setAdminNote(a.item.adminNote || ""); setCouriers(b.items.filter((c: any) => c.active));
    setPid((p) => p || b.items.find((c: any) => c.isDefault && c.active)?._id || b.items.find((c: any) => c.active)?._id || "");
    setTrk({ code: a.item.courier?.trackingCode || "", url: a.item.courier?.trackingUrl || "" });
  }, [id]);
  useEffect(() => { load().catch((e) => toast(e.message, true)); }, [load, toast]);
  async function patch(body: any, ok = "আপডেট হয়েছে") { setBusy(true); try { const d = await api(`/api/admin/orders/${id}`, "PATCH", body); setO(d.item); toast(ok); } catch (e: any) { toast(e.message, true); } setBusy(false); }
  async function book() {
    setBusy(true);
    try { const d = await api(`/api/admin/orders/${id}/courier`, "POST", { providerId: pid }); setO(d.item); toast("কুরিয়ারে বুক হয়েছে"); setTrk({ code: d.item.courier?.trackingCode || "", url: d.item.courier?.trackingUrl || "" }); } catch (e: any) { toast(e.message, true); }
    setBusy(false);
  }
  async function refresh() { setBusy(true); try { const d = await api(`/api/admin/orders/${id}/courier/refresh`, "POST", {}); setO(d.item); toast("স্ট্যাটাস: " + (d.raw || "—")); } catch (e: any) { toast(e.message, true); } setBusy(false); }
  if (!o) return <Modal title="অর্ডার" onClose={onClose}><p className="muted">লোড হচ্ছে…</p></Modal>;
  const booked = !!o.courier?.consignmentId;
  return (
    <Modal title={`অর্ডার ${o.orderNumber}`} onClose={onClose} wide>
      <div className="row2" style={{ alignItems: "start" }}>
        <div>
          <h3 style={{ marginTop: 0 }}>কাস্টমার</h3>
          <dl className="kv"><dt>নাম</dt><dd>{o.customer.name}</dd><dt>ফোন</dt><dd><a href={`tel:${o.customer.phone}`} style={{ color: "#54eaff" }}>{o.customer.phone}</a></dd><dt>ইমেইল</dt><dd>{o.customer.email || "—"}</dd><dt>ঠিকানা</dt><dd>{o.customer.address}, {o.customer.city}</dd>{o.note && <><dt>নোট</dt><dd>{o.note}</dd></>}<dt>সময়</dt><dd>{dt(o.createdAt)}</dd></dl>
          <h3>আইটেম</h3>
          {o.items.map((i: any, k: number) => <div key={k} className="sumrow"><span>{i.name}{i.variantName ? ` (${i.variantName})` : ""} × {i.quantity}</span><span>{taka(i.unitPrice * i.quantity)}</span></div>)}
          <div className="sumrow"><span>সাবটোটাল</span><span>{taka(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="sumrow"><span>ডিসকাউন্ট {o.couponCode && `(${o.couponCode})`}</span><span>-{taka(o.discount)}</span></div>}
          <div className="sumrow"><span>ডেলিভারি</span><span>{taka(o.shipping)}</span></div><div className="sumrow total"><span>মোট</span><span>{taka(o.total)}</span></div>
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>পেমেন্ট</h3>
          <dl className="kv"><dt>মাধ্যম</dt><dd>{o.paymentMethod}</dd><dt>স্ট্যাটাস</dt><dd><Badge v={o.paymentStatus} /></dd>{o.paymentReference && <><dt>TrxID</dt><dd><b>{o.paymentReference}</b></dd></>}{o.gatewayValId && <><dt>Gateway ID</dt><dd>{o.gatewayValId}</dd></>}</dl>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 18px" }}>
            {o.paymentStatus !== "paid" && <button className="small-btn ok" disabled={busy} onClick={() => confirm("পেমেন্ট পেয়েছেন বলে মার্ক করবেন?") && patch({ paymentStatus: "paid" }, "পেইড মার্ক হয়েছে")}>✓ পেইড মার্ক করুন</button>}
            {o.paymentStatus === "paid" && <button className="small-btn" disabled={busy} onClick={() => patch({ paymentStatus: "refunded" })}>রিফান্ডেড মার্ক</button>}
            {o.paymentStatus !== "failed" && o.paymentStatus !== "paid" && <button className="small-btn danger" disabled={busy} onClick={() => patch({ paymentStatus: "failed" })}>ফেইলড</button>}
          </div>
          <h3>অর্ডার স্ট্যাটাস</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{STATUSES.map((s) => <button key={s} disabled={busy || o.status === s} className={"small-btn" + (o.status === s ? " ok" : s === "cancelled" || s === "returned" ? " danger" : "")} onClick={() => confirm(`স্ট্যাটাস "${s}" করবেন?${s === "cancelled" || s === "returned" ? " স্টক ফিরে যাবে।" : ""}`) && patch({ status: s, note })}>{s}</button>)}</div>
          <Field label="স্ট্যাটাস নোট (ঐচ্ছিক)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="যেমন: কাস্টমার ফোনে কনফার্ম করেছে" /></Field>
          <h3>কুরিয়ার</h3>
          {booked ? (
            <div className="notice info"><dl className="kv"><dt>সার্ভিস</dt><dd>{o.courier.provider}</dd><dt>Consignment</dt><dd>{o.courier.consignmentId}</dd><dt>ট্র্যাকিং কোড</dt><dd>{o.courier.trackingCode || "—"}</dd><dt>স্ট্যাটাস</dt><dd>{o.courier.status || "—"}</dd></dl>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}><button className="small-btn" disabled={busy || String(o.courier.consignmentId).startsWith("MANUAL-")} onClick={refresh}>↻ স্ট্যাটাস রিফ্রেশ</button>{o.courier.trackingUrl && <a className="small-btn" href={o.courier.trackingUrl} target="_blank" rel="noopener noreferrer">ট্র্যাকিং লিংক ↗</a>}</div>
              {String(o.courier.consignmentId).startsWith("MANUAL-") && <div className="row2" style={{ marginTop: 10 }}><input style={{ background: "#060d1e", color: "#fff", border: "1px solid #263f64", borderRadius: 8, padding: 8 }} placeholder="ট্র্যাকিং কোড" value={trk.code} onChange={(e) => setTrk({ ...trk, code: e.target.value })} /><input style={{ background: "#060d1e", color: "#fff", border: "1px solid #263f64", borderRadius: 8, padding: 8 }} placeholder="ট্র্যাকিং URL" value={trk.url} onChange={(e) => setTrk({ ...trk, url: e.target.value })} /><button className="small-btn" onClick={() => patch({ courierTracking: trk.code, courierUrl: trk.url }, "ট্র্যাকিং সেভ হয়েছে")}>সেভ</button></div>}
            </div>
          ) : ["cancelled", "returned", "delivered"].includes(o.status) ? <p className="muted" style={{ fontSize: 13 }}>এই স্ট্যাটাসে কুরিয়ারে পাঠানো যাবে না।</p> : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={pid} onChange={(e) => setPid(e.target.value)} style={{ background: "#060d1e", color: "#fff", border: "1px solid #263f64", borderRadius: 10, padding: 10 }}><option value="">কুরিয়ার বাছুন…</option>{couriers.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.type})</option>)}</select>
              <button className="btn sm" disabled={busy || !pid} onClick={book}>{busy ? "…" : "কুরিয়ারে পাঠান 🚚"}</button>
              {!couriers.length && <small className="muted">আগে "কুরিয়ার" ট্যাবে সার্ভিস যোগ করুন।</small>}
            </div>
          )}
          <Field label="অ্যাডমিন নোট (শুধু আপনি দেখবেন)"><textarea rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} onBlur={() => adminNote !== (o.adminNote || "") && patch({ adminNote }, "নোট সেভ হয়েছে")} /></Field>
        </div>
      </div>
      <h3>হিস্ট্রি</h3>
      <ul className="timeline">{[...(o.statusHistory || [])].reverse().map((h: any, i: number) => <li key={i}><b>{h.status}</b>{h.note && <> — {h.note}</>}<small>{dt(h.at)}</small></li>)}</ul>
    </Modal>
  );
}
