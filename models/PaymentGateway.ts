import { Schema, models, model } from "mongoose";
const PaymentGatewaySchema = new Schema({
  key: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ["cod", "sslcommerz", "manual"], required: true },
  active: { type: Boolean, default: true },
  sandbox: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  instructions: { type: String, default: "", maxlength: 600 },   // shown at checkout (e.g. "Send money to 01XXXXXXXXX")
  accountNumber: { type: String, default: "" },                  // manual gateways
  logo: { type: String, default: "" },
  credentials: { type: Schema.Types.Mixed, default: {}, select: false }
}, { timestamps: true });
export default models.PaymentGateway || model("PaymentGateway", PaymentGatewaySchema);
