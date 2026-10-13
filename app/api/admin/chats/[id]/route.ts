import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { guard } from "@/lib/adminGuard";
import ChatConversation from "@/models/ChatConversation";
import ChatMessage from "@/models/ChatMessage";

const messageSchema = /^[\s\S]{1,2000}$/;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(null); if (g) return g;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid chat ID" }, { status: 400 });
  const conversation = await ChatConversation.findByIdAndUpdate(id, { $set: { adminUnread: 0 } }, { new: true }).lean().exec() as {
    _id: unknown; customerName: string; customerPhone: string;
  } | null;
  if (!conversation) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  const messages = await ChatMessage.find({ conversation: conversation._id }).sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({
    conversation: { id: String(conversation._id), name: conversation.customerName, phone: conversation.customerPhone },
    messages: messages.reverse().map((message) => ({ id: String(message._id), sender: message.sender, text: message.text, createdAt: message.createdAt }))
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req, true); if (g) return g;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid chat ID" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (typeof body?.text !== "string" || !messageSchema.test(body.text.trim())) {
    return NextResponse.json({ error: "১ থেকে ২০০০ অক্ষরের মেসেজ দিন।" }, { status: 400 });
  }
  const conversation = await ChatConversation.findById(id);
  if (!conversation) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  const text = body.text.trim();
  conversation.lastMessage = text;
  conversation.lastMessageAt = new Date();
  conversation.visitorUnread += 1;
  await Promise.all([
    conversation.save(),
    ChatMessage.create({ conversation: conversation._id, sender: "admin", text })
  ]);
  return NextResponse.json({ ok: true }, { status: 201 });
}
