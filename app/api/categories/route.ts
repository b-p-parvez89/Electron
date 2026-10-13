import { NextResponse } from "next/server";
import { allCategories } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ categories: await allCategories() }); }
