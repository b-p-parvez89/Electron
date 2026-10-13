import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import { guard, fail, esc } from "@/lib/adminGuard";
import { productSchema } from "@/lib/productSchema";
import { slugify, uniqueSlug } from "@/lib/http";
import { publishProductToSocial } from "@/lib/socialPublishing";
import { getSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const g = await guard(null); if (g) return g;
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const page = Math.max(1, Number(sp.get("page") || 1)), limit = 30;
  const filter: any = {};
  if (q) filter.$or = [{ name: new RegExp(esc(q), "i") }, { sku: new RegExp(esc(q), "i") }];
  const [items, total] = await Promise.all([
    Product.find(filter).populate("category", "name").populate("brand", "name").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter)
  ]);
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const g = await guard(req, true); if (g) return g;
  const parsed = productSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0]?.path.join(".") + ": " + parsed.error.issues[0]?.message);
  const d: any = parsed.data;
  d.slug = slugify(d.slug || d.name);
  if (!d.subcategory) delete d.subcategory;
  if (!d.brand) delete d.brand;
  d.variants = d.variants.map((v: any) => { if (!v._id) delete v._id; return v; });
  try {
    let p;
    try { p = await Product.create(d); } catch (e: any) { if (e?.code === 11000 && !e.keyPattern?.sku) { d.slug = uniqueSlug(d.name); p = await Product.create(d); } else throw e; }
    const settings = await getSettings();
    let socialPublish;
    if (p.active && settings.socialPublishing.autoPublishNewProducts) {
      try {
        socialPublish = await publishProductToSocial(p, ["facebook", "instagram"]);
      } catch (error) {
        console.error("Automatic product social publishing failed:", error);
        socialPublish = {
          facebook: { ok: false, error: "পণ্য সেভ হয়েছে, কিন্তু Facebook-এ পোস্ট করা যায়নি।" },
          instagram: { ok: false, error: "পণ্য সেভ হয়েছে, কিন্তু Instagram-এ পোস্ট করা যায়নি।" }
        };
      }
    }
    return NextResponse.json({ item: p, ...(socialPublish ? { socialPublish } : {}) }, { status: 201 });
  } catch (e: any) { return fail(e?.code === 11000 ? "SKU আগে থেকেই আছে" : "পণ্য সংরক্ষণ করা যায়নি"); }
}
