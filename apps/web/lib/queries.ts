"use client";

import type {
  CreatePropertyRequest,
  PhotosListResponse,
  Photo,
  Property,
  PropertyListQuery,
  PropertyListResponse,
  ReorderPhotosRequest,
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
};
