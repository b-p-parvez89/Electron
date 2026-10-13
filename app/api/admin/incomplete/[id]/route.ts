import { NextRequest, NextResponse } from "next/server";
import IncompleteOrder from "@/models/IncompleteOrder";
import { guard, fail } from "@/lib/adminGuard";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req, true); if (g) return g;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const upd: any = {};
  if (["incomplete", "contacted", "recovered", "ignored"].includes(b.status)) upd.status = b.status;
  if (typeof b.note === "string") upd.note = b.note.slice(0, 500);
  const d = await IncompleteOrder.findByIdAndUpdate(id, { $set: upd }, { new: true });
  return d ? NextResponse.json({ item: d }) : fail("Not found", 404);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req, true); if (g) return g;
  const { id } = await params;
  await IncompleteOrder.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
