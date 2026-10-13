import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { createSession, setSessionCookie, isSameOrigin } from "@/lib/auth";
const schema=z.object({name:z.string().trim().min(2).max(100),email:z.string().email().max(180),password:z.string().min(10).max(100)});
export async function POST(req:NextRequest){if(!isSameOrigin(req))return NextResponse.json({error:"Invalid origin"},{status:403});try{const input=schema.parse(await req.json());await connectDB();const exists=await User.findOne({email:input.email.toLowerCase()});if(exists)return NextResponse.json({error:"Email already registered"},{status:409});const user=await User.create({name:input.name,email:input.email.toLowerCase(),passwordHash:await bcrypt.hash(input.password,12),role:"customer"});const token=await createSession(user);await setSessionCookie(token);return NextResponse.json({user:{id:String(user._id),name:user.name,email:user.email,role:user.role}},{status:201});}catch(e:any){return NextResponse.json({error:e.name==="ZodError"?"Please check the registration fields":"Registration failed"},{status:400})}}
