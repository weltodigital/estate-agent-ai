import { loadEnv } from "../env.js";

/**
 * Thin client for the Python ai-orchestrator. Stubbed — real calls land with
 * the relevant feature prompts (photo enhance / staging / floor-plan).
 */
export function orchestratorBaseUrl(): string {
  return loadEnv().AI_ORCHESTRATOR_URL;
}

export async function callOrchestrator<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const url = `${orchestratorBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`orchestrator ${path} responded ${res.status}`);
  }
  return (await res.json()) as T;
}
