"use client";
import { useEffect, useState } from "react";
import { api, Badge, dt, Modal, taka, useToast } from "./ui";

export default function Customers() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]); const [q, setQ] = useState(""); const [open, setOpen] = useState<any>(null);
  useEffect(() => { const t = setTimeout(() => api(`/api/admin/customers?q=${encodeURIComponent(q)}`).then((d) => setItems(d.items)).catch((e) => toast(e.message, true)), 250); return () => clearTimeout(t); }, [q, toast]);
  async function view(c: any) { try { setOpen({ c, orders: (await api(`/api/admin/customers?phone=${encodeURIComponent(c._id)}`)).orders }); } catch (e: any) { toast(e.message, true); } }
  return (
    <>
      <div className="toolbar"><input placeholder="নাম / ফোন / ইমেইল" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 260 }} /><span className="muted" style={{ fontSize: 12 }}>অর্ডার থেকে স্বয়ংক্রিয়ভাবে তৈরি (ফোন নম্বর অনুযায়ী)</span></div>
      <div className="panel table-wrap" style={{ padding: 0 }}><table className="table"><thead><tr><th>কাস্টমার</th><th>ফোন</th><th>জেলা</th><th>অর্ডার</th><th>মোট খরচ</th><th>বাতিল</th><th>শেষ অর্ডার</th><th></th></tr></thead>
        <tbody>{items.map((c) => <tr key={c._id}><td><b>{c.name}</b><div className="muted">{c.email}</div></td><td>{c._id}</td><td>{c.city}</td><td>{c.orders}</td><td>{taka(c.spent)}</td><td style={{ color: c.cancelled ? "#ffb3c0" : undefined }}>{c.cancelled}</td><td>{dt(c.lastOrder)}</td><td><button className="small-btn" onClick={() => view(c)}>হিস্ট্রি</button></td></tr>)}{!items.length && <tr><td colSpan={8} className="empty">কোনো কাস্টমার নেই</td></tr>}</tbody></table></div>
      {open && <Modal title={`${open.c.name} — ${open.c._id}`} onClose={() => setOpen(null)} wide><dl className="kv"><dt>ঠিকানা</dt><dd>{open.c.address}, {open.c.city}</dd><dt>ইমেইল</dt><dd>{open.c.email || "—"}</dd></dl>
        <div className="table-wrap" style={{ marginTop: 12 }}><table className="table"><thead><tr><th>অর্ডার</th><th>তারিখ</th><th>মোট</th><th>পেমেন্ট</th><th>স্ট্যাটাস</th></tr></thead><tbody>{open.orders.map((o: any) => <tr key={o._id}><td>{o.orderNumber}</td><td>{dt(o.createdAt)}</td><td>{taka(o.total)}</td><td><Badge v={o.paymentStatus} /></td><td><Badge v={o.status} /></td></tr>)}</tbody></table></div></Modal>}
    </>
  );
}
