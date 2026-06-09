import { z } from "zod";

// .env files often have keys present but blank (`FOO=`) — Node hands those
// to us as the empty string, which then trips Zod's `.email()` / `.url()` /
// `.min(1)` validators on otherwise-optional fields. Strip empty strings
// before validation so a blank value is treated as "not set".
const stripBlanks = (input: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = v === "" ? undefined : v;
  }
  return out;
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  REDIS_URL: z.string().min(1),

  APP_BASE_URL: z.string().url().default("http://localhost:3000"),

  AI_ORCHESTRATOR_URL: z.string().url(),
  AI_CALLBACK_SECRET: z.string().min(1).optional(),
  API_PUBLIC_BASE_URL: z.string().url().default("http://localhost:3001"),

  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  CLAUDE_DEFAULT_MODEL: z.string().default("claude-sonnet-4-6"),
  CLAUDE_VISION_MODEL: z.string().default("claude-sonnet-4-6"),

  // Cloudflare R2 (S3-compatible)
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_BASE_URL: z.string().url(),

  // GOV.UK EPC API (the new service — bearer token from the My Account page
  // after GOV.UK One Login at get-energy-performance-data.communities.gov.uk)
  EPC_API_TOKEN: z.string().min(1).optional(),

  // Email (Resend). Optional: when unset, invite emails are skipped and the
  // admin shares the returned invite_url manually.
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default("Privett <hello@useprivett.com>"),
  // Where marketing contact-form submissions are emailed.
  CONTACT_INBOX: z.string().email().default("hello@useprivett.com"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_TRIAL_DAYS: z.coerce.number().int().min(0).max(30).default(7),
  STRIPE_PRICE_STARTER: z.string().min(1).optional(),
  STRIPE_PRICE_PRO: z.string().min(1).optional(),
  STRIPE_PRICE_BUSINESS: z.string().min(1).optional(),
  STRIPE_PRICE_AGENCY: z.string().min(1).optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(stripBlanks(process.env));
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
