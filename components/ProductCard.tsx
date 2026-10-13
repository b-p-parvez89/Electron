import Link from "next/link";
import { img } from "@/lib/catalog-home";
import { PProduct, priceRange, totalStock } from "@/lib/catalog";
import { money } from "@/lib/format";
import AddToCartButton from "@/components/AddToCartButton";

export default function ProductCard({ p }: { p: PProduct }) {
  const { min, max } = priceRange(p);
  const stock = totalStock(p);
  const discount = p.compareAtPrice && p.compareAtPrice > p.price && !p.variants?.length ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
  return (
    <article className="card">
      <Link href={`/products/${p.slug}`} aria-label={p.name}>
        <div className="product-art">
          {p.images?.[0] ? <img src={img(p.images[0], 500)} alt={p.name} loading="lazy" /> : <span style={{ fontSize: 64 }}>📦</span>}
          {discount > 0 && <span className="tag">-{discount}%</span>}
          {stock <= 0 && <span className="tag out">স্টক শেষ</span>}
          {(p.spinImages?.length > 1 || p.model3dUrl) && <span className="tag360">360°</span>}
        </div>
      </Link>
      <div className="card-body">
        {p.brand?.name && <div className="muted" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{p.brand.name}</div>}
        <h3><Link href={`/products/${p.slug}`}>{p.name}</Link></h3>
        <div className="product-bottom">
          <div>
            <span className="money">{p.variants?.length && min !== max ? `${money(min)}+` : money(min)}</span>
            {discount > 0 && <s className="muted" style={{ fontSize: 11, marginLeft: 6 }}>{money(p.compareAtPrice!)}</s>}
          </div>
          {stock > 0 ? (p.variants?.length ? <Link className="small-btn" href={`/products/${p.slug}`}>অপশন</Link> : <AddToCartButton p={p} />) : <span className="muted" style={{ fontSize: 11 }}>—</span>}
        </div>
      </div>
    </article>
  );
}
