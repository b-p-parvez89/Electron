import { Schema, models, model } from "mongoose";
const StockMovementSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", index: true },
  variantId: String,
  delta: { type: Number, required: true },
  reason: { type: String, default: "" },      // order / restock / adjustment / cancel
  orderNumber: String,
  by: String
}, { timestamps: true });
export default models.StockMovement || model("StockMovement", StockMovementSchema);
