import mongoose, { Schema, models, model } from "mongoose";
const UserSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  authVersion: { type: Number, default: 0 },
  role: { type: String, enum: ["customer", "admin"], default: "customer", index: true },
  phone: { type: String, trim: true, maxlength: 30 },
  addresses: [{ label: String, recipient: String, phone: String, address: String, city: String, postalCode: String }]
}, { timestamps: true });
export default models.User || model("User", UserSchema);
