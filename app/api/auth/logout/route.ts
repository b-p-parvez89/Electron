import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, isSameOrigin } from "@/lib/auth";
export async function POST(req:NextRequest){if(!isSameOrigin(req))return NextResponse.json({error:"Invalid origin"},{status:403});await clearSessionCookie();return NextResponse.json({ok:true})}
