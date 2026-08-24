import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

/** POST /api/auth/signout — clears the session cookie and redirects home */
export async function POST() {
  const response = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"));
  response.cookies.delete(sessionCookie.name);
  return response;
}
