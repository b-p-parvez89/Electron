"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Shell from "@/components/ShellClient";
import { useCart } from "@/components/useCart";
import { img, sessionId, trackEvent } from "@/lib/client";
import { isBdMobile, money, normalizePhone } from "@/lib/format";

type GW = { key: string; name: string; type: string; instructions?: string; accountNumber?: string };
type Cfg = { gateways: GW[]; shipping: { insideDhaka: number; outsideDhaka: number; freeOver: number } };
const DISTRICTS = ["ঢাকা", "চট্টগ্রাম", "সিলেট", "রাজশাহী", "খুলনা", "বরিশাল", "রংপুর", "ময়মনসিংহ", "গাজীপুর", "নারায়ণগঞ্জ", "কুমিল্লা", "অন্যান্য জেলা"];

export default function Checkout() {
  const { items, ready, subtotal } = useCart();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", city: "ঢাকা", note: "" });
  const [gw, setGw] = useState("");
  const [trx, setTrx] = useState("");
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; freeShipping: boolean } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => { fetch("/api/checkout/config").then((r) => r.json()).then((c: Cfg) => { setCfg(c); if (c.gateways?.[0]) setGw(c.gateways[0].key); }).catch(() => setCfg({ gateways: [], shipping: { insideDhaka: 70, outsideDhaka: 130, freeOver: 0 } })); }, []);
  useEffect(() => {
    if (ready && items.length && !started.current) { started.current = true; trackEvent("InitiateCheckout", { value: subtotal, contents: items.map((i) => ({ id: i.productId, quantity: i.quantity, item_price: i.price, title: i.name })) }); }
  }, [ready, items, subtotal]);

  const discount = coupon?.discount || 0;
  const shipping = useMemo(() => {
    if (!cfg) return 0;
    if (coupon?.freeShipping) return 0;
    if (cfg.shipping.freeOver > 0 && subtotal - discount >= cfg.shipping.freeOver) return 0;
    return /ঢাকা|dhaka/i.test(f.city) ? cfg.shipping.insideDhaka : cfg.shipping.outsideDhaka;
  }, [cfg, coupon, subtotal, discount, f.city]);
  const total = Math.max(0, subtotal - discount + shipping);
  const selected = cfg?.gateways.find((g) => g.key === gw);

  // Incomplete-order capture: store the lead once a valid mobile number exists (debounced)
  useEffect(() => {
    if (!items.length || !isBdMobile(normalizePhone(f.phone))) return;
    const t = setTimeout(() => {
      fetch("/api/incomplete", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ sessionId: sessionId(), name: f.name, phone: f.phone, email: f.email, address: f.address, city: f.city, items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, name: i.name, variantName: i.variantName, quantity: i.quantity, price: i.price, image: i.image })) }) }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [f, items]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<any>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function applyCoupon() {
    setCouponMsg("");
    const r = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, subtotal }) });
    const d = await r.json();
    if (!r.ok) { setCoupon(null); setCouponMsg(d.error || "কুপন প্রযোজ্য নয়"); return; }
    setCoupon(d); setCouponMsg(`✓ কুপন প্রযোজ্য: ${d.freeShipping ? "ফ্রি ডেলিভারি" : "-" + money(d.discount)}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!isBdMobile(normalizePhone(f.phone))) { setErr("সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)"); return; }
    if (!gw) { setErr("পেমেন্ট মাধ্যম বেছে নিন"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        customer: { name: f.name, phone: f.phone, email: f.email, address: f.address, city: f.city }, note: f.note, gateway: gw,
        paymentReference: selected?.type === "manual" ? trx : undefined, couponCode: coupon?.code, sessionId: sessionId() }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "অর্ডার করা যায়নি"); setBusy(false); return; }
      try { sessionStorage.setItem("electron_last_order", JSON.stringify({ ...d.order, gateway: selected?.type })); } catch {}
      localStorage.removeItem("electron_cart_v2"); window.dispatchEvent(new Event("electron:cart"));
      if (d.paymentUrl) { location.href = d.paymentUrl; return; }
      location.href = `/order-success?order=${encodeURIComponent(d.order.orderNumber)}`;
    } catch { setErr("নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন"); setBusy(false); }
  }

  if (ready && !items.length) return <Shell><main className="container page"><div className="panel empty">কার্ট খালি। <Link className="btn" href="/shop" style={{ marginLeft: 8 }}>শপে যান</Link></div></main></Shell>;
  return (
    <Shell>
      <main className="container page">
        <div className="steps"><span>১. কার্ট</span> › <b>২. চেকআউট</b> › <span>৩. কনফার্ম</span></div>
        <h1 style={{ fontSize: 30, margin: "0 0 20px" }}>চেকআউট</h1>
        <form onSubmit={submit} className="grid-2" style={{ alignItems: "start" }}>
          <section className="panel form">
            <h2 style={{ fontSize: 19, margin: 0 }}>ডেলিভারি তথ্য</h2>
            <div className="field"><label>আপনার নাম *</label><input required value={f.name} onChange={set("name")} autoComplete="name" /></div>
            <div className="field"><label>মোবাইল নম্বর *</label><input required inputMode="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={set("phone")} autoComplete="tel" /></div>
            <div className="field"><label>ইমেইল (ঐচ্ছিক)</label><input type="email" value={f.email} onChange={set("email")} autoComplete="email" /></div>
            <div className="field"><label>সম্পূর্ণ ঠিকানা *</label><textarea required rows={2} placeholder="বাসা/রোড, এলাকা, থানা" value={f.address} onChange={set("address")} /></div>
            <div className="field"><label>জেলা *</label><select value={DISTRICTS.includes(f.city) ? f.city : "অন্যান্য জেলা"} onChange={(e) => setF((x) => ({ ...x, city: e.target.value === "অন্যান্য জেলা" ? "" : e.target.value }))}>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select>
              {!DISTRICTS.includes(f.city) && <input required placeholder="আপনার জেলার নাম" value={f.city} onChange={set("city")} />}</div>
            <div className="field"><label>অর্ডার নোট (ঐচ্ছিক)</label><input value={f.note} onChange={set("note")} placeholder="যেমন: কালার/ডেলিভারি সময়" /></div>
          </section>
          <section className="panel form">
            <h2 style={{ fontSize: 19, margin: 0 }}>অর্ডার সামারি</h2>
            {items.map((i) => <div key={i.productId + (i.variantId || "")} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>{i.image && <img src={img(i.image, 100)} alt="" width={44} height={44} style={{ objectFit: "contain", background: "#081329", borderRadius: 8 }} />}<div style={{ flex: 1 }}>{i.name}{i.variantName ? ` — ${i.variantName}` : ""}<div className="muted" style={{ fontSize: 11 }}>× {i.quantity}</div></div><b>{money(i.price * i.quantity)}</b></div>)}
            <div style={{ display: "flex", gap: 8 }}><input style={{ flex: 1, border: "1px solid #263f64", background: "#060d1e", color: "#fff", borderRadius: 10, padding: 10 }} placeholder="কুপন কোড" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /><button type="button" className="btn secondary sm" onClick={applyCoupon} disabled={!code}>প্রয়োগ</button></div>
            {couponMsg && <small style={{ color: coupon ? "#7fffc4" : "#ff9b9b" }}>{couponMsg}</small>}
            <div><div className="sumrow"><span>সাবটোটাল</span><span>{money(subtotal)}</span></div>
              {discount > 0 && <div className="sumrow"><span>ডিসকাউন্ট</span><span>-{money(discount)}</span></div>}
              <div className="sumrow"><span>ডেলিভারি চার্জ</span><span>{shipping ? money(shipping) : "ফ্রি"}</span></div>
              <div className="sumrow total"><span>মোট</span><span>{money(total)}</span></div></div>
            <h2 style={{ fontSize: 17, margin: "6px 0 0" }}>পেমেন্ট মাধ্যম</h2>
            {!cfg ? <p className="muted">লোড হচ্ছে…</p> : !cfg.gateways.length ? <div className="notice err">কোনো পেমেন্ট মাধ্যম চালু নেই। অনুগ্রহ করে পরে চেষ্টা করুন।</div> :
              cfg.gateways.map((g) => (
                <label key={g.key} className={"gw" + (gw === g.key ? " on" : "")}><input type="radio" name="gw" checked={gw === g.key} onChange={() => setGw(g.key)} />
                  <div><b style={{ fontSize: 14 }}>{g.name}</b>{g.type === "sslcommerz" && <div className="muted" style={{ fontSize: 11 }}>কার্ড / মোবাইল ব্যাংকিং / নেট ব্যাংকিং (SSLCommerz)</div>}{g.type === "cod" && <div className="muted" style={{ fontSize: 11 }}>পণ্য হাতে পেয়ে টাকা দিন</div>}
                    {gw === g.key && g.type === "manual" && <div style={{ marginTop: 8, fontSize: 12 }}>{g.accountNumber && <div>নম্বর: <b>{g.accountNumber}</b></div>}{g.instructions && <div className="muted">{g.instructions}</div>}</div>}</div></label>
              ))}
            {selected?.type === "manual" && <div className="field"><label>ট্রানজেকশন আইডি (TrxID) *</label><input required value={trx} onChange={(e) => setTrx(e.target.value)} placeholder="যেমন: 9H7XXXXXXX" /><small>টাকা পাঠিয়ে TrxID এখানে দিন। যাচাই করে অর্ডার কনফার্ম করা হবে।</small></div>}
            {err && <div className="notice err">{err}</div>}
            <button className="btn" disabled={busy || !cfg?.gateways.length}>{busy ? "প্রসেস হচ্ছে…" : selected?.type === "sslcommerz" ? `পেমেন্ট করুন · ${money(total)}` : `অর্ডার কনফার্ম করুন · ${money(total)}`}</button>
            <p className="muted" style={{ fontSize: 11, margin: 0 }}>অর্ডার করার মাধ্যমে আপনি আমাদের <Link href="/pages/terms" style={{ textDecoration: "underline" }}>শর্তাবলি</Link> মেনে নিচ্ছেন।</p>
          </section>
        </form>
      </main>
    </Shell>
  );
}
