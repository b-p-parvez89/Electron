import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Product from "@/models/Product";
import Coupon from "@/models/Coupon";
import CourierProvider from "@/models/CourierProvider";
import PaymentGateway from "@/models/PaymentGateway";
import type { CrudOptions } from "@/lib/crud";

export const categoryOpts: CrudOptions = {
  model: Category, autoSlug: true, sort: { sortOrder: 1, name: 1 },
  allowed: ["name", "slug", "parent", "description", "image", "icon", "sortOrder", "active", "seoTitle", "seoDescription"],
  beforeDelete: async (c) => {
    if (await Product.exists({ $or: [{ category: c._id }, { subcategory: c._id }] })) return "এই ক্যাটাগরিতে পণ্য আছে — আগে পণ্য সরান বা ক্যাটাগরি নিষ্ক্রিয় করুন";
    if (await Category.exists({ parent: c._id })) return "এই ক্যাটাগরির সাব-ক্যাটাগরি আছে";
    return null;
  }
};
export const brandOpts: CrudOptions = {
  model: Brand, autoSlug: true, sort: { name: 1 },
  allowed: ["name", "slug", "logo", "description", "active", "seoTitle", "seoDescription"],
  beforeDelete: async (b) => ((await Product.exists({ brand: b._id })) ? "এই ব্র্যান্ডে পণ্য আছে" : null)
};
export const couponOpts: CrudOptions = {
  model: Coupon, sort: { createdAt: -1 },
  allowed: ["code", "description", "type", "value", "minOrder", "maxDiscount", "usageLimit", "startsAt", "endsAt", "active"]
};
export const courierOpts: CrudOptions = {
  model: CourierProvider, secrets: true, sort: { createdAt: 1 },
  allowed: ["name", "type", "active", "isDefault", "sandbox", "config", "credentials"],
  onSaved: async (doc) => { if (doc.isDefault) await CourierProvider.updateMany({ _id: { $ne: doc._id } }, { isDefault: false }); }
};
export const gatewayOpts: CrudOptions = {
  model: PaymentGateway, secrets: true, sort: { sortOrder: 1, createdAt: 1 },
  allowed: ["key", "name", "type", "active", "sandbox", "sortOrder", "instructions", "accountNumber", "logo", "credentials"]
};
