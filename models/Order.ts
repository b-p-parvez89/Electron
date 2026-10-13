import { Schema, models, model } from "mongoose";
const OrderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", index: true },
  customer: {
    name: { type: String, required: true }, email: { type: String, default: "" },
    phone: { type: String, required: true, index: true }, address: { type: String, required: true },
    city: { type: String, required: true }, postalCode: String
  },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: "Product" }, variantId: String, variantName: String,
    name: String, image: String, sku: String, quantity: Number, unitPrice: Number
  }],
  subtotal: { type: Number, required: true }, shipping: { type: Number, default: 0 },
  discount: { type: Number, default: 0 }, couponCode: { type: String, default: "" },
  total: { type: Number, required: true },
  note: { type: String, default: "" },
  adminNote: { type: String, default: "" },
  paymentMethod: { type: String, required: true },   // PaymentGateway.key (cod, sslcommerz, bkash-manual ...)
  paymentStatus: { type: String, enum: ["unpaid", "pending", "paid", "failed", "refunded"], default: "unpaid", index: true },
  paymentReference: { type: String, default: "" },   // customer-supplied TrxID for manual gateways
  transactionId: { type: String, index: true, sparse: true },
  gatewayValId: String,
  status: { type: String, enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"], default: "pending", index: true },
  statusHistory: [{ status: String, note: String, at: Date, _id: false }],
  courier: {
    providerId: { type: Schema.Types.ObjectId, ref: "CourierProvider" }, provider: String,
    consignmentId: String, trackingCode: String, trackingUrl: String, status: String, bookedAt: Date,
    events: [{ status: String, note: String, at: Date, _id: false }]
  },
  eventId: String,
  tracking: { fbp: String, fbc: String, ip: String, ua: String, url: String, gaClientId: String },
  purchaseTracked: { type: Boolean, default: false },
  stockRestored: { type: Boolean, default: false }
}, { timestamps: true });
export default models.Order || model("Order", OrderSchema);
