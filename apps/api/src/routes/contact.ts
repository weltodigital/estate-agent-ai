import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { contactFormSchema, contactResponseSchema } from "@app/shared/schemas";
import { submitContactForm } from "../services/contact.js";

/**
 * Public marketing contact form. Registered under /v1 so the full path is
 * /v1/contact — see PUBLIC_PATHS in hooks/auth.ts (no session required).
 */
export const contactRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/contact",
    {
      schema: {
        body: contactFormSchema,
        response: { 200: contactResponseSchema },
      },
    },
    async (request) => {
      await submitContactForm(request.body, request.log);
      return { ok: true as const };
    },
  );
};
