import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { epcLookupRequestSchema, epcLookupResponseSchema } from "@app/shared/schemas";
import { lookupEpcByPostcode } from "../services/epc.js";

export const epcRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/lookup",
    {
      schema: {
        querystring: epcLookupRequestSchema,
        response: { 200: epcLookupResponseSchema },
      },
    },
    async (request) => lookupEpcByPostcode(request, request.query.postcode),
  );
};
