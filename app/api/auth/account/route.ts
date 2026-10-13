import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { createSession, getSession, isSameOrigin, setSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/http";
import User from "@/models/User";

const schema = z.object({
  currentPassword: z.string().min(1).max(100),
  email: z.string().trim().email().max(180).optional(),
  newPassword: z.string().min(10).max(100).optional()
}).refine((data) => data.email !== undefined || data.newPassword !== undefined, {
  message: "নতুন ইমেইল অথবা নতুন পাসওয়ার্ড দিন।"
});

export async function PUT(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit(`account-change:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "অনেকবার চেষ্টা করা হয়েছে। পরে আবার চেষ্টা করুন।" }, { status: 429 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const input = schema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message || "তথ্যগুলো যাচাই করুন।" }, { status: 400 });

  try {
    await connectDB();
    const user = await User.findById(session.id).select("+passwordHash name email role authVersion");
    if (!user || (user.authVersion || 0) !== session.version || !(await bcrypt.compare(input.data.currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "বর্তমান পাসওয়ার্ড সঠিক নয়।" }, { status: 401 });
    }

    const nextEmail = input.data.email?.toLowerCase();
    if (nextEmail && nextEmail !== user.email) {
      const existing = await User.exists({ email: nextEmail, _id: { $ne: user._id } });
      if (existing) return NextResponse.json({ error: "এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হচ্ছে।" }, { status: 409 });
      user.email = nextEmail;
    }
    if (input.data.newPassword) {
      user.passwordHash = await bcrypt.hash(input.data.newPassword, 12);
      user.authVersion = (user.authVersion || 0) + 1;
    }
    await user.save();

    const token = await createSession(user);
    await setSessionCookie(token);
    return NextResponse.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
  } catch (error: any) {
    if (error?.code === 11000) return NextResponse.json({ error: "এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হচ্ছে।" }, { status: 409 });
    console.error("Admin account update failed:", error);
    return NextResponse.json({ error: "অ্যাকাউন্ট আপডেট করা যায়নি। পরে আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
