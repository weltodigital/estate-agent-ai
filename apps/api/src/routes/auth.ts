import type { FastifyInstance } from "fastify";
import {
  acceptInviteRequestSchema,
  acceptInviteResponseSchema,
  bootstrapAgencyRequestSchema,
  bootstrapAgencyResponseSchema,
} from "@app/shared/schemas";
import { notImplemented } from "../errors.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/bootstrap-agency",
    {
      schema: {
        body: bootstrapAgencyRequestSchema,
        response: { 200: bootstrapAgencyResponseSchema },
      },
    },
    async () => {
      throw notImplemented("POST /v1/auth/bootstrap-agency");
    },
  );

  app.post(
    "/accept-invite",
    {
      schema: {
        body: acceptInviteRequestSchema,
        response: { 200: acceptInviteResponseSchema },
      },
    },
    async () => {
      throw notImplemented("POST /v1/auth/accept-invite");
    },
  );
}
