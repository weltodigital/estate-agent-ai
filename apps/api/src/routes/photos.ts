import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  enhancePhotoRequestSchema,
  enhancePhotoResponseSchema,
  maskUploadRequestSchema,
  maskUploadResponseSchema,
  photoSchema,
  selectStagingVariationSchema,
  stagePhotoRequestSchema,
  stagePhotoResponseSchema,
  suggestStyleResponseSchema,
  updatePhotoSchema,
} from "@app/shared/schemas";
import { createMaskUpload, deletePhoto, updatePhoto } from "../services/photos.js";
import { enqueuePhotoEnhance } from "../services/photo-enhancements.js";
import {
  clearStagingVariations,
  enqueueStaging,
  selectStagingVariation,
} from "../services/staging.js";
import { suggestStyleForPhoto } from "../services/style-suggest.js";

const photoParams = z.object({ id: z.string().uuid() });

export const photoRoutes: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    "/photos/:id",
    {
      schema: { params: photoParams, body: updatePhotoSchema, response: { 200: photoSchema } },
    },
    async (request) => updatePhoto(request, request.params.id, request.body),
  );

  app.delete("/photos/:id", { schema: { params: photoParams } }, async (request, reply) => {
    await deletePhoto(request, request.params.id);
    return reply.code(204).send();
  });

  app.post(
    "/photos/:id/mask-upload",
    {
      schema: {
        params: photoParams,
        body: maskUploadRequestSchema,
        response: { 200: maskUploadResponseSchema },
      },
    },
    async (request) => createMaskUpload(request, request.params.id, request.body),
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
    {
      schema: {
        params: photoParams,
        body: stagePhotoRequestSchema,
        response: { 202: stagePhotoResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await enqueueStaging(request, request.params.id, request.body);
      reply.code(202);
      return result;
    },
  );

  app.post(
    "/photos/:id/staging/select",
    {
      schema: {
        params: photoParams,
        body: selectStagingVariationSchema,
        response: {
          200: z.object({
            photo_id: z.string().uuid(),
            selected_variation_id: z.string().uuid(),
            staged_url: z.string().url(),
          }),
        },
      },
    },
    async (request) =>
      selectStagingVariation(request, request.params.id, request.body.variation_id),
  );

  app.delete("/photos/:id/staging", { schema: { params: photoParams } }, async (request, reply) => {
    await clearStagingVariations(request, request.params.id);
    return reply.code(204).send();
  });

  app.post(
    "/photos/:id/suggest-style",
    { schema: { params: photoParams, response: { 200: suggestStyleResponseSchema } } },
    async (request) => suggestStyleForPhoto(request, request.params.id),
  );
};
