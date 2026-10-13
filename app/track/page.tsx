"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Shell from "@/components/ShellClient";
import { money } from "@/lib/format";

const L: Record<string, string> = { pending: "অপেক্ষমাণ", confirmed: "কনফার্মড", processing: "প্রসেসিং", shipped: "শিপড", delivered: "ডেলিভারড", cancelled: "বাতিল", returned: "ফেরত", unpaid: "অপরিশোধিত", paid: "পরিশোধিত", failed: "ব্যর্থ", refunded: "রিফান্ড" };
const fmt = (d: string) => new Date(d).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });

function Inner() {
  const sp = useSearchParams();
  const [number, setNumber] = useState(sp.get("order") || "");
  const [phone, setPhone] = useState(sp.get("phone") || "");
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function search(e?: React.FormEvent) {
    e?.preventDefault(); setError(""); setOrder(null); setBusy(true);
    try {
      const r = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(number)}&phone=${encodeURIComponent(phone)}`);
      const d = await r.json();
      if (!r.ok) setError(d.error || "অর্ডার পাওয়া যায়নি"); else setOrder(d.order);
    } catch { setError("নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন"); }
    setBusy(false);
  }
  useEffect(() => { if (number && phone) search(); /* eslint-disable-next-line */ }, []);
  return (
    <main className="container page" style={{ maxWidth: 760 }}>
      <span className="eyebrow">ORDER STATUS</span>
      <h1 style={{ fontSize: 30, margin: "16px 0" }}>অর্ডার ট্র্যাক করুন</h1>
      <section className="panel"><form className="form" onSubmit={search}>
        <div className="field"><label>অর্ডার নম্বর</label><input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="EL-XXXXXXXX-XXXX" required /></div>
        <div className="field"><label>মোবাইল নম্বর (অর্ডারের সময় যা দিয়েছিলেন)</label><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="01XXXXXXXXX" required /></div>
        <button className="btn" disabled={busy}>{busy ? "খোঁজা হচ্ছে…" : "অর্ডার খুঁজুন"}</button>
      </form>{error && <div className="notice err" style={{ marginTop: 14 }}>{error}</div>}</section>
      {order && (
        <section className="panel" style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div><h2 style={{ fontSize: 20, margin: 0 }}>{order.orderNumber}</h2><div className="muted" style={{ fontSize: 12 }}>{fmt(order.createdAt)}</div></div>
            <div style={{ display: "flex", gap: 8, alignItems: "start" }}><span className={"status s-" + order.status}>{L[order.status] || order.status}</span><span className={"status s-" + order.paymentStatus}>{L[order.paymentStatus] || order.paymentStatus}</span></div>
          </div>
          <div style={{ margin: "16px 0", fontSize: 13 }}>{order.items.map((i: any, k: number) => <div key={k} className="sumrow"><span>{i.name}{i.variantName ? ` — ${i.variantName}` : ""} × {i.quantity}</span></div>)}<div className="sumrow total"><span>মোট</span><span>{money(order.total)}</span></div></div>
          {order.courier?.provider && <div className="notice info">কুরিয়ার: <b>{order.courier.provider}</b>{order.courier.trackingCode && <> · ট্র্যাকিং কোড: <b>{order.courier.trackingCode}</b></>}{order.courier.status && <> · স্ট্যাটাস: {order.courier.status}</>}{order.courier.trackingUrl && <> · <a href={order.courier.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>কুরিয়ার ট্র্যাকিং</a></>}</div>}
          <ul className="timeline">{[...(order.statusHistory || [])].reverse().map((h: any, i: number) => <li key={i}><b>{L[h.status] || h.status}</b>{h.note && <> — {h.note}</>}<small>{h.at ? fmt(h.at) : ""}</small></li>)}</ul>
        </section>
      )}
    </main>
  );
}
export default function TrackPage() { return <Shell><Suspense fallback={null}><Inner /></Suspense></Shell>; }
