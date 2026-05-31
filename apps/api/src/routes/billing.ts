import type { FastifyInstance } from "fastify";
import {
  checkoutSessionRequestSchema,
  portalSessionRequestSchema,
} from "@app/shared/schemas";
import { notImplemented } from "../errors.js";

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/checkout-session",
    { schema: { body: checkoutSessionRequestSchema } },
    async () => {
      throw notImplemented("POST /v1/billing/checkout-session");
    },
  );

  app.post(
    "/portal-session",
    { schema: { body: portalSessionRequestSchema } },
    async () => {
      throw notImplemented("POST /v1/billing/portal-session");
    },
  );
}
