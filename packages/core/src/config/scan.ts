// Scan and metric thresholds. Env-overridable.

type Env = Record<string, string | undefined>;

export function getScanSettings(env: Env = process.env) {
  return {
    /** Responses below this count render as "low sample". */
    lowSampleThreshold: Number(env.LOW_SAMPLE_THRESHOLD ?? 20),
    defaultRunsPerPrompt: Number(env.DEFAULT_RUNS_PER_PROMPT ?? 3),
    /** Free scan: prompts used, and abuse limits. */
    freeScanPrompts: Number(env.FREE_SCAN_PROMPTS ?? 5),
    freeScanPerEmailPerDay: Number(env.FREE_SCAN_PER_EMAIL_PER_DAY ?? 1),
    freeScanPerDomainPerWeek: Number(env.FREE_SCAN_PER_DOMAIN_PER_WEEK ?? 1),
    freeScanPerIpPerDay: Number(env.FREE_SCAN_PER_IP_PER_DAY ?? 3),
    /** Global ceiling on free scans per day, a last line of cost defence. */
    freeScanGlobalPerDay: Number(env.FREE_SCAN_GLOBAL_PER_DAY ?? 200),
    /** Admin league table runs. */
    leagueRunsPerPrompt: Number(env.LEAGUE_RUNS_PER_PROMPT ?? 2),
    leagueBudgetUsd: Number(env.LEAGUE_BUDGET_USD ?? 25),
  };
}
