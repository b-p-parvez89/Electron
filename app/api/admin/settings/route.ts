import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, fail } from "@/lib/adminGuard";
import { getAdminSettings, saveSettings } from "@/lib/settings";

const s = (n = 300) => z.string().max(n).optional();
const schema = z.object({
  siteName: s(60), tagline: s(160), logo: s(1000), favicon: s(1000), phone: s(30), whatsapp: s(30), email: s(120), address: s(300), announcement: s(200),
  banner: z.object({
    active: z.boolean().optional(), eyebrow: s(80), title: s(160), description: s(500), image: s(1000),
    buttonText: s(50), productId: z.string().max(50).refine((id) => !id || /^[a-f\d]{24}$/i.test(id)), linkUrl: s(500)
  }).optional(),
  shipping: z.object({ insideDhaka: z.coerce.number().min(0), outsideDhaka: z.coerce.number().min(0), freeOver: z.coerce.number().min(0) }).optional(),
  tracking: z.object({
    metaPixelId: s(40), metaAccessToken: s(600), metaTestEventCode: s(40), ga4Id: s(40), ga4ApiSecret: s(120), gtmId: s(40), serverSide: z.boolean().optional()
  }).optional(),
  socialPublishing: z.object({
    facebookPageId: s(100), instagramAccountId: s(100), pageAccessToken: s(2000),
    apiVersion: z.string().regex(/^v\d+\.\d+$/).optional(), autoPublishNewProducts: z.boolean().optional()
  }).optional(),
  seo: z.object({ title: s(70), description: s(170), ogImage: s(1000), keywords: s(300) }).optional(),
  pageSeo: z.array(z.object({ path: z.string().max(200), title: z.string().max(70), description: z.string().max(170) })).max(60).optional(),
  social: z.object({ facebook: s(300), instagram: s(300), youtube: s(300) }).optional()
}).strict();

export async function GET() {
  const g = await guard(null); if (g) return g;
  return NextResponse.json({ settings: await getAdminSettings() });
}
export async function PUT(req: NextRequest) {
  const g = await guard(req, true); if (g) return g;
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return fail(p.error.issues[0]?.path.join(".") + ": " + p.error.issues[0]?.message);
  await saveSettings(p.data as any);
  return NextResponse.json({ settings: await getAdminSettings() });
}
