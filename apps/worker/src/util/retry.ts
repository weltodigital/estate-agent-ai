export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly retryAfterMs: number | null = null,
  ) {
    super(`HTTP ${status}: ${body.slice(0, 300)}`);
  }
  get retryable() {
    return this.status === 429 || this.status === 408 || this.status >= 500;
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof HttpError) return err.retryable;
  if (err && typeof err === "object" && "status" in err) {
    const s = Number((err as { status: unknown }).status);
    return s === 429 || s === 408 || s >= 500;
  }
  // Network failures (fetch TypeError, aborts on timeout).
  return err instanceof TypeError || (err instanceof Error && err.name === "TimeoutError");
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseMs ?? 1000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      const hinted = err instanceof HttpError ? err.retryAfterMs : null;
      await sleep(hinted ?? base * 2 ** attempt + Math.floor(Math.random() * 250));
    }
  }
}

/** fetch + JSON with timeout, raising HttpError on non-2xx. */
export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 120_000, ...rest } = init;
  const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  if (!res.ok) {
    const ra = res.headers.get("retry-after");
    const raMs = ra && Number.isFinite(Number(ra)) ? Number(ra) * 1000 : null;
    throw new HttpError(res.status, text, raMs);
  }
  return JSON.parse(text) as T;
}
