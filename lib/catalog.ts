import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";

export const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
/** Documents created by upserts/older code may lack array fields; always hand the UI complete products. */
const fix = (p: any) => (p ? { ...p, variants: p.variants ?? [], images: p.images ?? [], spinImages: p.spinImages ?? [], specs: p.specs ?? [], tags: p.tags ?? [] } : p);
const fixAll = (a: any[]) => a.map(fix);
const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => { try { await connectDB(); return await fn(); } catch { return fallback; } };

export type PProduct = {
  _id: string; name: string; slug: string; description: string; shortDescription?: string; price: number; compareAtPrice?: number; stock: number;
  images: string[]; spinImages: string[]; model3dUrl?: string; featured?: boolean; sku?: string; tags?: string[];
  variants: { _id: string; name: string; price: number; compareAtPrice?: number; stock: number; image?: string; sku?: string }[];
  specs: { key: string; value: string }[]; category?: any; subcategory?: any; brand?: any; seoTitle?: string; seoDescription?: string; soldCount?: number;
};

export function priceRange(p: Pick<PProduct, "price" | "variants">) {
  if (!p.variants?.length) return { min: p.price, max: p.price };
  const prices = p.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
export function totalStock(p: Pick<PProduct, "stock" | "variants">) {
  return p.variants?.length ? p.variants.reduce((a, v) => a + v.stock, 0) : p.stock;
}

export const navCategories = () => safe(async () => plain(await Category.find({ active: true, parent: null }).sort({ sortOrder: 1, name: 1 }).lean()) as any[], []);
export const allCategories = () => safe(async () => plain(await Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean()) as any[], []);
export const activeBrands = () => safe(async () => plain(await Brand.find({ active: true }).sort({ name: 1 }).lean()) as any[], []);

export const homeProducts = () => safe(async () => {
  const pop = "category brand";
  const [featured, latest, best, offerCandidates] = await Promise.all([
    Product.find({ active: true, featured: true }).populate(pop, "name slug").sort({ createdAt: -1 }).limit(8).lean(),
    Product.find({ active: true }).populate(pop, "name slug").sort({ createdAt: -1 }).limit(8).lean(),
    Product.find({ active: true, soldCount: { $gt: 0 } }).populate(pop, "name slug").sort({ soldCount: -1 }).limit(4).lean(),
    Product.find({ active: true, $or: [{ compareAtPrice: { $gt: 0 } }, { "variants.compareAtPrice": { $gt: 0 } }] })
      .populate(pop, "name slug").sort({ updatedAt: -1 }).limit(40).lean()
  ]);
  const offer = offerCandidates.map((raw: any) => fix(raw)).map((p: any) => {
    const deals = [
      ...(p.compareAtPrice > p.price ? [{ price: p.price, compareAtPrice: p.compareAtPrice }] : []),
      ...p.variants.filter((v: any) => v.compareAtPrice > v.price).map((v: any) => ({ price: v.price, compareAtPrice: v.compareAtPrice }))
    ];
    const deal = deals.sort((a: any, b: any) => (b.compareAtPrice - b.price) / b.compareAtPrice - (a.compareAtPrice - a.price) / a.compareAtPrice)[0];
    return deal ? { product: p, ...deal, discount: Math.round((1 - deal.price / deal.compareAtPrice) * 100) } : null;
  }).filter(Boolean).sort((a: any, b: any) => b.discount - a.discount)[0] || null;
  return plain({ featured: fixAll(featured), latest: fixAll(latest), best: fixAll(best), offer }) as unknown as { featured: PProduct[]; latest: PProduct[]; best: PProduct[]; offer: { product: PProduct; price: number; compareAtPrice: number; discount: number } | null };
}, { featured: [], latest: [], best: [], offer: null });

export type ShopQuery = { q?: string; category?: string; brand?: string; min?: number; max?: number; sort?: string; page?: number; inStock?: boolean };
export const listProducts = (f: ShopQuery) => safe(async () => {
  const filter: any = { active: true };
  const clauses: any[] = [];
  if (f.q) {
    const escaped = f.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const term = new RegExp(escaped, "i");
    clauses.push({ $or: [{ name: term }, { shortDescription: term }, { sku: term }, { tags: term }] });
  }
  if (f.category) {
    const cat = await Category.findOne({ slug: f.category, active: true }).lean() as any;
    if (cat) {
      const kids = await Category.find({ parent: cat._id }).select("_id").lean();
      const ids = [cat._id, ...kids.map((k: any) => k._id)];
      clauses.push({ $or: [{ category: { $in: ids } }, { subcategory: { $in: ids } }] });
    } else filter._id = null;
  }
  if (f.brand) { const b = await Brand.findOne({ slug: f.brand }).select("_id").lean() as any; if (b) filter.brand = b._id; else filter._id = null; }
  if (f.min != null || f.max != null) {
    const range = { ...(f.min != null ? { $gte: f.min } : {}), ...(f.max != null ? { $lte: f.max } : {}) };
    clauses.push({ $or: [{ price: range }, { variants: { $elemMatch: { price: range } } }] });
  }
  if (f.inStock) clauses.push({ $or: [{ stock: { $gt: 0 } }, { variants: { $elemMatch: { stock: { $gt: 0 } } } }] });
  if (clauses.length) filter.$and = clauses;
  const sort: any = f.sort === "price_asc" ? { price: 1 } : f.sort === "price_desc" ? { price: -1 } : f.sort === "popular" ? { soldCount: -1 } : { createdAt: -1 };
  const limit = 12, page = Math.max(1, f.page || 1);
  const q = Product.find(filter).populate("category brand", "name slug").sort(sort).skip((page - 1) * limit).limit(limit).lean();
  const [items, total] = await Promise.all([q, Product.countDocuments(filter)]);
  return { items: plain(fixAll(items as any[])) as unknown as PProduct[], total, pages: Math.max(1, Math.ceil(total / limit)), page };
}, { items: [] as PProduct[], total: 0, pages: 1, page: 1 });

export const getProduct = (slug: string) => safe(async () => {
  const p = await Product.findOne({ slug, active: true }).populate("category subcategory brand", "name slug").lean();
  return p ? (plain(fix(p)) as unknown as PProduct) : null;
}, null);

export const relatedProducts = (p: PProduct) => safe(async () => {
  const cat = p.category?._id;
  if (!cat) return [] as PProduct[];
  return plain(fixAll(await Product.find({ active: true, category: cat, _id: { $ne: p._id } }).populate("category brand", "name slug").sort({ soldCount: -1 }).limit(4).lean() as any[])) as unknown as PProduct[];
}, [] as PProduct[]);
