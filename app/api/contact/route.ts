import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth";
import { clientIp } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import ContactMessage from "@/models/ContactMessage";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(25),
  email: z.union([z.literal(""), z.string().trim().email().max(150)]).optional().default(""),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(3000),
  company: z.string().max(200).optional().default("")
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "অনেকবার মেসেজ পাঠানো হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।" }, { status: 429 });
  }

  const input = contactSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "সঠিক নাম, ফোন, বিষয় ও মেসেজ দিন।" }, { status: 400 });
  if (input.data.company) return NextResponse.json({ ok: true });

  try {
    await connectDB();
    await ContactMessage.create({
      name: input.data.name,
      phone: input.data.phone,
      email: input.data.email,
      subject: input.data.subject,
      message: input.data.message
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Contact message submission failed:", error);
    return NextResponse.json({ error: "মেসেজ সংরক্ষণ করা যায়নি। পরে আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
