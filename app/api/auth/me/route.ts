import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
export async function GET(){const user=await requireUser();if(!user)return NextResponse.json({error:"Not signed in"},{status:401});return NextResponse.json({user:{id:String(user._id),name:user.name,email:user.email,role:user.role}})}
