import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  createPropertySchema,
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
import { notImplemented } from "../errors.js";
import {
  createProperty,
  deleteProperty,
  getProperty,
  listProperties,
  updateProperty,
} from "../services/properties.js";
import { createPhotoUpload, listPropertyPhotos, reorderPhotos } from "../services/photos.js";

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
    async () => {
      throw notImplemented("POST /v1/properties/:id/description");
    },
  );

  app.post("/:id/floor-plans", { schema: { params: idParams } }, async () => {
    throw notImplemented("POST /v1/properties/:id/floor-plans");
  });
};
