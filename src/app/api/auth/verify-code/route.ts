import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, sessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email("Valid email is required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

/**
 * POST /api/auth/verify-code
 * Verifies the OTP code and sets a session cookie (JWT).
 * Creates the user if they don't exist yet (one-time sign-in).
 */
export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues : "Invalid request" },
      { status: 400 },
    );
  }

  const email = parsed.email.toLowerCase().trim();
  const code = parsed.code.trim();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "No code requested for this email" }, { status: 400 });
  }

  // Find the most recent unused, non-expired code for this user
  const otp = await prisma.otpCode.findFirst({
    where: {
      userId: user.id,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  // Mark code as used
  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { used: true },
  });

  // Issue session token
  const token = await createSessionToken({ userId: user.id, email: user.email });

  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });

  response.cookies.set(sessionCookie.name, token, {
    ...sessionCookie.options,
    maxAge: sessionCookie.maxAge,
  });

  return response;
}
