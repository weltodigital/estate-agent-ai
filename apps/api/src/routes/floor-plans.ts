import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  finaliseFloorPlanRequestSchema,
  floorPlanSchema,
  parseFloorPlanResponseSchema,
  updateFloorPlanRequestSchema,
} from "@app/shared/schemas";
import { notImplemented } from "../errors.js";
import { enqueueFloorPlanParse, getFloorPlan } from "../services/floor-plans.js";

const idParams = z.object({ id: z.string().uuid() });

export const floorPlanRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/floor-plans/:id",
    { schema: { params: idParams, response: { 200: floorPlanSchema } } },
    async (request) => getFloorPlan(request, request.params.id),
  );

  app.patch(
    "/floor-plans/:id",
    { schema: { params: idParams, body: updateFloorPlanRequestSchema } },
    async () => {
      throw notImplemented("PATCH /v1/floor-plans/:id");
    },
  );

  app.post(
    "/floor-plans/:id/parse",
    { schema: { params: idParams, response: { 202: parseFloorPlanResponseSchema } } },
    async (request, reply) => {
      const result = await enqueueFloorPlanParse(request, request.params.id);
      reply.code(202);
      return result;
    },
  );

  app.post(
    "/floor-plans/:id/finalise",
    { schema: { params: idParams, body: finaliseFloorPlanRequestSchema } },
    async () => {
      throw notImplemented("POST /v1/floor-plans/:id/finalise");
    },
  );
};
