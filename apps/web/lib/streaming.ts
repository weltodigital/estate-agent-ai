"use client";

import { apiFetch } from "./api";
import { getSupabaseBrowserClient } from "./supabase/client";

/**
 * POSTs to a streaming API endpoint and yields each text chunk as it arrives.
 * The endpoint must respond with text/plain (or text/event-stream) — we don't
 * parse SSE frames, just decode UTF-8 bytes as they come.
 */
export async function* streamApi(path: string, body: unknown): AsyncGenerator<string, void, void> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const url = `${apiBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok || !res.body) {
    let detail = `${res.status}`;
    try {
      detail = (await res.text()) || detail;
    } catch {
      // ignore
    }
    throw new Error(`Stream request failed: ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) yield decoder.decode(value, { stream: true });
  }
  // Flush any trailing buffered bytes.
  const tail = decoder.decode();
  if (tail) yield tail;
}

// Mirror the apiBaseUrl logic from lib/api.ts without importing internal helpers.
function apiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.API_BASE_URL ?? "http://localhost:3001";
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
}

// Suppress unused-import warning when this module is the only one pulling
// apiFetch — kept for future non-streaming companions.
void apiFetch;
