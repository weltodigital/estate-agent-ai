/**
 * Typed fetch wrapper for the Fastify API.
 *
 * Always call the API through this helper — never `fetch` directly from a
 * server or client component. Auth tokens are injected automatically.
 */

import type { ApiError } from "@app/shared/types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  accessToken?: string;
};

function apiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.API_BASE_URL ?? "http://localhost:3001";
  }
  // In the browser we hit the API through the same hostname via env-injected URL.
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${apiBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(options.headers ?? {}),
  };
  if (options.accessToken) {
    headers.authorization = `Bearer ${options.accessToken}`;
  }
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => undefined)) as ApiError | undefined;
    throw new Error(errorBody?.error?.message ?? `API ${path} failed: ${res.status}`);
  }
  // 204 No Content (e.g. DELETE endpoints) has an empty body — calling
  // res.json() on it throws, which would surface as a failed mutation even
  // though the request succeeded. Return null for empty responses.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null as T;
  }
  return (await res.json()) as T;
}
