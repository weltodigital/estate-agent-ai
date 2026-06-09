import { z } from "zod";

// ---------------------------------------------------------------------------
// POST /v1/contact — public marketing contact form (useprivett.com).
//
// `company` is a honeypot: it's hidden from humans, so a real submission leaves
// it empty. When it's filled we accept the request but send nothing — see
// services/contact.ts. Keep it permissive here so bots get a 200, not a 400.
// ---------------------------------------------------------------------------
export const contactFormSchema = z.object({
  name: z.string().min(1, "Your name is required").max(120),
  email: z.string().email("Enter a valid email address"),
  message: z.string().min(1, "Add a short message").max(4000),
  company: z.string().max(200).optional(),
});
export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const contactResponseSchema = z.object({ ok: z.literal(true) });
export type ContactResponse = z.infer<typeof contactResponseSchema>;
