import { Schema, models, model } from "mongoose";
const BrandSchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, unique: true },
  logo: { type: String, default: "" },
  description: { type: String, default: "", maxlength: 500 },
  active: { type: Boolean, default: true },
  seoTitle: { type: String, maxlength: 70, default: "" },
  seoDescription: { type: String, maxlength: 170, default: "" }
}, { timestamps: true });
export default models.Brand || model("Brand", BrandSchema);
