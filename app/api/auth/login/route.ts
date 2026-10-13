import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { createSession, setSessionCookie, isSameOrigin } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/http";
const schema=z.object({email:z.string().email(),password:z.string().min(1).max(100)});
export async function POST(req:NextRequest){if(!isSameOrigin(req))return NextResponse.json({error:"Invalid origin"},{status:403});if(!rateLimit("login:"+clientIp(req),10,10*60*1000))return NextResponse.json({error:"অনেকবার চেষ্টা করা হয়েছে, ১০ মিনিট পর আবার চেষ্টা করুন"},{status:429});try{const input=schema.parse(await req.json());await connectDB();const user=await User.findOne({email:input.email.toLowerCase()}).select("+passwordHash");if(!user||!(await bcrypt.compare(input.password,user.passwordHash)))return NextResponse.json({error:"Invalid email or password"},{status:401});const token=await createSession(user);await setSessionCookie(token);return NextResponse.json({user:{id:String(user._id),name:user.name,email:user.email,role:user.role}})}catch{return NextResponse.json({error:"Sign in failed"},{status:400})}}
