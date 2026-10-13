import Link from "next/link";
import type { Metadata } from "next";
import Shell from "@/components/Shell";
import ProductCard from "@/components/ProductCard";
import { activeBrands, allCategories, listProducts } from "@/lib/catalog";

type SP = { q?: string; category?: string; brand?: string; min?: string; max?: string; sort?: string; page?: string; stock?: string };
type ShopProps = { searchParams: Promise<SP> };
export async function generateMetadata({ searchParams }: ShopProps): Promise<Metadata> {
  const sp = await searchParams;
  const noindex = sp.q || sp.min || sp.max || sp.sort || sp.page;
  return { title: sp.q ? `"${sp.q}" — সার্চ` : "সব পণ্য", description: "ইলেকট্রনিক্স ও গ্যাজেটের পূর্ণ কালেকশন।", robots: noindex ? { index: false, follow: true } : undefined, alternates: { canonical: "/shop" + (sp.category ? `?category=${sp.category}` : "") } };
}

export default async function Shop({ searchParams }: ShopProps) {
  const sp = await searchParams;
  const num = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
  const [res, cats, brands] = await Promise.all([
    listProducts({ q: sp.q?.slice(0, 80), category: sp.category, brand: sp.brand, min: num(sp.min), max: num(sp.max), sort: sp.sort, page: num(sp.page), inStock: sp.stock === "1" }),
    allCategories(), activeBrands()
  ]);
  const top = cats.filter((c: any) => !c.parent);
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, page: undefined, ...patch })) if (v) p.set(k, v as string);
    const s = p.toString();
    return "/shop" + (s ? "?" + s : "");
  };
  return (
    <Shell>
      <main className="container page">
        <div className="section-head"><div><span className="eyebrow">শপ</span><h1 style={{ fontSize: 30, margin: "10px 0 0" }}>{sp.q ? `"${sp.q}" এর ফলাফল` : "সব পণ্য"}</h1><p className="muted" style={{ fontSize: 13 }}>{res.total}টি পণ্য</p></div></div>
        <div className="shop">
          <form className="filters panel" action="/shop">
            <div className="field"><label htmlFor="shop-search">পণ্য খুঁজুন</label><input id="shop-search" name="q" type="search" placeholder="নাম, SKU বা ট্যাগ" defaultValue={sp.q} /></div>
            <div><h4>ক্যাটাগরি</h4>
              <Link className={"cat" + (!sp.category ? " on" : "")} href={link({ category: undefined })}>সব</Link>
              {top.map((c: any) => (<div key={c._id}>
                <Link className={"cat" + (sp.category === c.slug ? " on" : "")} href={link({ category: c.slug })}>{c.name}</Link>
                {cats.filter((k: any) => k.parent === c._id).map((k: any) => <Link key={k._id} className={"cat" + (sp.category === k.slug ? " on" : "")} style={{ paddingLeft: 24, fontSize: 12 }} href={link({ category: k.slug })}>{k.name}</Link>)}
              </div>))}
            </div>
            {brands.length > 0 && <div className="field"><label>ব্র্যান্ড</label><select name="brand" defaultValue={sp.brand || ""}><option value="">সব ব্র্যান্ড</option>{brands.map((b: any) => <option key={b._id} value={b.slug}>{b.name}</option>)}</select></div>}
            <div className="field"><label>দাম (৳)</label><div style={{ display:"flex", gap:8 }}><input name="min" type="number" min="0" placeholder="ন্যূনতম" defaultValue={sp.min} /><input name="max" type="number" min="0" placeholder="সর্বোচ্চ" defaultValue={sp.max} /></div></div>
            <div className="field"><label>সাজান</label><select name="sort" defaultValue={sp.sort || ""}><option value="">নতুন আগে</option><option value="popular">জনপ্রিয়</option><option value="price_asc">দাম: কম → বেশি</option><option value="price_desc">দাম: বেশি → কম</option></select></div>
            <label style={{ fontSize: 13, display: "flex", gap: 8 }}><input type="checkbox" name="stock" value="1" defaultChecked={sp.stock === "1"} /> শুধু স্টকে আছে</label>
            {sp.category && <input type="hidden" name="category" value={sp.category} />}
            <button className="btn sm">ফিল্টার করুন</button>
          </form>
          <div>
            {res.items.length ? <div className="products" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))" }}>{res.items.map((p) => <ProductCard key={p._id} p={p} />)}</div> : <div className="panel empty">কোনো পণ্য পাওয়া যায়নি।</div>}
            {res.pages > 1 && <nav className="pager" aria-label="পেজ">{Array.from({ length: res.pages }, (_, i) => i + 1).map((n) => n === res.page ? <span key={n} className="on">{n}</span> : <Link key={n} href={link({ page: String(n) })}>{n}</Link>)}</nav>}
          </div>
        </div>
      </main>
    </Shell>
  );
}
