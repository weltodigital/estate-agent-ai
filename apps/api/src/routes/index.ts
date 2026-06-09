import type { FastifyInstance } from "fastify";
import { agencyRoutes } from "./agencies.js";
import { authRoutes } from "./auth.js";
import { propertyRoutes } from "./properties.js";
import { photoRoutes } from "./photos.js";
import { floorPlanRoutes } from "./floor-plans.js";
import { epcRoutes } from "./epc.js";
import { billingRoutes } from "./billing.js";
import { userRoutes } from "./users.js";
import { webhookRoutes } from "./webhooks.js";
import { contactRoutes } from "./contact.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes, { prefix: "/v1/auth" });
  await app.register(agencyRoutes, { prefix: "/v1/agencies" });
  await app.register(userRoutes, { prefix: "/v1/users" });
  await app.register(propertyRoutes, { prefix: "/v1/properties" });
  await app.register(photoRoutes, { prefix: "/v1" });
  await app.register(floorPlanRoutes, { prefix: "/v1" });
  await app.register(epcRoutes, { prefix: "/v1/epc" });
  await app.register(billingRoutes, { prefix: "/v1/billing" });
  await app.register(webhookRoutes, { prefix: "/v1/webhooks" });
  await app.register(contactRoutes, { prefix: "/v1" });
}
