import { Schema, models, model } from "mongoose";
const CategorySchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, unique: true, index: true },
  parent: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
  description: { type: String, default: "", maxlength: 500 },
  image: { type: String, default: "" },
  icon: { type: String, default: "" },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  seoTitle: { type: String, maxlength: 70, default: "" },
  seoDescription: { type: String, maxlength: 170, default: "" }
}, { timestamps: true });
export default models.Category || model("Category", CategorySchema);
