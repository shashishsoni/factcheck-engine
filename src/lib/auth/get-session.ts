import { cookies } from "next/headers";
import { verifySessionToken, sessionCookie, type SessionPayload } from "./session";

/**
 * Server-side helper to get the current session from the request cookies.
 * Returns null if not authenticated.
 *
 * Use in Server Components and API routes:
 *   const session = await getSession();
 *   if (!session) redirect("/login");
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(sessionCookie.name)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Get the current user's ID, or null if not authenticated. */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.userId ?? null;
}

/** Require authentication — returns the session or throws a redirect signal. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
