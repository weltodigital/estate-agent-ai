import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  createFloorPlanRequestSchema,
  createFloorPlanResponseSchema,
  createPropertySchema,
  floorPlansListResponseSchema,
  generateDescriptionRequestSchema,
  photosListResponseSchema,
  propertyListQuerySchema,
  propertyListResponseSchema,
  propertySchema,
  reorderPhotosRequestSchema,
  updatePropertySchema,
  uploadPhotoSignedRequestSchema,
  uploadPhotoSignedResponseSchema,
} from "@app/shared/schemas";
import {
  createProperty,
  deleteProperty,
  getProperty,
  listProperties,
  updateProperty,
} from "../services/properties.js";
import { createPhotoUpload, listPropertyPhotos, reorderPhotos } from "../services/photos.js";
import { streamDescription } from "../services/descriptions.js";
import { createFloorPlan, listFloorPlans } from "../services/floor-plans.js";

const idParams = z.object({ id: z.string().uuid() });

export const propertyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/",
    {
      schema: {
        querystring: propertyListQuerySchema,
        response: { 200: propertyListResponseSchema },
      },
    },
    async (request) => listProperties(request, request.query),
  );

  app.post(
    "/",
    { schema: { body: createPropertySchema, response: { 200: propertySchema } } },
    async (request) => createProperty(request, request.body),
  );

  app.get(
    "/:id",
    { schema: { params: idParams, response: { 200: propertySchema } } },
    async (request) => getProperty(request, request.params.id),
  );

  app.patch(
    "/:id",
    {
      schema: { params: idParams, body: updatePropertySchema, response: { 200: propertySchema } },
    },
    async (request) => updateProperty(request, request.params.id, request.body),
  );

  app.delete(
    "/:id",
    { schema: { params: idParams, response: { 204: z.null() } } },
    async (request, reply) => {
      await deleteProperty(request, request.params.id);
      reply.code(204);
      return null;
    },
  );

  app.get(
    "/:id/photos",
    { schema: { params: idParams, response: { 200: photosListResponseSchema } } },
    async (request) => ({
      items: await listPropertyPhotos(request, request.params.id),
    }),
  );

  app.post(
    "/:id/photos",
    {
      schema: {
        params: idParams,
        body: uploadPhotoSignedRequestSchema,
        response: { 200: uploadPhotoSignedResponseSchema },
      },
    },
    async (request) => createPhotoUpload(request, request.params.id, request.body),
  );

  app.patch(
    "/:id/photos/reorder",
    {
      schema: {
        params: idParams,
        body: reorderPhotosRequestSchema,
        response: { 200: photosListResponseSchema },
      },
    },
    async (request) => ({
      items: await reorderPhotos(request, request.params.id, request.body.photo_ids),
    }),
  );

  app.post(
    "/:id/description",
    { schema: { params: idParams, body: generateDescriptionRequestSchema } },
    async (request, reply) => {
      // Stream plain UTF-8 text. We bypass Fastify's reply serialiser by
      // writing to the underlying Node response — the Zod response schema is
      // intentionally omitted for this route.
      //
      // Hijacking skips the @fastify/cors onSend hook too, so we have to
      // write CORS headers manually or the browser refuses the response.
      const origin = request.headers.origin;
      reply.hijack();
      const headers: Record<string, string> = {
        "content-type": "text/plain; charset=utf-8",
        "transfer-encoding": "chunked",
        "cache-control": "no-store",
      };
      if (typeof origin === "string") {
        headers["access-control-allow-origin"] = origin;
        headers["access-control-allow-credentials"] = "true";
        headers["vary"] = "origin";
      }
      reply.raw.writeHead(200, headers);
      try {
        await streamDescription(request, request.params.id, request.body, (chunk) => {
          reply.raw.write(chunk);
        });
      } catch (err) {
        request.log.error({ err }, "stream_description failed");
        // We can't change the status mid-stream; send a marker so the client
        // can detect failure and surface a message.
        reply.raw.write(`\n\n[ERROR] ${err instanceof Error ? err.message : "stream failed"}`);
      } finally {
        reply.raw.end();
      }
    },
  );

  app.get(
    "/:id/floor-plans",
    { schema: { params: idParams, response: { 200: floorPlansListResponseSchema } } },
    async (request) => ({
      items: await listFloorPlans(request, request.params.id),
    }),
  );

  app.post(
    "/:id/floor-plans",
    {
      schema: {
        params: idParams,
        body: createFloorPlanRequestSchema,
        response: { 200: createFloorPlanResponseSchema },
      },
    },
    async (request) => createFloorPlan(request, request.params.id, request.body),
  );
};
