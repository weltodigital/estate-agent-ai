import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  billingStatusResponseSchema,
  checkoutSessionRequestSchema,
  checkoutSessionResponseSchema,
  portalSessionRequestSchema,
  portalSessionResponseSchema,
} from "@app/shared/schemas";
import {
  createCheckoutSession,
  createPortalSession,
  getBillingStatus,
} from "../services/billing.js";

export const billingRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/status",
    { schema: { response: { 200: billingStatusResponseSchema } } },
    async (request) => getBillingStatus(request),
  );

  app.post(
    "/checkout-session",
    {
      schema: {
        body: checkoutSessionRequestSchema,
        response: { 200: checkoutSessionResponseSchema },
      },
    },
    async (request) => createCheckoutSession(request, request.body),
  );

  app.post(
    "/portal-session",
    {
      schema: {
        body: portalSessionRequestSchema,
        response: { 200: portalSessionResponseSchema },
      },
    },
    async (request) => createPortalSession(request, request.body),
  );
};
