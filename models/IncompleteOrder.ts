import { Schema, models, model } from "mongoose";
const IncompleteOrderSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  name: { type: String, default: "" }, phone: { type: String, default: "", index: true },
  email: { type: String, default: "" }, address: { type: String, default: "" }, city: { type: String, default: "" },
  items: [{ productId: String, variantId: String, name: String, variantName: String, quantity: Number, price: Number, image: String }],
  total: { type: Number, default: 0 },
  status: { type: String, enum: ["incomplete", "contacted", "recovered", "ignored"], default: "incomplete", index: true },
  note: { type: String, default: "" },
  lastSeenAt: { type: Date, default: Date.now, index: true },
  recoveredOrder: String
}, { timestamps: true });
export default models.IncompleteOrder || model("IncompleteOrder", IncompleteOrderSchema);
