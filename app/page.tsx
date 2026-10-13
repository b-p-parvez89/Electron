import Link from "next/link";
import Shell from "@/components/Shell";
import ProductCard from "@/components/ProductCard";
import { activeBrands, allCategories, homeProducts, img } from "@/lib/catalog-home";
import { getSettings } from "@/lib/settings";
import Product from "@/models/Product";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ featured, latest, best, offer }, cats, brands, s] = await Promise.all([homeProducts(), allCategories(), activeBrands(), getSettings()]);
  const bannerProduct = s.banner.active && isValidObjectId(s.banner.productId)
    ? await Product.findOne({ _id: s.banner.productId, active: true }).select("name slug images").lean() as { name: string; slug: string; images: string[] } | null
    : null;
  const top = cats.filter((c: any) => !c.parent);
  const hero = featured[0] || latest[0];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: s.siteName,
    url: siteUrl,
    ...(s.logo ? { logo: new URL(s.logo, siteUrl).toString() } : {}),
    ...(s.phone ? { telephone: s.phone } : {}),
    sameAs: [s.social.facebook, s.social.instagram, s.social.youtube].filter(Boolean)
  };
  const customBannerEnabled = s.banner.active && !!s.banner.title.trim();
  const customLink = s.banner.linkUrl.trim();
  const safeCustomLink = customLink.startsWith("/") && !customLink.startsWith("//")
    ? customLink
    : /^https:\/\//i.test(customLink) ? customLink : "/shop";
  const bannerHref = bannerProduct ? `/products/${bannerProduct.slug}` : safeCustomLink;
  const bannerImage = s.banner.image || bannerProduct?.images?.[0] || "";
  return (
    <Shell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="container">
        {customBannerEnabled ? <section className="custom-home-banner">
          <div className="custom-home-banner-copy">
            {s.banner.eyebrow && <span className="eyebrow">{s.banner.eyebrow}</span>}
            <h1>{s.banner.title}</h1>
            {s.banner.description && <p className="lead">{s.banner.description}</p>}
            <Link className="btn" href={bannerHref} target={bannerHref.startsWith("https://") ? "_blank" : undefined} rel={bannerHref.startsWith("https://") ? "noopener noreferrer" : undefined}>{s.banner.buttonText || (bannerProduct ? "পণ্যের বিস্তারিত দেখুন" : "আরও জানুন")} ↗</Link>
          </div>
          <Link className="custom-home-banner-media" href={bannerHref} target={bannerHref.startsWith("https://") ? "_blank" : undefined} rel={bannerHref.startsWith("https://") ? "noopener noreferrer" : undefined} aria-label={bannerProduct ? `${bannerProduct.name} এর বিস্তারিত দেখুন` : s.banner.title}>
            {bannerImage ? <img src={img(bannerImage, 900)} alt={bannerProduct?.name || s.banner.title} /> : <span aria-hidden="true">✦</span>}
            {bannerProduct && <small>{bannerProduct.name} · বিস্তারিত দেখুন</small>}
          </Link>
        </section> : <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">THE NEXT-GEN TECH STORE</span>
            <h1>{s.tagline.split(" ").slice(0, 2).join(" ")}<br /><span className="gradient">{s.tagline.split(" ").slice(2).join(" ") || "everyday."}</span></h1>
            <p className="lead">অরিজিনাল ইলেকট্রনিক্স ও গ্যাজেট — ৩৬০° ভিউ-তে পণ্য ঘুরিয়ে দেখুন, নিরাপদে অর্ডার করুন, সারা বাংলাদেশে হোম ডেলিভারি পান।</p>
            <div className="hero-actions"><Link className="btn" href="/shop">কেনাকাটা শুরু করুন ↗</Link><Link className="btn secondary" href="#categories">ক্যাটাগরি দেখুন</Link></div>
            <p className="muted" style={{ fontSize: 12 }}>✦ ক্যাশ অন ডেলিভারি · ✦ নিরাপদ অনলাইন পেমেন্ট · ✦ ৩৬০° প্রোডাক্ট ভিউ</p>
          </div>
          <div className="hero-media">
            <div className="hero-art" style={{ position: "absolute", inset: 0 }} />
            {hero?.images?.[0] ? <Link href={`/products/${hero.slug}`}><img src={img(hero.images[0], 700)} alt={hero.name} /></Link> : <div className="product-emoji">🎧</div>}
            {hero && <div className="hero-note">{hero.name.toUpperCase()}</div>}
          </div>
        </section>}

        {offer && (
          <section className="offer-card" aria-label="বিশেষ অফার">
            <div className="offer-copy">
              <span className="offer-kicker">সীমিত সময়ের অফার</span>
              <span className="offer-discount">{offer.discount}% ছাড়</span>
              <h2>{offer.product.name}</h2>
              <p>{offer.product.shortDescription || "পছন্দের গ্যাজেটে বিশেষ সাশ্রয়ী দাম।"}</p>
              <div className="offer-price"><strong>{new Intl.NumberFormat("bn-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(offer.price)}</strong><s>{new Intl.NumberFormat("bn-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(offer.compareAtPrice)}</s></div>
              <div className="offer-actions">
                <Link className="btn" href={`/products/${offer.product.slug}`}>বিস্তারিত দেখুন</Link>
                <Link className="btn secondary" href={`/products/${offer.product.slug}#buy`}>এখনই কিনুন →</Link>
              </div>
            </div>
            <Link className="offer-media" href={`/products/${offer.product.slug}`} aria-label={`${offer.product.name} এর বিস্তারিত দেখুন`}>
              {offer.product.images?.[0] ? <img src={img(offer.product.images[0], 720)} alt={offer.product.name} /> : <span>🎧</span>}
            </Link>
          </section>
        )}

        <div className="perks">
          <div className="perk"><b>🚚 সারা দেশে ডেলিভারি</b>ঢাকায় ১–২ দিন, বাইরে ২–৫ দিন</div>
          <div className="perk"><b>💵 ক্যাশ অন ডেলিভারি</b>পণ্য হাতে পেয়ে পেমেন্ট</div>
          <div className="perk"><b>🔒 নিরাপদ পেমেন্ট</b>SSLCommerz, bKash/Nagad</div>
          <div className="perk"><b>🔁 সহজ রিটার্ন</b>ত্রুটিপূর্ণ পণ্যে ৩ দিনের মধ্যে</div>
        </div>

        {top.length > 0 && (
          <section className="section" id="categories">
            <div className="section-head"><div><span className="eyebrow">ক্যাটাগরি</span><h2>আপনার পছন্দের পণ্য খুঁজুন</h2></div></div>
            <div className="categories">{top.map((c: any) => (
              <Link className="category" href={`/shop?category=${c.slug}`} key={c._id}>
                <div className="symbol">{c.image ? <img src={img(c.image, 120)} alt="" width={44} height={44} style={{ objectFit: "contain" }} /> : c.icon || "📦"}</div>
                <h3>{c.name}</h3><p>{c.description}</p>
              </Link>))}
            </div>
          </section>
        )}

        {featured.length > 0 && <Section eyebrow="বাছাই করা" title="ফিচারড পণ্য" items={featured} />}
        {best.length > 0 && <Section eyebrow="সবচেয়ে বেশি বিক্রিত" title="বেস্ট সেলার" items={best} />}
        {latest.length > 0 && <Section eyebrow="নতুন এসেছে" title="নতুন পণ্য" items={latest} more />}
        {!featured.length && !latest.length && <section className="section"><div className="panel empty">এখনো কোনো পণ্য যোগ করা হয়নি। অ্যাডমিন প্যানেল থেকে পণ্য যোগ করুন।</div></section>}

        {brands.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="section-head"><div><span className="eyebrow">ব্র্যান্ড</span><h2>জনপ্রিয় ব্র্যান্ড</h2></div></div>
            <div className="brands">{brands.map((b: any) => <Link key={b._id} href={`/shop?brand=${b.slug}`}>{b.name}</Link>)}</div>
          </section>
        )}

        <section className="newsletter"><div><h2>ভালো টেক। ভালো প্রতিদিন।</h2><p className="muted" style={{ fontSize: 13 }}>পরিষ্কার দাম, সহজ অর্ডার এবং চেকআউট থেকে দরজা পর্যন্ত ট্র্যাকিং।</p></div><Link className="btn" href="/shop">সব পণ্য দেখুন →</Link></section>
      </main>
    </Shell>
  );
}

function Section({ eyebrow, title, items, more }: { eyebrow: string; title: string; items: any[]; more?: boolean }) {
  return (
    <section className="section" style={{ paddingTop: 20 }}>
      <div className="section-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{more && <Link className="btn secondary sm" href="/shop">সব দেখুন →</Link>}</div>
      <div className="products">{items.map((p) => <ProductCard key={p._id} p={p} />)}</div>
    </section>
  );
}
