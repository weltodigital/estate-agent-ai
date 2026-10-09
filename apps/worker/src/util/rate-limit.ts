// Token bucket per provider, refilled continuously at rpm / 60 per second.
// Bursts up to `burst` calls, then callers queue in order.

export class RateLimiter {
  private tokens: number;
  private last: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly rpm: number,
    private readonly burst = Math.max(1, Math.ceil(rpm / 10)),
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {
    this.tokens = burst;
    this.last = now();
  }

  private refill() {
    const t = this.now();
    this.tokens = Math.min(this.burst, this.tokens + ((t - this.last) / 60_000) * this.rpm);
    this.last = t;
  }

  /** Resolves when a call may proceed. Calls are served in arrival order. */
  acquire(): Promise<void> {
    const next = this.queue.then(async () => {
      this.refill();
      while (this.tokens < 1) {
        const waitMs = Math.ceil(((1 - this.tokens) / this.rpm) * 60_000);
        await this.sleep(waitMs);
        this.refill();
      }
      this.tokens -= 1;
    });
    this.queue = next.catch(() => undefined);
    return next;
  }
}

const limiters = new Map<string, RateLimiter>();

export function limiterFor(provider: string, rpm: number): RateLimiter {
  let l = limiters.get(provider);
  if (!l) {
    l = new RateLimiter(rpm);
    limiters.set(provider, l);
  }
  return l;
}
