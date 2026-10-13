import Coupon from "@/models/Coupon";

export type CouponResult = { ok: true; code: string; discount: number; freeShipping: boolean; id: string; description: string } | { ok: false; error: string };

export async function evaluateCoupon(codeRaw: string, subtotal: number): Promise<CouponResult> {
  const code = String(codeRaw || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "কুপন কোড লিখুন" };
  const c = await Coupon.findOne({ code, active: true }).lean() as any;
  const now = new Date();
  if (!c) return { ok: false, error: "কুপন কোডটি সঠিক নয়" };
  if (c.startsAt && c.startsAt > now) return { ok: false, error: "এই কুপন এখনো শুরু হয়নি" };
  if (c.endsAt && c.endsAt < now) return { ok: false, error: "কুপনের মেয়াদ শেষ হয়ে গেছে" };
  if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) return { ok: false, error: "কুপনের ব্যবহারের সীমা শেষ" };
  if (subtotal < c.minOrder) return { ok: false, error: `এই কুপনের জন্য ন্যূনতম অর্ডার ৳${c.minOrder}` };
  let discount = 0;
  if (c.type === "percent") {
    discount = Math.round((subtotal * c.value) / 100);
    if (c.maxDiscount > 0) discount = Math.min(discount, c.maxDiscount);
  } else if (c.type === "fixed") discount = Math.min(c.value, subtotal);
  return { ok: true, code, discount, freeShipping: c.type === "free_shipping", id: String(c._id), description: c.description || "" };
}

/** Atomically consume one use; returns false if the limit was reached in the meantime. */
export async function consumeCoupon(id: string) {
  const r = await Coupon.updateOne(
    { _id: id, $or: [{ usageLimit: 0 }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }] },
    { $inc: { usedCount: 1 } }
  );
  return r.modifiedCount === 1;
}
export async function releaseCoupon(code: string) {
  if (code) await Coupon.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}
