import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/adminGuard";
import ContactMessage from "@/models/ContactMessage";

export async function GET(req: NextRequest) {
  const g = await guard(null); if (g) return g;
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
  const filter = unreadOnly ? { status: "new" } : {};
  const [messages, unreadCount] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).limit(200).lean(),
    ContactMessage.countDocuments({ status: "new" })
  ]);
  return NextResponse.json({ messages, unreadCount });
}
