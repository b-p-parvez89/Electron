import { Schema, models, model } from "mongoose";
const CourierProviderSchema = new Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ["steadfast", "pathao", "custom", "manual"], required: true },
  active: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  sandbox: { type: Boolean, default: false },
  credentials: { type: Schema.Types.Mixed, default: {}, select: false },   // AES-GCM encrypted values
  config: { type: Schema.Types.Mixed, default: {} }                       // non-secret settings (custom REST mapping, store id ...)
}, { timestamps: true });
export default models.CourierProvider || model("CourierProvider", CourierProviderSchema);
