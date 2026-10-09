// Per-run budget and cost logging. Every paid call is logged to api_cost_log
// and added to scan_runs.cost_usd; once the run's budget is reached no new
// paid calls start (calls already in flight finish and are recorded).

import { db, must } from "./db";
import { log } from "./log";

export class BudgetExceededError extends Error {
  override name = "BudgetExceededError";
  constructor(spent: number, budget: number) {
    super(`Scan budget reached: $${spent.toFixed(4)} of $${budget.toFixed(2)}`);
  }
}

export class RunBudget {
  constructor(
    readonly runId: string | null,
    readonly budgetUsd: number,
    public spentUsd: number,
  ) {}

  get exceeded() {
    return this.spentUsd >= this.budgetUsd;
  }

  /** Throws if starting a call estimated at `estimateUsd` would exceed the budget. */
  check(estimateUsd = 0) {
    if (this.spentUsd + estimateUsd > this.budgetUsd) throw new BudgetExceededError(this.spentUsd, this.budgetUsd);
  }

  async record(entry: {
    provider: string;
    model: string;
    purpose: "answer" | "parse" | "asset" | "places" | "crawl";
    inputTokens?: number;
    outputTokens?: number;
    costUsd: number;
  }) {
    this.spentUsd += entry.costUsd;
    try {
      must(
        await db().from("api_cost_log").insert({
          scan_run_id: this.runId,
          provider: entry.provider,
          model: entry.model,
          purpose: entry.purpose,
          input_tokens: entry.inputTokens ?? null,
          output_tokens: entry.outputTokens ?? null,
          cost_usd: entry.costUsd,
        }),
        "insert api_cost_log",
      );
      if (this.runId && entry.costUsd > 0) {
        const total = must(await db().rpc("add_scan_cost", { run_id: this.runId, amount: entry.costUsd }), "add_scan_cost");
        // The DB total is authoritative (other workers may share a run after a reclaim).
        if (typeof total === "number" || typeof total === "string") this.spentUsd = Math.max(this.spentUsd, Number(total));
      }
    } catch (err) {
      log.error("cost logging failed", { runId: this.runId, err: String(err) });
    }
  }
}

/** Rough per-call estimates used for pre-flight budget checks only. */
export const CALL_ESTIMATE_USD = { answer: 0.03, parse: 0.02, asset: 0.08, places: 0.035 } as const;
