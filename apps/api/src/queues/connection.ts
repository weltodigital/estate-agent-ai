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
    // family: 0 lets DNS resolve both IPv4 and IPv6. Required on Railway, whose
    // private network (and managed Redis) is IPv6-only — ioredis otherwise
    // defaults to IPv4 lookups and can't reach the internal Redis host.
    family: 0,
  };
}
