import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createPropertySchema,
  generateDescriptionRequestSchema,
  updatePropertySchema,
} from "@app/shared/schemas";
import { notImplemented } from "../errors.js";

const idParams = z.object({ id: z.string().uuid() });

export async function propertyRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    throw notImplemented("GET /v1/properties");
  });

  app.post(
    "/",
    { schema: { body: createPropertySchema } },
    async () => {
      throw notImplemented("POST /v1/properties");
    },
  );

  app.get(
    "/:id",
    { schema: { params: idParams } },
    async () => {
      throw notImplemented("GET /v1/properties/:id");
    },
  );

  app.patch(
    "/:id",
    { schema: { params: idParams, body: updatePropertySchema } },
    async () => {
      throw notImplemented("PATCH /v1/properties/:id");
    },
  );

  app.delete(
    "/:id",
    { schema: { params: idParams } },
    async () => {
      throw notImplemented("DELETE /v1/properties/:id");
    },
  );

  app.post(
    "/:id/photos",
    { schema: { params: idParams } },
    async () => {
      throw notImplemented("POST /v1/properties/:id/photos");
    },
  );

  app.post(
    "/:id/description",
    { schema: { params: idParams, body: generateDescriptionRequestSchema } },
    async () => {
      throw notImplemented("POST /v1/properties/:id/description");
    },
  );

  app.post(
    "/:id/floor-plans",
    { schema: { params: idParams } },
    async () => {
      throw notImplemented("POST /v1/properties/:id/floor-plans");
    },
  );
}
