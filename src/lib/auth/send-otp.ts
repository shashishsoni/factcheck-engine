import nodemailer from "nodemailer";

/**
 * Sends the OTP login code to the user's email via Gmail SMTP.
 *
 * Setup (2 minutes):
 *   1. Go to https://myaccount.google.com/security
 *   2. Enable 2-Step Verification
 *   3. Search for "App passwords" → create one for "Mail"
 *   4. Copy the 16-char password
 *   5. Set in .env:
 *        GMAIL_USER="yourgmail@gmail.com"
 *        GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
 *
 * Without GMAIL_USER / GMAIL_APP_PASSWORD, the code is returned for on-screen
 * display (dev mode) so the UI can show it for local testing.
 *
 * Gmail free limits: ~500 emails/day. Good for small apps / testing.
 */
const DEFAULT_FROM_NAME = "FactChecker";

export async function sendOtpEmail(
  email: string,
  code: string,
): Promise<{ sent: boolean; devCode?: string; error?: string }> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  // No credentials → dev mode, return the code for on-screen display
  if (!gmailUser || !gmailPass) {
    return { sent: false, devCode: code };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const info = await transporter.sendMail({
      from: `${DEFAULT_FROM_NAME} <${gmailUser}>`,
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

    console.log(`[auth] OTP email sent to ${email}: ${info.messageId}`);
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[auth] sendOtpEmail error:", message);
    return { sent: false, error: message };
  }
}
