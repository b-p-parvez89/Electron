import { z } from "zod";
const oid = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().regex(/^[a-f\d]{24}$/i).optional());
const num = z.coerce.number().finite();
const optNum = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.number().min(0).optional());
const urls = z.array(z.string().max(1000)).max(80).default([]);
export const productSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(200).optional(),
  sku: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(60).optional()),
  description: z.string().trim().min(2).max(12000),
  shortDescription: z.string().trim().max(300).optional().default(""),
  price: num.min(0),
  compareAtPrice: optNum,
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  category: z.string().regex(/^[a-f\d]{24}$/i, "ক্যাটাগরি নির্বাচন করুন"),
  subcategory: oid, brand: oid,
  variants: z.array(z.object({
    _id: oid, name: z.string().trim().min(1).max(100), sku: z.string().trim().max(60).optional().default(""),
    price: num.min(0), compareAtPrice: optNum, stock: z.coerce.number().int().min(0).default(0), image: z.string().max(1000).optional().default("")
  })).max(60).default([]),
  images: urls, spinImages: urls,
  model3dUrl: z.string().max(1000).optional().default(""),
  specs: z.array(z.object({ key: z.string().trim().max(60), value: z.string().trim().max(200) })).max(40).default([]),
  tags: z.array(z.string().trim().max(40)).max(30).default([]),
  featured: z.boolean().default(false), active: z.boolean().default(true),
  seoTitle: z.string().max(70).optional().default(""), seoDescription: z.string().max(170).optional().default("")
});
