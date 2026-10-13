import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { guard } from "@/lib/adminGuard";

/** Signed direct-to-Cloudinary upload. The API secret never leaves the server. Use resource type `auto` (handles images and .glb). */
export async function POST(req: NextRequest) {
  const g = await guard(req, true); if (g) return g;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME, apiKey = process.env.CLOUDINARY_API_KEY, apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Cloudinary কনফিগার করা নেই (.env দেখুন) — চাইলে সরাসরি ইমেজ URL পেস্ট করুন" }, { status: 503 });
  const timestamp = Math.floor(Date.now() / 1000), folder = "electron";
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, apiSecret);
  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature });
}
