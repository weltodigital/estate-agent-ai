import type { UserRole } from "@app/shared/constants";
import { sendEmail } from "../integrations/resend.js";

/**
 * Privett-branded transactional emails. Plain inline-styled HTML for email
 * client compatibility (no external CSS, table layout, brand palette). The
 * wordmark is rendered as styled serif text rather than an image so it shows
 * even when a client blocks remote images. Sign-off is "— The Privett team".
 *
 * See BRANDING.md for the palette.
 */

const HEDGE = "#2E3B36";
const BONE = "#F5F1E8";
const CREAM = "#FAF7F0";
const TERRACOTTA = "#B5663D";
const INK = "#1A1F1C";
const WALNUT = "#4A453A";
const STONE = "#E4DFD0";
const SLATE = "#9A968A";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "an admin",
  agent: "an agent",
  viewer: "a viewer",
};

function shell(bodyHtml: string): string {
  return `
  <div style="margin:0;padding:0;background:${BONE};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BONE};padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
          <tr><td style="padding:8px 8px 24px;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${HEDGE};letter-spacing:-0.01em;">Privett</span>
          </td></tr>
          <tr><td style="background:${CREAM};border:0.5px solid ${STONE};border-radius:12px;padding:32px;">
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:24px 8px;color:${SLATE};font-size:12px;line-height:1.6;">
            Privett · Marketing software for UK estate agents
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${TERRACOTTA};color:${CREAM};text-decoration:none;font-size:15px;font-weight:500;padding:12px 22px;border-radius:8px;">${label}</a>`;
}

/**
 * Sends a team invitation. Best-effort: the caller catches failures and still
 * returns the invite_url so an admin can share the link manually.
 */
export async function sendInviteEmail(args: {
  to: string;
  agencyName: string;
  inviterEmail: string;
  role: UserRole;
  inviteUrl: string;
}): Promise<void> {
  const roleLabel = ROLE_LABELS[args.role];
  const body = `
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:24px;color:${INK};letter-spacing:-0.01em;">
      You've been invited to ${escapeHtml(args.agencyName)}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${WALNUT};">
      ${escapeHtml(args.inviterEmail)} has invited you to join
      <strong>${escapeHtml(args.agencyName)}</strong> on Privett as ${roleLabel}.
      Set up your account to start managing property marketing together.
    </p>
    <p style="margin:0 0 24px;">${button(args.inviteUrl, "Accept invitation")}</p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${SLATE};">
      Or paste this link into your browser:
    </p>
    <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:${WALNUT};word-break:break-all;">
      ${escapeHtml(args.inviteUrl)}
    </p>
    <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:${SLATE};">
      This invitation expires in 7 days.
    </p>
    <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:${WALNUT};">— The Privett team</p>`;

  await sendEmail({
    to: args.to,
    subject: `You've been invited to join ${args.agencyName} on Privett`,
    html: shell(body),
  });
}

/**
 * Notifies the Privett inbox of a marketing contact-form submission. Reply-To
 * is set to the sender so the team can reply straight from the notification.
 */
export async function sendContactEmail(args: {
  to: string;
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  const messageHtml = escapeHtml(args.message).replace(/\n/g, "<br>");
  const body = `
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:24px;color:${INK};letter-spacing:-0.01em;">
      New enquiry from ${escapeHtml(args.name)}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${WALNUT};">
      Someone got in touch via the Privett website.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${WALNUT};">
      <tr>
        <td style="padding:0 16px 8px 0;color:${SLATE};">Name</td>
        <td style="padding:0 0 8px;">${escapeHtml(args.name)}</td>
      </tr>
      <tr>
        <td style="padding:0 16px 8px 0;color:${SLATE};">Email</td>
        <td style="padding:0 0 8px;"><a href="mailto:${escapeHtml(args.email)}" style="color:${TERRACOTTA};">${escapeHtml(args.email)}</a></td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:${SLATE};">Message</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${INK};">${messageHtml}</p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:${SLATE};">
      Reply to this email to respond to ${escapeHtml(args.name)} directly.
    </p>`;

  await sendEmail({
    to: args.to,
    subject: `New enquiry from ${args.name}`,
    html: shell(body),
    replyTo: args.email,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
