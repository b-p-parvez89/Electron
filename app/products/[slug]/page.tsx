import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Shell from "@/components/Shell";
import ProductMedia from "@/components/ProductMedia";
import ProductCard from "@/components/ProductCard";
import { getProduct, relatedProducts, totalStock } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "পণ্য পাওয়া যায়নি", robots: { index: false } };
  const desc = p.seoDescription || p.shortDescription || p.description.slice(0, 160);
  return { title: p.seoTitle || p.name, description: desc, alternates: { canonical: `/products/${p.slug}` }, openGraph: { title: p.seoTitle || p.name, description: desc, type: "website", images: p.images?.[0] ? [p.images[0]] : undefined } };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return notFound();
  const [rel, s] = await Promise.all([relatedProducts(p), getSettings()]);
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const prices = p.variants.length ? p.variants.map((v) => v.price) : [p.price];
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.shortDescription || p.description.slice(0, 300), sku: p.sku, image: p.images?.slice(0, 4),
    brand: p.brand?.name ? { "@type": "Brand", name: p.brand.name } : undefined,
    offers: { "@type": "AggregateOffer", priceCurrency: "BDT", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: Math.max(1, p.variants.length), availability: totalStock(p) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${base}/products/${p.slug}` }
  };
  return (
    <Shell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="container page">
        <nav className="breadcrumb" aria-label="breadcrumb"><Link href="/">হোম</Link> › <Link href="/shop">শপ</Link>{p.category?.slug && <> › <Link href={`/shop?category=${p.category.slug}`}>{p.category.name}</Link></>} › {p.name}</nav>
        <ProductMedia p={p} />
        <div className="grid-2" style={{ marginTop: 34, alignItems: "start" }}>
          <section className="panel"><h2 style={{ fontSize: 19, marginTop: 0 }}>বিবরণ</h2><div className="prose">{p.description}</div></section>
          <section className="panel"><h2 style={{ fontSize: 19, marginTop: 0 }}>স্পেসিফিকেশন</h2>
            {p.specs?.length ? <table className="specs"><tbody>{p.specs.map((x, i) => <tr key={i}><td>{x.key}</td><td>{x.value}</td></tr>)}</tbody></table> : <p className="muted" style={{ fontSize: 13 }}>স্পেসিফিকেশন যোগ করা হয়নি।</p>}
            {s.phone && <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>প্রশ্ন থাকলে কল করুন: {s.phone}</p>}
          </section>
        </div>
        {rel.length > 0 && <section className="section" style={{ paddingBottom: 0 }}><div className="section-head"><div><span className="eyebrow">আরও দেখুন</span><h2>সম্পর্কিত পণ্য</h2></div></div><div className="products">{rel.map((r) => <ProductCard key={r._id} p={r} />)}</div></section>}
      </main>
    </Shell>
  );
}
