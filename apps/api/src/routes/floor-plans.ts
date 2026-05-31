import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  finaliseFloorPlanRequestSchema,
  updateFloorPlanRequestSchema,
} from "@app/shared/schemas";
import { notImplemented } from "../errors.js";

const idParams = z.object({ id: z.string().uuid() });

export async function floorPlanRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/floor-plans/:id",
    { schema: { params: idParams } },
    async () => {
      throw notImplemented("GET /v1/floor-plans/:id");
    },
  );

  app.patch(
    "/floor-plans/:id",
    { schema: { params: idParams, body: updateFloorPlanRequestSchema } },
    async () => {
      throw notImplemented("PATCH /v1/floor-plans/:id");
    },
  );

  app.post(
    "/floor-plans/:id/finalise",
    { schema: { params: idParams, body: finaliseFloorPlanRequestSchema } },
    async () => {
      throw notImplemented("POST /v1/floor-plans/:id/finalise");
    },
  );
}
