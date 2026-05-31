import type { FastifyInstance } from "fastify";
import { epcLookupRequestSchema } from "@app/shared/schemas";
import { notImplemented } from "../errors.js";

export async function epcRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/lookup",
    { schema: { querystring: epcLookupRequestSchema } },
    async () => {
      throw notImplemented("GET /v1/epc/lookup");
    },
  );
}
