import { Schema, models, model } from "mongoose";
const CouponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: "" },
  type: { type: String, enum: ["percent", "fixed", "free_shipping"], default: "percent" },
  value: { type: Number, default: 0, min: 0 },
  minOrder: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: 0, min: 0 },   // 0 = no cap (percent coupons)
  usageLimit: { type: Number, default: 0, min: 0 },    // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  startsAt: Date,
  endsAt: Date,
  active: { type: Boolean, default: true }
}, { timestamps: true });
export default models.Coupon || model("Coupon", CouponSchema);
