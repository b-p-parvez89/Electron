import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth";
import { clientIp } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import ChatConversation from "@/models/ChatConversation";
import ChatMessage from "@/models/ChatMessage";

const visitorSchema = z.string().uuid();
const postSchema = z.object({
  visitorKey: visitorSchema,
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(25).optional().default(""),
  text: z.string().trim().min(1).max(2000)
});
const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || "";
  const parsed = visitorSchema.safeParse(key);
  if (!parsed.success) return NextResponse.json({ conversation: null, messages: [], unreadCount: 0 });

  try {
    await connectDB();
    const conversation = await ChatConversation.findOne({ visitorKeyHash: hashKey(parsed.data) }).lean().exec() as {
      _id: unknown; customerName: string; customerPhone: string; visitorUnread: number;
    } | null;
    if (!conversation) return NextResponse.json({ conversation: null, messages: [], unreadCount: 0 });
    const messages = await ChatMessage.find({ conversation: conversation._id }).sort({ createdAt: -1 }).limit(100).lean();
    await ChatConversation.updateOne({ _id: conversation._id }, { $set: { visitorUnread: 0 } });
    return NextResponse.json({
      conversation: { id: String(conversation._id), name: conversation.customerName, phone: conversation.customerPhone },
      messages: messages.reverse().map((message) => ({ id: String(message._id), sender: message.sender, text: message.text, createdAt: message.createdAt })),
      unreadCount: conversation.visitorUnread
    });
  } catch (error) {
    console.error("Chat conversation could not be loaded:", error);
    return NextResponse.json({ error: "চ্যাট লোড করা যায়নি। পরে আবার চেষ্টা করুন।" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const input = postSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "নাম ও মেসেজ সঠিকভাবে দিন।" }, { status: 400 });

  const ip = clientIp(req);
  if (!rateLimit(`chat:${ip}`, 30, 10 * 60 * 1000) || !rateLimit(`chat-key:${hashKey(input.data.visitorKey)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "অনেকগুলো মেসেজ পাঠানো হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।" }, { status: 429 });
  }

  try {
    await connectDB();
    const visitorKeyHash = hashKey(input.data.visitorKey);
    let conversation = await ChatConversation.findOne({ visitorKeyHash });
    if (!conversation) {
      conversation = await ChatConversation.create({
        visitorKeyHash,
        customerName: input.data.name,
        customerPhone: input.data.phone
      });
    }
    conversation.customerName = input.data.name;
    if (input.data.phone) conversation.customerPhone = input.data.phone;
    conversation.lastMessage = input.data.text;
    conversation.lastMessageAt = new Date();
    conversation.adminUnread += 1;
    await Promise.all([
      conversation.save(),
      ChatMessage.create({ conversation: conversation._id, sender: "visitor", text: input.data.text })
    ]);
    return NextResponse.json({ conversationId: String(conversation._id) }, { status: 201 });
  } catch (error) {
    console.error("Chat message could not be sent:", error);
    return NextResponse.json({ error: "মেসেজ পাঠানো যায়নি। পরে আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
