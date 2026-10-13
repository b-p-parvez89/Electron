import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import Product from "@/models/Product";
import { guard } from "@/lib/adminGuard";
import { publishProductToSocial, type SocialPlatform } from "@/lib/socialPublishing";

const schema = z.object({
  platforms: z.array(z.enum(["facebook", "instagram"])).min(1).max(2),
  caption: z.string().trim().max(2000).optional()
}).refine((value) => new Set(value.platforms).size === value.platforms.length, { message: "একই platform একাধিকবার দেওয়া যাবে না।" });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req, true); if (g) return g;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || "Invalid publish request" }, { status: 400 });

  const product = await Product.findById(id).lean().exec() as {
    active: boolean; name: string; slug: string; shortDescription?: string; description: string; images: string[]; price: number;
  } | null;
  if (!product) return NextResponse.json({ error: "পণ্যটি পাওয়া যায়নি।" }, { status: 404 });
  if (!product.active) return NextResponse.json({ error: "Inactive পণ্য public product page-এ দেখা যায় না; আগে পণ্যটি active করুন।" }, { status: 400 });
  const result = await publishProductToSocial(product, body.data.platforms as SocialPlatform[], body.data.caption);
  return NextResponse.json({ result });
}
