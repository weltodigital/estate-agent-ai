import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  enhancePhotoRequestSchema,
  stagePhotoRequestSchema,
  updatePhotoSchema,
} from "@app/shared/schemas";
import { notImplemented } from "../errors.js";

const photoParams = z.object({ id: z.string().uuid() });

export async function photoRoutes(app: FastifyInstance): Promise<void> {
  app.patch(
    "/photos/:id",
    { schema: { params: photoParams, body: updatePhotoSchema } },
    async () => {
      throw notImplemented("PATCH /v1/photos/:id");
    },
  );

  app.post(
    "/photos/:id/enhance",
    { schema: { params: photoParams, body: enhancePhotoRequestSchema } },
    async () => {
      throw notImplemented("POST /v1/photos/:id/enhance");
    },
  );

  app.post(
    "/photos/:id/stage",
    { schema: { params: photoParams, body: stagePhotoRequestSchema } },
    async () => {
      throw notImplemented("POST /v1/photos/:id/stage");
    },
  );
}
