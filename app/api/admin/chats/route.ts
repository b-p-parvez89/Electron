import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/adminGuard";
import ChatConversation from "@/models/ChatConversation";

export async function GET(req: NextRequest) {
  const g = await guard(null); if (g) return g;
  const [conversations, unreadCount] = await Promise.all([
    ChatConversation.find().sort({ lastMessageAt: -1 }).limit(100).lean(),
    ChatConversation.countDocuments({ adminUnread: { $gt: 0 } })
  ]);
  return NextResponse.json({
    conversations: conversations.map((conversation) => ({
      id: String(conversation._id),
      name: conversation.customerName,
      phone: conversation.customerPhone,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: conversation.adminUnread
    })),
    unreadCount
  });
}
