/**
 * Repeated user-facing strings. See BRANDING.md → "Where copy lives".
 *
 * Anything that appears in more than one place, or that carries the Privett
 * voice (empty states, error messages, sign-offs, the product name), lives
 * here so copy changes happen in one file rather than scattered components.
 */

export const PRODUCT_NAME = "Privett";

/** Default site description / metadata. */
export const PRODUCT_TAGLINE_DESCRIPTION = "Marketing software for UK estate agents.";

/** Primary tagline. Use sparingly — see BRANDING.md. */
export const PRODUCT_TAGLINE = "Marketing for property, done properly.";

/** Email and product sign-off. */
export const TEAM_SIGN_OFF = "The Privett team";

/** Contact address used in marketing + transactional copy. */
export const CONTACT_EMAIL = "hello@useprivett.com";

/**
 * Empty states — Privett voice. Warm, short, points at the next action.
 */
export const EMPTY_STATES = {
  properties: "No listings yet. Add your first one to get started.",
} as const;

/**
 * Generic, human-readable error/recovery copy. No status codes, no shouting.
 */
export const ERROR_COPY = {
  saveFailed: "Couldn't save that. Try again?",
  generic: "Something went wrong. Try again?",
  loadFailed: "Couldn't load that. Try again?",
} as const;

/**
 * Reminders that AI output needs a human check before it reaches a client or a
 * portal. UK property listings must not mislead, so accuracy is on the agent.
 */
export const AI_NOTICE = {
  description:
    "AI writes a first draft. Read it through and check every detail before you publish.",
  photo:
    "AI edits these photos. Make sure each one is a fair, accurate likeness before you use it.",
  floorPlan:
    "AI reads the sketch and can misjudge it. Check the layout and measurements before you publish.",
  generic: "AI can get things wrong. Always check what it produces before it reaches a client.",
} as const;
