import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type {
  CreateFloorPlanRequest,
  CreateFloorPlanResponse,
  FinaliseFloorPlanResponse,
  FloorPlan,
  FloorPlanParsed,
  FloorPlanParsedCallback,
  ParseFloorPlanResponse,
  UpdateFloorPlanRequest,
} from "@app/shared/schemas";
import { loadEnv } from "../env.js";
import { AppError, notFound, unauthorised } from "../errors.js";
import {
  buildPhotoKey,
  createSignedPutUrl,
  publicUrl,
  sanitiseFilename,
} from "../integrations/r2.js";
import { getServiceClient, getUserClient } from "../integrations/supabase.js";
import { floorPlanParseQueue } from "../queues/floor-plan-parse.js";
import { assertWithinQuota } from "./quota.js";
import { recordUsageEvent } from "./usage.js";

function buildSketchKey(args: {
  agencyId: string;
  propertyId: string;
  floorPlanId: string;
  filename: string;
}): string {
  return `agencies/${args.agencyId}/properties/${args.propertyId}/floor-plans/${args.floorPlanId}/sketch-${sanitiseFilename(args.filename)}`;
}

void buildPhotoKey; // suppress unused-import warning; kept for symmetry across callers.

export async function listFloorPlans(
  request: FastifyRequest,
  propertyId: string,
): Promise<FloorPlan[]> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("floor_plans")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new AppError({
      status: 500,
      code: "list_floor_plans_failed",
      message: "Could not load floor plans.",
    });
  }
  return (data ?? []) as FloorPlan[];
}

export async function getFloorPlan(request: FastifyRequest, id: string): Promise<FloorPlan> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("floor_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle<FloorPlan>();
  if (error) {
    throw new AppError({
      status: 500,
      code: "get_floor_plan_failed",
      message: "Could not load floor plan.",
    });
  }
  if (!data) throw notFound("Floor plan");
  return data;
}

/**
 * Creates a placeholder floor_plans row with the eventual R2 sketch URL baked
 * in, plus a presigned PUT for the browser. Mirrors the photo upload flow.
 */
export async function createFloorPlan(
  request: FastifyRequest,
  propertyId: string,
  payload: CreateFloorPlanRequest,
): Promise<CreateFloorPlanResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();
  if (propertyError) {
    throw new AppError({
      status: 500,
      code: "lookup_property_failed",
      message: "Could not load property.",
    });
  }
  if (!property) throw notFound("Property");

  const floorPlanId = randomUUID();
  const key = buildSketchKey({
    agencyId: request.agencyId,
    propertyId,
    floorPlanId,
    filename: payload.filename,
  });

  const { data: row, error: insertError } = await supabase
    .from("floor_plans")
    .insert({
      id: floorPlanId,
      property_id: propertyId,
      floor_label: payload.floor_label,
      sketch_url: publicUrl(key),
      include_furniture: payload.include_furniture,
      status: "uploaded",
    })
    .select("*")
    .single<FloorPlan>();
  if (insertError) {
    throw new AppError({
      status: 500,
      code: "create_floor_plan_failed",
      message: "Could not create floor plan.",
    });
  }

  const uploadUrl = await createSignedPutUrl({
    key,
    contentType: payload.content_type,
    expiresInSeconds: 300,
  });

  return { floor_plan: row, upload_url: uploadUrl };
}

export async function enqueueFloorPlanParse(
  request: FastifyRequest,
  id: string,
): Promise<ParseFloorPlanResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();

  await assertWithinQuota({
    agencyId: request.agencyId,
    eventType: "floor_plan_created",
  });

  const supabase = getUserClient(request.user.accessToken);

  const { data, error } = await supabase
    .from("floor_plans")
    .select("id, property_id, sketch_url, status")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      property_id: string;
      sketch_url: string;
      status: string;
    }>();
  if (error) {
    throw new AppError({
      status: 500,
      code: "lookup_floor_plan_failed",
      message: "Could not load floor plan.",
    });
  }
  if (!data) throw notFound("Floor plan");

  await supabase.from("floor_plans").update({ status: "parsing", parse_error: null }).eq("id", id);

  const jobId = `floor-plan-parse:${id}:${Date.now()}`;
  await floorPlanParseQueue().add(
    "parse",
    {
      floor_plan_id: id,
      property_id: data.property_id,
      agency_id: request.agencyId,
      sketch_url: data.sketch_url,
    },
    { jobId, removeOnComplete: 200, removeOnFail: 200 },
  );

  return { floor_plan_id: id, job_id: jobId, status: "parsing" };
}

/**
 * Applies the orchestrator's parse callback. Service-role write so we don't
 * depend on a user JWT being available server-to-server.
 */
