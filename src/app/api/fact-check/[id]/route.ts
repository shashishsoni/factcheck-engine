import { NextRequest, NextResponse } from "next/server";
import { prismaRepository } from "@/lib/storage/prisma-repository";
import { getUserId } from "@/lib/auth/get-session";

export const runtime = "nodejs";

// GET /api/fact-check/:id — get a single fact-check result
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getUserId();
  const result = await prismaRepository.getById(id, userId ?? undefined);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

// DELETE /api/fact-check/:id — remove a fact-check from history
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getUserId();
  try {
    await prismaRepository.delete(id, userId ?? undefined);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
