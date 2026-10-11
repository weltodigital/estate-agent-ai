import { ENGINE_IDS, engineLabel, type EngineId } from "@privett/core";
import { cn } from "@/lib/utils";

// The assistants Privett checks, by name. No third-party logos: Anthropic and
// Google only allow theirs with prior approval, so all four stay as plain text.

/** "ChatGPT · Perplexity · Gemini · Claude" for the homepage strip. */
export function AssistantStrip({ className }: { className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted", className)}>
      <span>Tracks the answers from</span>
      {ENGINE_IDS.map((e, i) => (
        <span key={e} className="flex items-center gap-3">
          {i ? <span aria-hidden="true">·</span> : null}
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{engineLabel(e)}</span>
        </span>
      ))}
    </p>
  );
}

/** All four assistants as chips; the ones a plan doesn't include are faded. */
export function AssistantChips({ engines, className }: { engines: EngineId[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Assistants included">
      {ENGINE_IDS.map((e) => {
        const included = engines.includes(e);
        return (
          <li
            key={e}
            className={cn(
              "rounded-sm border px-2 py-0.5 text-small font-medium",
              included ? "border-hairline bg-surface-sunken text-ink" : "border-dashed border-hairline text-ink-muted/60",
            )}
          >
            {engineLabel(e)}
            {included ? null : <span className="sr-only"> (not included)</span>}
          </li>
        );
      })}
    </ul>
  );
}

export const TRADEMARK_NOTE =
  "ChatGPT, Perplexity, Gemini and Claude are trademarks of their respective owners. Privett is not affiliated with or endorsed by them.";
