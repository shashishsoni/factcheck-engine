import { Resend } from "resend";

/**
 * Sends the OTP login code to the user's email via Resend.
 *
 * In development (no RESEND_API_KEY), the code is returned instead of sent,
 * so the UI can display it on screen for testing.
 *
 * Get a free API key at https://resend.com/api-keys
 * Free tier: 100 emails/day, 3000/month.
 *
 * For production with your own domain, set:
 *   RESEND_API_KEY="re_xxxxxxxx"
 *   RESEND_FROM_EMAIL="noreply@yourdomain.com"
 *
 * For quick testing without a custom domain, Resend provides:
 *   onboarding@resend.dev (only sends to YOUR account email)
 */

const DEFAULT_FROM = "FactChecker <noreply@resend.dev>";

export async function sendOtpEmail(
  email: string,
  code: string,
): Promise<{ sent: boolean; devCode?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  // No API key → dev mode, return the code for on-screen display
  if (!apiKey) {
    return { sent: false, devCode: code };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Your FactChecker login code",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #059669; font-size: 22px; font-weight: 600; margin: 0;">FactChecker</h1>
            <p style="color: #71717a; font-size: 14px; margin: 4px 0 0;">Your one-time login code</p>
          </div>
          <div style="background: #f4f4f5; border-radius: 12px; padding: 32px; text-align: center;">
            <p style="color: #52525b; font-size: 14px; margin: 0 0 16px;">Enter this code to sign in:</p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 0.5em; color: #059669; font-family: monospace; padding: 8px 0;">
              ${code}
            </div>
            <p style="color: #a1a1aa; font-size: 12px; margin: 16px 0 0;">Expires in 10 minutes</p>
          </div>
          <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 24px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `Your FactChecker login code is: ${code}\n\nIt expires in 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
    });

    if (error) {
      console.error("[auth] Resend error:", error);
      return { sent: false, error: error.message };
    }

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[auth] sendOtpEmail error:", message);
    return { sent: false, error: message };
  }
}
