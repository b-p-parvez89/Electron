import { Schema, models, model } from "mongoose";

const ContactMessageSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true, maxlength: 25 },
  email: { type: String, default: "", trim: true, lowercase: true, maxlength: 150 },
  subject: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  status: { type: String, enum: ["new", "read", "replied"], default: "new", index: true }
}, { timestamps: true });

export default models.ContactMessage || model("ContactMessage", ContactMessageSchema);
