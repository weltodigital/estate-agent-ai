export const TONE_OPTIONS = ["professional", "friendly", "luxury", "lettings"] as const;
export type Tone = (typeof TONE_OPTIONS)[number];

export const ROOM_TYPES = [
  "living_room",
  "bedroom",
  "kitchen",
  "bathroom",
  "exterior",
  "garden",
  "other",
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

// Which workflow a photo belongs to — the Enhancements and Virtual staging tabs
// each have their own separate set of uploads.
export const PHOTO_CATEGORIES = ["enhancement", "staging"] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export const STAGING_STYLES = [
  "modern",
  "scandi",
  "classic",
  "minimal",
  "luxury",
  "family",
] as const;
export type StagingStyle = (typeof STAGING_STYLES)[number];

export const UK_PROPERTY_TYPES = [
  "detached",
  "semi-detached",
  "terraced",
  "flat",
  "bungalow",
  "other",
] as const;
export type UkPropertyType = (typeof UK_PROPERTY_TYPES)[number];

export const LISTING_TYPES = ["sale", "rent"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const PROPERTY_STATUSES = [
  "draft",
  "active",
  "under_offer",
  "sold",
  "let",
  "withdrawn",
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const USER_ROLES = ["admin", "agent", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUBSCRIPTION_TIERS = ["starter", "pro", "business", "agency"] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const FLOOR_PLAN_TEMPLATES = ["minimal", "classic", "bold"] as const;
export type FloorPlanTemplate = (typeof FLOOR_PLAN_TEMPLATES)[number];

export const FLOOR_PLAN_STATUSES = [
  "uploaded",
  "parsing",
  "parsed",
  "editing",
  "finalised",
  "failed",
] as const;
export type FloorPlanStatus = (typeof FLOOR_PLAN_STATUSES)[number];

export const VIDEO_TEMPLATES = ["modern", "bold", "classic"] as const;
export type VideoTemplate = (typeof VIDEO_TEMPLATES)[number];

export const VIDEO_FORMATS = ["16:9", "1:1", "9:16"] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export const VIDEO_STATUSES = ["queued", "processing", "complete", "failed"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const WATERMARK_POSITIONS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;
export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];

export const USAGE_EVENT_TYPES = [
  "listing_created",
  "photo_enhanced",
  "staging_generated",
  "floor_plan_created",
  "video_generated",
  "description_generated",
  "epc_lookup",
] as const;
export type UsageEventType = (typeof USAGE_EVENT_TYPES)[number];

/**
 * Events surfaced in a property's activity log. A superset of the billable
 * USAGE_EVENT_TYPES that adds audit-only events (e.g. status changes) — logged
 * for history but never metered, quota-checked, or shown in the Billing tab.
 */
export const ACTIVITY_EVENT_TYPES = [...USAGE_EVENT_TYPES, "status_changed"] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export const EPC_RATINGS = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type EpcRating = (typeof EPC_RATINGS)[number];

/**
 * Monthly soft limits per tier per usage_event_type. The UI displays usage
 * against these limits; the API does not (yet) hard-block past the limit —
 * that's tracked in the "production hardening" pass.
 */
export const TIER_LIMITS: Record<SubscriptionTier, Record<UsageEventType, number>> = {
  starter: {
    listing_created: 5,
    photo_enhanced: 50,
    staging_generated: 5,
    floor_plan_created: 3,
    video_generated: 0,
    description_generated: 20,
    epc_lookup: 50,
  },
  pro: {
    listing_created: 25,
    photo_enhanced: 250,
    staging_generated: 25,
    floor_plan_created: 15,
    video_generated: 0,
    description_generated: 100,
    epc_lookup: 250,
  },
  business: {
    listing_created: 100,
    photo_enhanced: 1000,
    staging_generated: 100,
    floor_plan_created: 60,
    video_generated: 0,
    description_generated: 500,
    epc_lookup: 1000,
  },
  agency: {
    listing_created: 100000,
    photo_enhanced: 100000,
    staging_generated: 100000,
    floor_plan_created: 100000,
    video_generated: 100000,
    description_generated: 100000,
    epc_lookup: 100000,
  },
};
