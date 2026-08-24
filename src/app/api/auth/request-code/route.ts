import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateOtpCode, otpExpiry } from "@/lib/auth/session";
import { sendOtpEmail } from "@/lib/auth/send-otp";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email("Valid email is required"),
});

/**
 * POST /api/auth/request-code
 * Generates a 6-digit OTP, stores it in the DB, and emails it via Resend.
 * In dev (no RESEND_API_KEY), the code is returned for on-screen display.
 */
export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues : "Invalid email" },
      { status: 400 },
    );
  }

  const email = parsed.email.toLowerCase().trim();

  // Find or create the user
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  // Invalidate any previous unused codes
  await prisma.otpCode.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  // Generate new code
  const code = generateOtpCode();
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      code,
      expiresAt: otpExpiry(),
    },
  });

  // Send the code via email (or return it in dev mode)
  const result = await sendOtpEmail(email, code);

  if (result.error) {
    return NextResponse.json(
      { error: `Failed to send code: ${result.error}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: result.sent
      ? "Code sent to your email."
      : "Code generated (dev mode — check the UI).",
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
}
