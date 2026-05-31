import type { ConnectionOptions } from "bullmq";
import { loadEnv } from "../env.js";

/**
 * BullMQ connection config. We pass the URL through and let BullMQ instantiate
 * the underlying ioredis client — avoids a duplicate-version mismatch and
 * keeps the connection lifecycle entirely inside BullMQ.
 */
export function getRedisConnection(): ConnectionOptions {
  const env = loadEnv();
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
  };
}
