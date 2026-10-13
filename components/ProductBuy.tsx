"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart, trackEvent } from "@/lib/client";
import { money } from "@/lib/format";
import type { PProduct } from "@/lib/catalog";

export default function ProductBuy({ p, onImage }: { p: PProduct; onImage?: (u: string) => void }) {
  const router = useRouter();
  const hasVar = p.variants.length > 0;
  const firstInStock = p.variants.find((v) => v.stock > 0)?._id || p.variants[0]?._id;
  const [vid, setVid] = useState<string | undefined>(hasVar ? firstInStock : undefined);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const v = useMemo(() => p.variants.find((x) => x._id === vid), [p.variants, vid]);
  const price = v ? v.price : p.price;
  const compare = v ? v.compareAtPrice : p.compareAtPrice;
  const stock = v ? v.stock : p.stock;

  useEffect(() => { trackEvent("ViewContent", { value: price, contents: [{ id: p._id, quantity: 1, item_price: price, title: p.name }] }); /* eslint-disable-next-line */ }, [p._id]);
  useEffect(() => { if (v?.image && onImage) onImage(v.image); }, [v, onImage]);
  useEffect(() => { setQty((q) => Math.min(q, Math.max(1, stock))); }, [stock]);

  function add(go: boolean) {
    if (hasVar && !v) return;
    addToCart({ productId: p._id, variantId: v?._id, name: p.name, variantName: v?.name, price, quantity: qty, image: v?.image || p.images?.[0], slug: p.slug });
    if (go) router.push("/checkout"); else { setAdded(true); setTimeout(() => setAdded(false), 1600); }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "18px 0 6px", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 34, margin: 0 }}>{money(price)}</h2>
        {compare && compare > price && <><s className="muted">{money(compare)}</s><span className="status">-{Math.round((1 - price / compare) * 100)}%</span></>}
      </div>
      {hasVar && (
        <div className="field" style={{ margin: "16px 0" }}>
          <label>অপশন বেছে নিন</label>
          <div className="chips">{p.variants.map((x) => <button key={x._id} disabled={x.stock <= 0} className={"chip" + (x._id === vid ? " on" : "")} onClick={() => setVid(x._id)}>{x.name}{x.stock <= 0 ? " (শেষ)" : ""}</button>)}</div>
        </div>
      )}
      <p style={{ fontSize: 13, color: stock > 0 ? (stock <= 5 ? "#9a6900" : "#27804f") : "#b33e52" }}>{stock > 0 ? (stock <= 5 ? `মাত্র ${stock}টি বাকি!` : "✓ স্টকে আছে") : "স্টক শেষ"}</p>
      {stock > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
            <button className="small-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="কমান">−</button>
            <b style={{ minWidth: 24, textAlign: "center" }}>{qty}</b>
            <button className="small-btn" onClick={() => setQty((q) => Math.min(Math.min(20, stock), q + 1))} aria-label="বাড়ান">+</button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => add(true)}>এখনই কিনুন →</button>
            <button className="btn secondary" onClick={() => add(false)}>{added ? "✓ কার্টে যোগ হয়েছে" : "কার্টে যোগ করুন"}</button>
          </div>
        </>
      )}
    </div>
  );
}
