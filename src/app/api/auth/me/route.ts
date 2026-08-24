import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";

export const runtime = "nodejs";

/** GET /api/auth/me — returns the current session user or null */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: session });
}
