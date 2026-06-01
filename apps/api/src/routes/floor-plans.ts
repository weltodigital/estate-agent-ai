import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  finaliseFloorPlanRequestSchema,
  finaliseFloorPlanResponseSchema,
  floorPlanSchema,
  parseFloorPlanResponseSchema,
  updateFloorPlanRequestSchema,
} from "@app/shared/schemas";
import {
  enqueueFloorPlanParse,
  finaliseFloorPlan,
  getFloorPlan,
  updateEditorState,
} from "../services/floor-plans.js";

const idParams = z.object({ id: z.string().uuid() });

export const floorPlanRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/floor-plans/:id",
    { schema: { params: idParams, response: { 200: floorPlanSchema } } },
    async (request) => getFloorPlan(request, request.params.id),
  );

  app.patch(
    "/floor-plans/:id",
    {
      schema: {
        params: idParams,
        body: updateFloorPlanRequestSchema,
        response: { 200: floorPlanSchema },
      },
    },
    async (request) => updateEditorState(request, request.params.id, request.body),
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
    {
      schema: {
        params: idParams,
        body: finaliseFloorPlanRequestSchema,
        response: { 200: finaliseFloorPlanResponseSchema },
      },
    },
    async (request) => finaliseFloorPlan(request, request.params.id),
  );
};
