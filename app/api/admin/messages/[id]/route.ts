import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { guard } from "@/lib/adminGuard";
import ContactMessage from "@/models/ContactMessage";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req, true); if (g) return g;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (body?.status !== "read" && body?.status !== "replied") {
    return NextResponse.json({ error: "Invalid message status" }, { status: 400 });
  }
  const message = await ContactMessage.findByIdAndUpdate(id, { $set: { status: body.status } }, { new: true }).lean();
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  return NextResponse.json({ message });
}
