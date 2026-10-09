// Privett scan worker. Long-running: claims due scan runs from Postgres
// (FOR UPDATE SKIP LOCKED via claim_scan_run), processes up to
// WORKER_CONCURRENCY at once, and periodically enqueues scheduled scans.

import { db } from "./db";
import { env, requireDbEnv } from "./env";
import { errMessage, log } from "./log";
import { failRun, processRun, type ScanRunRow } from "./scan";
import { scheduleDueScans } from "./scheduler";

requireDbEnv();

let stopping = false;
const active = new Set<Promise<void>>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function claim(): Promise<ScanRunRow | null> {
  const { data, error } = await db().rpc("claim_scan_run", { worker_id: env.workerId });
  if (error) throw new Error(`claim_scan_run: ${error.message}`);
  const rows = (data ?? []) as ScanRunRow[];
  return rows[0] ?? null;
}

function start(run: ScanRunRow) {
  log.info("scan claimed", { run: run.id, kind: run.kind, attempt: run.attempts });
  const p = processRun(run)
    .catch((err) => failRun(run, err))
    .catch((err) => log.error("could not record failure", { run: run.id, err: errMessage(err) }))
    .finally(() => active.delete(p));
  active.add(p);
}

async function pollLoop() {
  while (!stopping) {
    try {
      let claimed = false;
      while (!stopping && active.size < env.concurrency) {
        const run = await claim();
        if (!run) break;
        claimed = true;
        start(run);
      }
      if (!claimed) await sleep(env.pollMs);
      else await sleep(250);
    } catch (err) {
      log.error("poll failed", { err: errMessage(err) });
      await sleep(env.pollMs * 2);
    }
  }
}

async function schedulerLoop() {
  while (!stopping) {
    try {
      await scheduleDueScans();
    } catch (err) {
      log.error("scheduler failed", { err: errMessage(err) });
    }
    for (let waited = 0; waited < env.schedulerMs && !stopping; waited += 1000) await sleep(1000);
  }
}

async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  log.info("shutting down: finishing in-flight scans", { signal, inFlight: active.size });
  // Railway sends SIGKILL after its grace period; unfinished runs are
  // reclaimed by another worker and resume where they stopped.
  await Promise.race([Promise.allSettled([...active]), sleep(25_000)]);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

log.info("worker started", { workerId: env.workerId, concurrency: env.concurrency });
void pollLoop();
void schedulerLoop();
