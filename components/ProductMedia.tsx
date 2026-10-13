"use client";
import { useState } from "react";
import Viewer360 from "@/components/Viewer360";
import ProductBuy from "@/components/ProductBuy";
import type { PProduct } from "@/lib/catalog";

/** Links the gallery with the variant picker so choosing a variant swaps the shown image. */
export default function ProductMedia({ p }: { p: PProduct }) {
  const [active, setActive] = useState<string | undefined>();
  return (
    <div className="grid-2 pdp">
      <Viewer360 name={p.name} images={[...new Set([...(p.images || []), ...p.variants.map((v) => v.image).filter(Boolean) as string[]])]} spinImages={p.spinImages || []} model3dUrl={p.model3dUrl} activeImage={active} />
      <div id="buy"><ProductBuyInfo p={p} onImage={setActive} /></div>
    </div>
  );
}
function ProductBuyInfo({ p, onImage }: { p: PProduct; onImage: (u: string) => void }) {
  return (
    <>
      {p.brand?.name && <span className="eyebrow">{p.brand.name}</span>}
      <h1 style={{ fontSize: "clamp(26px,4vw,38px)", letterSpacing: -1, margin: "14px 0 6px", lineHeight: 1.2 }}>{p.name}</h1>
      {p.shortDescription && <p className="muted" style={{ lineHeight: 1.8, fontSize: 14 }}>{p.shortDescription}</p>}
      {p.sku && <p className="muted" style={{ fontSize: 11 }}>SKU: {p.sku}</p>}
      <ProductBuy p={p} onImage={onImage} />
      <div className="trust"><span>🚚 সারা দেশে ডেলিভারি</span><span>💵 ক্যাশ অন ডেলিভারি</span><span>🔒 নিরাপদ পেমেন্ট</span></div>
    </>
  );
}
