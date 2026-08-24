import { SignJWT, jwtVerify } from "jose";

/**
 * Passwordless email OTP auth — session helpers.
 *
 * Flow:
 *   1. User enters email → /api/auth/request-code generates 6-digit OTP,
 *      stores it in DB with 10-min expiry. In dev (no SMTP), the code is
 *      returned in the response for display. In prod, it's emailed.
 *   2. User enters the code → /api/auth/verify-code checks it, creates or
 *      finds the User row, issues a JWT session token in an httpOnly cookie.
 *   3. middleware.ts checks the cookie on protected routes.
 *   4. /api/auth/signout clears the cookie.
 */

const SESSION_COOKIE = "fc_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? process.env.DATABASE_URL ?? "fallback-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
}

/** Sign a JWT session token for a user. */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

/** Verify a JWT session token. Returns the payload or null. */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId === "string" && typeof payload.email === "string") {
      return { userId: payload.userId, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}

/** Cookie name + options for the session token. */
export const sessionCookie = {
  name: SESSION_COOKIE,
  maxAge: SESSION_MAX_AGE,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
};

/** Generate a random 6-digit OTP code. */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** OTP expiry: 10 minutes from now. */
export function otpExpiry(): Date {
  return new Date(Date.now() + 10 * 60 * 1000);
}
