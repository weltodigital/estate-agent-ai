// Generated-shape file. The real types should be produced via `pnpm db:types`
// (which runs `supabase gen types typescript`). Until that runs against a live
// Supabase project, this hand-authored stub mirrors migrations 0001 + 0003
// closely enough that the rest of the monorepo typechecks.
//
// IMPORTANT: when you run `pnpm db:types` for the first time, this file will
// be overwritten. That is intentional — the generator output is the source of
// truth.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type IsoString = string;

export type Tone = "professional" | "friendly" | "luxury" | "lettings";
export type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type FloorPlanTemplate = "minimal" | "classic" | "bold";
export type SubscriptionTier = "starter" | "pro" | "business" | "agency";
export type UserRole = "admin" | "agent" | "viewer";
export type UkPropertyType =
  | "detached"
  | "semi-detached"
  | "terraced"
  | "flat"
  | "bungalow"
  | "other";
export type ListingType = "sale" | "rent";
export type PropertyStatus =
  | "draft"
  | "active"
  | "under_offer"
  | "sold"
  | "let"
  | "withdrawn";
export type RoomType =
  | "living_room"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "exterior"
  | "garden"
  | "other";
export type StagingStyle = "modern" | "scandi" | "classic" | "minimal" | "luxury" | "family";
export type FloorPlanStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "editing"
  | "finalised"
  | "failed";
export type VideoTemplate = "modern" | "bold" | "classic";
export type VideoFormat = "16:9" | "1:1" | "9:16";
export type VideoStatus = "queued" | "processing" | "complete" | "failed";
export type UsageEventType =
  | "listing_created"
  | "photo_enhanced"
  | "staging_generated"
  | "floor_plan_created"
  | "video_generated"
  | "description_generated"
  | "epc_lookup";

type AgencyRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_colour_primary: string | null;
  brand_colour_secondary: string | null;
  default_tone: Tone;
  default_watermark_position: WatermarkPosition;
  floor_plan_template: FloorPlanTemplate;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: IsoString | null;
  created_at: IsoString;
  updated_at: IsoString;
};

type BranchRow = {
  id: string;
  agency_id: string;
  name: string;
  address: string | null;
  postcode: string | null;
  phone: string | null;
  listings_this_month: number;
  monthly_listing_limit: number | null;
  created_at: IsoString;
  updated_at: IsoString;
};

type UserRow = {
  id: string;
  agency_id: string;
  branch_id: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  invited_by: string | null;
  created_at: IsoString;
  updated_at: IsoString;
};

type PropertyRow = {
  id: string;
  agency_id: string;
  branch_id: string;
  created_by: string;
  address_line_1: string;
  address_line_2: string | null;
  town: string;
  postcode: string;
  property_type: UkPropertyType;
  listing_type: ListingType;
  bedrooms: number;
  bathrooms: number;
  price_pence: number;
  status: PropertyStatus;
  description: string | null;
  description_tone: Tone | null;
  epc_current_rating: string | null;
  epc_potential_rating: string | null;
  epc_expiry_date: string | null;
  notes: string | null;
  created_at: IsoString;
  updated_at: IsoString;
};

type PropertyPhotoRow = {
  id: string;
  property_id: string;
  original_url: string;
  enhanced_url: string | null;
  staged_url: string | null;
  dusk_url: string | null;
  room_type: RoomType;
  sort_order: number;
  enhancements_applied: Json;
  staging_style: StagingStyle | null;
  staging_variations: Json;
  suggested_style: StagingStyle | null;
  is_primary: boolean;
  created_at: IsoString;
};

type FloorPlanRow = {
  id: string;
  property_id: string;
  floor_label: string;
  sketch_url: string;
  parsed_json: Json | null;
  editor_state: Json | null;
  status: FloorPlanStatus;
  parse_error: string | null;
  output_svg_url: string | null;
  output_pdf_url: string | null;
  output_png_url: string | null;
  total_area_sqm: number | null;
  include_furniture: boolean;
  finalised_at: IsoString | null;
  created_at: IsoString;
  updated_at: IsoString;
};

type VideoCampaignRow = {
  id: string;
  property_id: string;
  template: VideoTemplate;
  photo_ids: string[];
  format: VideoFormat;
  video_url: string | null;
  status: VideoStatus;
  created_at: IsoString;
};

type UsageEventRow = {
  id: string;
  agency_id: string;
  branch_id: string | null;
  user_id: string | null;
  property_id: string | null;
  event_type: UsageEventType;
  units_consumed: number;
  billable: boolean;
  created_at: IsoString;
};

type AgencyInviteRow = {
  id: string;
  agency_id: string;
  branch_id: string | null;
  email: string;
  full_name: string | null;
  role: UserRole;
  token: string;
  invited_by: string;
  expires_at: IsoString;
  accepted_at: IsoString | null;
  accepted_by: string | null;
  created_at: IsoString;
};

type EpcCacheRow = {
  postcode_normalised: string;
  results: Json;
  fetched_at: IsoString;
  expires_at: IsoString;
};

type StripeProcessedEventRow = {
  event_id: string;
  type: string;
  processed_at: IsoString;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      agencies: Table<AgencyRow>;
      branches: Table<BranchRow>;
      users: Table<UserRow>;
      properties: Table<PropertyRow>;
      property_photos: Table<PropertyPhotoRow>;
      floor_plans: Table<FloorPlanRow>;
      video_campaigns: Table<VideoCampaignRow>;
      usage_events: Table<UsageEventRow>;
      agency_invites: Table<AgencyInviteRow>;
      epc_cache: Table<EpcCacheRow>;
      stripe_processed_events: Table<StripeProcessedEventRow>;
    };
    Views: Record<string, never>;
    Functions: {
      bootstrap_new_agency: {
        Args: { p_full_name: string; p_agency_name: string; p_branch_postcode: string };
        Returns: { agency_id: string; branch_id: string; user_id: string }[];
      };
      consume_agency_invite: {
        Args: { p_token: string; p_full_name: string };
        Returns: { user_id: string; agency_id: string }[];
      };
      current_agency_id: { Args: Record<string, never>; Returns: string };
      unique_agency_slug: { Args: { p_name: string }; Returns: string };
      normalise_postcode: { Args: { p: string }; Returns: string };
    };
    Enums: {
      tone: Tone;
      watermark_position: WatermarkPosition;
      floor_plan_template: FloorPlanTemplate;
      subscription_tier: SubscriptionTier;
      user_role: UserRole;
      uk_property_type: UkPropertyType;
      listing_type: ListingType;
      property_status: PropertyStatus;
      room_type: RoomType;
      staging_style: StagingStyle;
      floor_plan_status: FloorPlanStatus;
      video_template: VideoTemplate;
      video_format: VideoFormat;
      video_status: VideoStatus;
      usage_event_type: UsageEventType;
    };
    CompositeTypes: Record<string, never>;
  };
}
