"use client";

import type {
  BillingStatusResponse,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  CreateFloorPlanRequest,
  CreateFloorPlanResponse,
  CreatePropertyRequest,
  EnhancePhotoRequest,
  EnhancePhotoResponse,
  EpcLookupResponse,
  FinaliseFloorPlanResponse,
  FloorPlan,
  FloorPlanParsed,
  FloorPlansListResponse,
  ParseFloorPlanResponse,
  PhotosListResponse,
  Photo,
  PortalSessionRequest,
  PortalSessionResponse,
  Property,
  PropertyListQuery,
  PropertyListResponse,
  ReorderPhotosRequest,
  StagePhotoRequest,
  StagePhotoResponse,
  SuggestStyleResponse,
  UpdatePhotoRequest,
  UpdatePropertyRequest,
  UploadPhotoSignedRequest,
  UploadPhotoSignedResponse,
} from "@app/shared/schemas";
import { callApi } from "./api-client";

export const queryKeys = {
  properties: (query: PropertyListQuery | Record<string, never>) => ["properties", query] as const,
  property: (id: string) => ["property", id] as const,
  photos: (propertyId: string) => ["property", propertyId, "photos"] as const,
  epc: (postcode: string) => ["epc", postcode.replace(/\s+/g, "").toUpperCase()] as const,
  floorPlans: (propertyId: string) => ["property", propertyId, "floor-plans"] as const,
  floorPlan: (id: string) => ["floor-plan", id] as const,
};

export const propertyApi = {
  list: (query: Partial<PropertyListQuery> = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    }
    const qs = params.toString();
    return callApi<PropertyListResponse>(`/v1/properties${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => callApi<Property>(`/v1/properties/${id}`),
  create: (body: CreatePropertyRequest) =>
    callApi<Property>("/v1/properties", { method: "POST", body }),
  update: (id: string, body: UpdatePropertyRequest) =>
    callApi<Property>(`/v1/properties/${id}`, { method: "PATCH", body }),
  archive: (id: string) =>
    callApi<Property>(`/v1/properties/${id}`, {
      method: "PATCH",
      body: { status: "withdrawn" } satisfies UpdatePropertyRequest,
    }),
  remove: (id: string) => callApi<null>(`/v1/properties/${id}`, { method: "DELETE" }),
};

export const photoApi = {
  list: (propertyId: string) => callApi<PhotosListResponse>(`/v1/properties/${propertyId}/photos`),
  createUpload: (propertyId: string, body: UploadPhotoSignedRequest) =>
    callApi<UploadPhotoSignedResponse>(`/v1/properties/${propertyId}/photos`, {
      method: "POST",
      body,
    }),
  update: (id: string, body: UpdatePhotoRequest) =>
    callApi<Photo>(`/v1/photos/${id}`, { method: "PATCH", body }),
  remove: (id: string) => callApi<null>(`/v1/photos/${id}`, { method: "DELETE" }),
  reorder: (propertyId: string, body: ReorderPhotosRequest) =>
    callApi<PhotosListResponse>(`/v1/properties/${propertyId}/photos/reorder`, {
      method: "PATCH",
      body,
    }),
  enhance: (id: string, body: EnhancePhotoRequest) =>
    callApi<EnhancePhotoResponse>(`/v1/photos/${id}/enhance`, { method: "POST", body }),
  stage: (id: string, body: StagePhotoRequest) =>
    callApi<StagePhotoResponse>(`/v1/photos/${id}/stage`, { method: "POST", body }),
  selectStaging: (id: string, variationId: string) =>
    callApi<{ photo_id: string; selected_variation_id: string; staged_url: string }>(
      `/v1/photos/${id}/staging/select`,
      { method: "POST", body: { variation_id: variationId } },
    ),
  clearStaging: (id: string) => callApi<null>(`/v1/photos/${id}/staging`, { method: "DELETE" }),
  suggestStyle: (id: string) =>
    callApi<SuggestStyleResponse>(`/v1/photos/${id}/suggest-style`, { method: "POST" }),
};

export const billingApi = {
  status: () => callApi<BillingStatusResponse>("/v1/billing/status"),
  checkout: (body: CheckoutSessionRequest) =>
    callApi<CheckoutSessionResponse>("/v1/billing/checkout-session", { method: "POST", body }),
  portal: (body: PortalSessionRequest) =>
    callApi<PortalSessionResponse>("/v1/billing/portal-session", { method: "POST", body }),
};

export const epcApi = {
  lookup: (postcode: string) => {
    const params = new URLSearchParams({ postcode });
    return callApi<EpcLookupResponse>(`/v1/epc/lookup?${params.toString()}`);
  },
};

export const floorPlanApi = {
  list: (propertyId: string) =>
    callApi<FloorPlansListResponse>(`/v1/properties/${propertyId}/floor-plans`),
  create: (propertyId: string, body: CreateFloorPlanRequest) =>
    callApi<CreateFloorPlanResponse>(`/v1/properties/${propertyId}/floor-plans`, {
      method: "POST",
      body,
    }),
  parse: (id: string) =>
    callApi<ParseFloorPlanResponse>(`/v1/floor-plans/${id}/parse`, { method: "POST" }),
  get: (id: string) => callApi<FloorPlan>(`/v1/floor-plans/${id}`),
  saveEditor: (id: string, editor_state: FloorPlanParsed) =>
    callApi<FloorPlan>(`/v1/floor-plans/${id}`, {
      method: "PATCH",
      body: { editor_state },
    }),
  finalise: (id: string) =>
    callApi<FinaliseFloorPlanResponse>(`/v1/floor-plans/${id}/finalise`, {
      method: "POST",
      body: {},
    }),
};

export { streamApi } from "./streaming";
