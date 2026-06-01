import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  enhancePhotoRequestSchema,
  enhancePhotoResponseSchema,
  photoSchema,
  stagePhotoRequestSchema,
  updatePhotoSchema,
} from "@app/shared/schemas";
import { notImplemented } from "../errors.js";
import { deletePhoto, updatePhoto } from "../services/photos.js";
import { enqueuePhotoEnhance } from "../services/photo-enhancements.js";

const photoParams = z.object({ id: z.string().uuid() });

export const photoRoutes: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    "/photos/:id",
    {
      schema: { params: photoParams, body: updatePhotoSchema, response: { 200: photoSchema } },
    },
    async (request) => updatePhoto(request, request.params.id, request.body),
  );

  app.delete(
    "/photos/:id",
    { schema: { params: photoParams, response: { 204: z.null() } } },
    async (request, reply) => {
      await deletePhoto(request, request.params.id);
      reply.code(204);
      return null;
    },
  );

  app.post(
    "/photos/:id/enhance",
    {
      schema: {
        params: photoParams,
        body: enhancePhotoRequestSchema,
        response: { 202: enhancePhotoResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await enqueuePhotoEnhance(request, request.params.id, request.body);
      reply.code(202);
      return result;
    },
  );

  app.post(
    "/photos/:id/stage",
    { schema: { params: photoParams, body: stagePhotoRequestSchema } },
    async () => {
      throw notImplemented("POST /v1/photos/:id/stage");
    },
  );
};
