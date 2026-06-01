import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  agencyLogoUploadRequestSchema,
  agencyLogoUploadResponseSchema,
  agencySchema,
  updateAgencySchema,
} from "@app/shared/schemas";
import { createLogoUpload, getMyAgency, updateMyAgency } from "../services/agencies.js";

export const agencyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/me", { schema: { response: { 200: agencySchema } } }, async (request) =>
    getMyAgency(request),
  );

  app.patch(
    "/me",
    { schema: { body: updateAgencySchema, response: { 200: agencySchema } } },
    async (request) => updateMyAgency(request, request.body),
  );

  app.post(
    "/me/logo",
    {
      schema: {
        body: agencyLogoUploadRequestSchema,
        response: { 200: agencyLogoUploadResponseSchema },
      },
    },
    async (request) => createLogoUpload(request, request.body),
  );
};
