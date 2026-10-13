import { Schema, models, model } from "mongoose";

const ChatConversationSchema = new Schema({
  visitorKeyHash: { type: String, required: true, unique: true, index: true },
  customerName: { type: String, required: true, trim: true, maxlength: 100 },
  customerPhone: { type: String, default: "", trim: true, maxlength: 25 },
  lastMessage: { type: String, default: "" },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  adminUnread: { type: Number, default: 0 },
  visitorUnread: { type: Number, default: 0 }
}, { timestamps: true });

export default models.ChatConversation || model("ChatConversation", ChatConversationSchema);
