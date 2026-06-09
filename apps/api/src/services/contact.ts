import type { FastifyBaseLogger } from "fastify";
import type { ContactFormValues } from "@app/shared/schemas";
import { loadEnv } from "../env.js";
import { isEmailConfigured } from "../integrations/resend.js";
import { sendContactEmail } from "./email.js";

/**
 * Handles a public marketing contact-form submission by emailing the Privett
 * inbox. Sending is best-effort against config: when Resend isn't configured
 * (local/preview) we log the submission rather than fail the request.
 */
export async function submitContactForm(
  input: ContactFormValues,
  log: FastifyBaseLogger,
): Promise<void> {
  // Honeypot: the hidden `company` field is empty for real users. Bots fill it.
  // Accept silently (return ok) so they don't learn the form was rejected.
  if (input.company && input.company.trim().length > 0) {
    log.warn("contact form honeypot tripped; dropping submission");
    return;
  }

  if (!isEmailConfigured()) {
    log.warn(
      { name: input.name, email: input.email },
      "contact form submission received but email is not configured",
    );
    return;
  }

  await sendContactEmail({
    to: loadEnv().CONTACT_INBOX,
    name: input.name,
    email: input.email,
    message: input.message,
  });
}
