import { NextRequest, NextResponse } from "next/server";
import type { Model } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin, forbidden, isSameOrigin } from "@/lib/auth";
import { maskSecrets, mergeSecrets } from "@/lib/crypto";
import { slugify, uniqueSlug } from "@/lib/http";

export type CrudOptions = {
  model: Model<any>;
  allowed: string[];
  sort?: Record<string, 1 | -1>;
  secrets?: boolean;               // model has a `credentials` map that must be encrypted + masked
  autoSlug?: boolean;
  onSaved?: (doc: any) => Promise<void>;
  beforeDelete?: (doc: any) => Promise<string | null>;  // return an error message to block deletion
};

function pick(body: any, allowed: string[]) {
  const out: any = {};
  for (const k of allowed) if (body?.[k] !== undefined) out[k] = body[k];
  return out;
}
function serialize(doc: any, o: CrudOptions) {
  const obj = doc?.toObject ? doc.toObject() : doc;
  if (o.secrets) obj.credentials = maskSecrets(obj.credentials);
  return obj;
}
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const dupMsg = (e: any) => (e?.code === 11000 ? "এই নাম/কী আগে থেকেই আছে (duplicate)" : e?.message?.slice(0, 160) || "Invalid data");

export function collectionHandlers(o: CrudOptions) {
  return {
    async GET() {
      if (!(await requireAdmin())) return forbidden();
      await connectDB();
      const docs = await o.model.find().sort(o.sort || { createdAt: -1 }).limit(500);
      return NextResponse.json({ items: docs.map((d) => serialize(d, o)) });
    },
    async POST(req: NextRequest) {
      if (!isSameOrigin(req)) return bad("Invalid origin", 403);
      if (!(await requireAdmin())) return forbidden();
      try {
        await connectDB();
        const data = pick(await req.json(), o.allowed);
        if (o.secrets) data.credentials = mergeSecrets(data.credentials, {});
        if (o.autoSlug && !data.slug && data.name) data.slug = slugify(data.name);
        let doc;
        try { doc = await o.model.create(data); }
        catch (e: any) {
          if (e?.code === 11000 && o.autoSlug && data.slug) { data.slug = uniqueSlug(data.name); doc = await o.model.create(data); } else throw e;
        }
        if (o.onSaved) await o.onSaved(doc);
        return NextResponse.json({ item: serialize(doc, o) }, { status: 201 });
      } catch (e: any) { return bad(dupMsg(e)); }
    }
  };
}

export function itemHandlers(o: CrudOptions) {
  type Ctx = { params: Promise<{ id: string }> | { id: string } };
  return {
    async PUT(req: NextRequest, { params }: Ctx) {
      if (!isSameOrigin(req)) return bad("Invalid origin", 403);
      if (!(await requireAdmin())) return forbidden();
      try {
        await connectDB();
        const { id } = await params;
        const q = o.secrets ? o.model.findById(id).select("+credentials") : o.model.findById(id);
        const doc: any = await q;
        if (!doc) return bad("Not found", 404);
        const data = pick(await req.json(), o.allowed);
        if (o.secrets && data.credentials !== undefined) data.credentials = mergeSecrets(data.credentials, doc.credentials);
        doc.set(data);
        if (o.secrets) doc.markModified("credentials");
        if (data.config !== undefined) doc.markModified("config");
        await doc.save();
        if (o.onSaved) await o.onSaved(doc);
        return NextResponse.json({ item: serialize(doc, o) });
      } catch (e: any) { return bad(dupMsg(e)); }
    },
    async DELETE(req: NextRequest, { params }: Ctx) {
      if (!isSameOrigin(req)) return bad("Invalid origin", 403);
      if (!(await requireAdmin())) return forbidden();
      try {
        await connectDB();
        const { id } = await params;
        const doc: any = await o.model.findById(id);
        if (!doc) return bad("Not found", 404);
        if (o.beforeDelete) { const msg = await o.beforeDelete(doc); if (msg) return bad(msg, 409); }
        await doc.deleteOne();
        return NextResponse.json({ ok: true });
      } catch (e: any) { return bad(dupMsg(e)); }
    }
  };
}
