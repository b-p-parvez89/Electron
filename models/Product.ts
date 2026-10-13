import { Schema, models, model } from "mongoose";
const VariantSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  sku: { type: String, default: "", trim: true },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  image: { type: String, default: "" }
});
const ProductSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, index: true },
  sku: { type: String, trim: true, unique: true, sparse: true },
  description: { type: String, required: true, maxlength: 12000 },
  shortDescription: { type: String, default: "", maxlength: 300 },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5, min: 0 },
  soldCount: { type: Number, default: 0, min: 0 },
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
  subcategory: { type: Schema.Types.ObjectId, ref: "Category", index: true },
  brand: { type: Schema.Types.ObjectId, ref: "Brand", index: true },
  variants: { type: [VariantSchema], default: [] },
  images: [{ type: String }],
  spinImages: [{ type: String }],        // ordered frames for the 360° viewer
  model3dUrl: { type: String, default: "" }, // .glb/.gltf for the interactive 3D viewer
  specs: [{ key: String, value: String, _id: false }],
  tags: [{ type: String }],
  featured: { type: Boolean, default: false, index: true },
  active: { type: Boolean, default: true, index: true },
  seoTitle: { type: String, maxlength: 70, default: "" },
  seoDescription: { type: String, maxlength: 170, default: "" }
}, { timestamps: true });
ProductSchema.index({ name: "text", tags: "text", shortDescription: "text" });
export default models.Product || model("Product", ProductSchema);
