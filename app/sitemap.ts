import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  let products: any[] = [], cats: any[] = [];
  try { await connectDB(); [products, cats] = await Promise.all([Product.find({ active: true }).select("slug updatedAt").lean(), Category.find({ active: true }).select("slug updatedAt").lean()]); } catch {}
  const pages = ["about", "contact", "shipping", "returns", "privacy", "terms"];
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    ...cats.map((c) => ({ url: `${base}/shop?category=${c.slug}`, lastModified: c.updatedAt || new Date(), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt || new Date(), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...pages.map((s) => ({ url: `${base}/pages/${s}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 }))
  ];
}
