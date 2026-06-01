import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  acceptInviteRequestSchema,
  acceptInviteResponseSchema,
  bootstrapAgencyRequestSchema,
  bootstrapAgencyResponseSchema,
  createInviteRequestSchema,
  createInviteResponseSchema,
  inviteSchema,
} from "@app/shared/schemas";
import { z } from "zod";
import {
  bootstrapNewAgency,
  consumeInvite,
  createInvite,
  listInvites,
  startTrialSubscription,
} from "../services/auth.js";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/bootstrap-agency",
    {
      schema: {
        body: bootstrapAgencyRequestSchema,
        response: { 200: bootstrapAgencyResponseSchema },
      },
    },
    async (request) => {
      const result = await bootstrapNewAgency(request, request.body);
      if (request.user) {
        await startTrialSubscription({
          agencyId: result.agency_id,
          agencyName: request.body.agency_name,
          adminEmail: request.user.email,
          adminFullName: request.body.full_name,
        });
      }
      return result;
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
    async (request) => consumeInvite(request, request.body),
  );

  app.post(
    "/invites",
    {
      schema: {
        body: createInviteRequestSchema,
        response: { 200: createInviteResponseSchema },
      },
    },
    async (request) => createInvite(request, request.body),
  );

  app.get(
    "/invites",
    {
      schema: { response: { 200: z.object({ items: z.array(inviteSchema) }) } },
    },
    async (request) => ({ items: await listInvites(request) }),
  );
};
