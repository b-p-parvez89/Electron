"use client";
import Link from "next/link";
import Shell from "@/components/ShellClient";
import { useCart } from "@/components/useCart";
import { img } from "@/lib/client";
import { money } from "@/lib/format";

export default function CartPage() {
  const { items, ready, subtotal, set } = useCart();
  const key = (i: { productId: string; variantId?: string }) => i.productId + ":" + (i.variantId || "");
  const setQty = (k: string, q: number) => set(items.map((x) => (key(x) === k ? { ...x, quantity: Math.max(1, Math.min(20, q)) } : x)));
  return (
    <Shell>
      <main className="container page">
        <div className="steps"><b>১. কার্ট</b> › <span>২. চেকআউট</span> › <span>৩. কনফার্ম</span></div>
        <h1 style={{ fontSize: 30, margin: "0 0 20px" }}>আপনার কার্ট</h1>
        {!ready ? <p className="muted">লোড হচ্ছে…</p> : !items.length ? (
          <div className="panel empty">আপনার কার্ট খালি।<p style={{ marginTop: 15 }}><Link className="btn" href="/shop">শপে যান</Link></p></div>
        ) : (
          <div className="grid-2" style={{ gridTemplateColumns: "1.6fr 1fr", alignItems: "start" }}>
            <section className="panel">
              {items.map((i) => (
                <div className="cart-row" key={key(i)}>
                  {i.image ? <img src={img(i.image, 160)} alt="" /> : <div style={{ width: 70, height: 70, display: "grid", placeItems: "center", fontSize: 28 }}>📦</div>}
                  <div>
                    <Link href={i.slug ? `/products/${i.slug}` : "#"} style={{ fontWeight: 600, fontSize: 14 }}>{i.name}</Link>
                    {i.variantName && <div className="muted" style={{ fontSize: 12 }}>{i.variantName}</div>}
                    <div className="muted" style={{ fontSize: 12 }}>{money(i.price)} প্রতিটি</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                      <button className="small-btn" aria-label="কমান" onClick={() => setQty(key(i), i.quantity - 1)}>−</button><b>{i.quantity}</b>
                      <button className="small-btn" aria-label="বাড়ান" onClick={() => setQty(key(i), i.quantity + 1)}>+</button>
                      <button className="small-btn danger" onClick={() => set(items.filter((x) => key(x) !== key(i)))}>সরান</button>
                    </div>
                  </div>
                  <b>{money(i.price * i.quantity)}</b>
                </div>
              ))}
            </section>
            <section className="panel">
              <h2 style={{ fontSize: 19, marginTop: 0 }}>সারসংক্ষেপ</h2>
              <div className="sumrow"><span>সাবটোটাল</span><span>{money(subtotal)}</span></div>
              <div className="sumrow"><span>ডেলিভারি চার্জ</span><span className="muted">চেকআউটে হিসাব হবে</span></div>
              <div className="sumrow total"><span>মোট (আনুমানিক)</span><span>{money(subtotal)}</span></div>
              <Link className="btn" href="/checkout" style={{ width: "100%", marginTop: 16 }}>চেকআউটে যান →</Link>
              <Link className="btn secondary" href="/shop" style={{ width: "100%", marginTop: 10 }}>আরও কিনুন</Link>
            </section>
          </div>
        )}
      </main>
    </Shell>
  );
}
