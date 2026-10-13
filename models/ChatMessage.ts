import { Schema, models, model } from "mongoose";

const ChatMessageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: "ChatConversation", required: true, index: true },
  sender: { type: String, enum: ["visitor", "admin"], required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true });

ChatMessageSchema.index({ conversation: 1, createdAt: 1 });

export default models.ChatMessage || model("ChatMessage", ChatMessageSchema);
