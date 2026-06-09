import { loadEnv } from "../env.js";

/**
 * Resend transactional email — called via the REST API (no SDK dependency).
 *
 * Optional: when RESEND_API_KEY isn't set, sendEmail is a no-op so dev/preview
 * environments run without email configured. The caller treats sending as
 * best-effort and surfaces the invite_url regardless.
 */

export function isEmailConfigured(): boolean {
  return Boolean(loadEnv().RESEND_API_KEY);
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  /** Optional Reply-To, e.g. so a contact-form notification replies to the sender. */
  replyTo?: string;
}): Promise<void> {
  const env = loadEnv();
  if (!env.RESEND_API_KEY) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      ...(args.replyTo ? { reply_to: args.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
}
