import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateOtpCode, otpExpiry } from "@/lib/auth/session";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email("Valid email is required"),
});

/**
 * POST /api/auth/request-code
 * Generates a 6-digit OTP and stores it in the DB.
 * In development (no SMTP configured), the code is returned in the response
 * so it can be displayed on screen. In production, it would be emailed.
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

  // In dev (no SMTP), return the code so the UI can display it.
  // In production, you'd send this via email (Mailtrap, Resend, etc.)
  const isDev = process.env.NODE_ENV !== "production";

  return NextResponse.json({
    ok: true,
    message: isDev
      ? `Code generated. Check the UI (dev mode shows the code).`
      : "Code sent to your email.",
    ...(isDev ? { devCode: code } : {}),
  });
}
