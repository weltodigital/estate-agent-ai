import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { updateUserRequestSchema, usersListResponseSchema, userSchema } from "@app/shared/schemas";
import { listAgencyUsers, removeUser, updateUser } from "../services/users.js";

const idParams = z.object({ id: z.string().uuid() });

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/", { schema: { response: { 200: usersListResponseSchema } } }, async (request) => ({
    items: await listAgencyUsers(request),
  }));

  app.patch(
    "/:id",
    {
      schema: {
        params: idParams,
        body: updateUserRequestSchema,
        response: { 200: userSchema },
      },
    },
    async (request) => updateUser(request, request.params.id, request.body),
  );

  app.delete(
    "/:id",
    { schema: { params: idParams, response: { 204: z.null() } } },
    async (request, reply) => {
      await removeUser(request, request.params.id);
      reply.code(204);
      return null;
    },
  );
};