export async function applyParseCallback(payload: FloorPlanParsedCallback): Promise<void> {
  const supabase = getServiceClient();

  const { data: existing, error: lookupError } = await supabase
    .from("floor_plans")
    .select("property_id")
    .eq("id", payload.floor_plan_id)
    .maybeSingle<{ property_id: string }>();
  if (lookupError || !existing) {
    throw new AppError({
      status: 404,
      code: "floor_plan_not_found",
      message: "Floor plan for callback not found.",
    });
  }

  if (payload.status === "failed") {
    await supabase
      .from("floor_plans")
      .update({
        status: "failed",
        parse_error: payload.parse_error ?? "Parsing failed.",
      })
      .eq("id", payload.floor_plan_id);
    return;
  }

  await supabase
    .from("floor_plans")
    .update({
      status: "parsed",
      parsed_json: payload.parsed_json,
      output_svg_url: payload.output_svg_url,
      total_area_sqm: payload.total_area_sqm ?? null,
      parse_error: null,
    })
    .eq("id", payload.floor_plan_id);

  await recordUsageEvent({
    agencyId: payload.agency_id,
    propertyId: existing.property_id,
    eventType: "floor_plan_created",
    billable: true,
  });
}

/**
 * Updates the editor_state for a floor plan. If the plan is still in
 * 'parsed' state when the user starts editing, advance to 'editing'.
 */
export async function updateEditorState(
  request: FastifyRequest,
  id: string,
  payload: UpdateFloorPlanRequest,
): Promise<FloorPlan> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);

  const { data: existing, error: lookupError } = await supabase
    .from("floor_plans")
    .select("status")
    .eq("id", id)
    .maybeSingle<{ status: string }>();
  if (lookupError) {
    throw new AppError({
      status: 500,
      code: "lookup_floor_plan_failed",
      message: "Could not load floor plan.",
    });
  }
  if (!existing) throw notFound("Floor plan");

  const nextStatus = existing.status === "parsed" ? "editing" : existing.status;

  const { data, error } = await supabase
    .from("floor_plans")
    .update({ editor_state: payload.editor_state, status: nextStatus })
    .eq("id", id)
    .select("*")
    .maybeSingle<FloorPlan>();
  if (error) {
    throw new AppError({
      status: 500,
      code: "update_floor_plan_failed",
      message: "Could not save edits.",
    });
  }
  if (!data) throw notFound("Floor plan");
  return data;
}

/**
 * Finalises a floor plan: takes the current editor_state (or parsed_json if
 * the user never edited), pulls the agency's branding, and calls the
 * orchestrator synchronously to render the branded SVG + PNG + PDF. Persists
 * the resulting URLs, sets status='finalised', stamps finalised_at.
 *
 * Synchronous because finalise latency is bounded — a few seconds at most.
 * If we ever need to render larger documents we'll switch to a queue.
 */
export async function finaliseFloorPlan(
  request: FastifyRequest,
  id: string,
): Promise<FinaliseFloorPlanResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);

  const { data: plan, error: planError } = await supabase
    .from("floor_plans")
    .select("id, property_id, editor_state, parsed_json, floor_label")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      property_id: string;
      editor_state: FloorPlanParsed | null;
      parsed_json: FloorPlanParsed | null;
      floor_label: string;
    }>();
  if (planError) {
    throw new AppError({
      status: 500,
      code: "lookup_floor_plan_failed",
      message: "Could not load floor plan.",
    });
  }
  if (!plan) throw notFound("Floor plan");

  const source = plan.editor_state ?? plan.parsed_json;
  if (!source) {
    throw new AppError({
      status: 400,
      code: "floor_plan_not_parsed",
      message: "This floor plan hasn't been parsed yet.",
    });
  }

  // Pull the caller's agency for branding. Service-role: the agencies row's
  // own RLS already enforces own-agency reads, but the same user-scoped
  // client is fine — we just need the row.
  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("name, logo_url, brand_colour_primary, brand_colour_secondary, floor_plan_template")
    .eq("id", request.agencyId)
    .maybeSingle<{
      name: string;
      logo_url: string | null;
      brand_colour_primary: string | null;
      brand_colour_secondary: string | null;
      floor_plan_template: string;
    }>();
  if (agencyError || !agency) {
    throw new AppError({
      status: 500,
      code: "lookup_agency_failed",
      message: "Could not load agency branding.",
    });
  }

  const env = loadEnv();
  const res = await fetch(
    `${env.AI_ORCHESTRATOR_URL.replace(/\/$/, "")}/jobs/floor-plan/finalise`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        floor_plan_id: id,
        floor_label: plan.floor_label,
        plan: source,
        branding: {
          agency_name: agency.name,
          logo_url: agency.logo_url,
          brand_colour_primary: agency.brand_colour_primary,
          brand_colour_secondary: agency.brand_colour_secondary,
          template: agency.floor_plan_template,
        },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AppError({
      status: 502,
      code: "finalise_failed",
      message: `Renderer failed: ${res.status} ${detail.slice(0, 200)}`,
    });
  }
  const orchestratorResult = (await res.json()) as FinaliseFloorPlanResponse;

  const service = getServiceClient();
  await service
    .from("floor_plans")
    .update({
      status: "finalised",
      output_svg_url: orchestratorResult.output_svg_url,
      output_png_url: orchestratorResult.output_png_url,
      output_pdf_url: orchestratorResult.output_pdf_url,
      total_area_sqm: orchestratorResult.total_area_sqm,
      finalised_at: new Date().toISOString(),
    })
    .eq("id", id);

  return orchestratorResult;
}
