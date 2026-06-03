import type { EpcRating } from "@app/shared/constants";
import { loadEnv } from "../env.js";

/**
 * Client for the GOV.UK Energy Performance Certificate API.
 *
 * Docs: https://get-energy-performance-data.communities.gov.uk/api-technical-documentation
 * Auth: Bearer token issued via GOV.UK One Login → "My account" page on the
 *       service. Long-lived; paste once into EPC_API_TOKEN.
 *
 * Note: the search endpoint doesn't return potential_rating or lodgement date.
 * We compute expiry from registrationDate (EPCs are valid 10 years from
 * registration). To get potential ratings + inspection details we'd need a
 * follow-up call to /api/certificate?certificate_number=... — skipped here to
 * keep the lookup a single request.
 */

const BASE = "https://api.get-energy-performance-data.communities.gov.uk/api";
const RATING_PATTERN = /^[A-G]$/;

type RawRow = {
  certificateNumber?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  addressLine3?: string | null;
  addressLine4?: string | null;
  postcode?: string;
  postTown?: string;
  currentEnergyEfficiencyBand?: string;
  registrationDate?: string;
};

type RawResponse = {
  data?: RawRow[];
  pagination?: {
    totalRecords?: number;
    currentPage?: number;
    totalPages?: number;
    pageSize?: number;
  };
};

export type EpcLookupRow = {
  address: string;
  postcode: string;
  current_rating: EpcRating;
  potential_rating: EpcRating | null;
  expiry_date: string | null;
  inspection_date: string | null;
};

export class EpcNotConfiguredError extends Error {
  constructor() {
    super("EPC API token is not configured.");
    this.name = "EpcNotConfiguredError";
  }
}

function authHeader(): string {
  const env = loadEnv();
  if (!env.EPC_API_TOKEN) {
    throw new EpcNotConfiguredError();
  }
  return `Bearer ${env.EPC_API_TOKEN}`;
}

function asRating(value: string | undefined): EpcRating | null {
  if (!value) return null;
  const v = value.toUpperCase();
  return RATING_PATTERN.test(v) ? (v as EpcRating) : null;
}

function expiryFromRegistration(registration: string | undefined): string | null {
  if (!registration) return null;
  const date = registration.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // EPCs are valid for 10 years from registration.
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const expiryYear = y + 10;
  return `${expiryYear.toString().padStart(4, "0")}-${m
    .toString()
    .padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

function formatAddress(row: RawRow): string {
  return [row.addressLine1, row.addressLine2, row.addressLine3, row.addressLine4]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function normalise(row: RawRow): EpcLookupRow | null {
  const current = asRating(row.currentEnergyEfficiencyBand);
  if (!current) return null;
  return {
    address: formatAddress(row),
    postcode: row.postcode ?? "",
    current_rating: current,
    // Potential rating + inspection date aren't in the search response on the
    // new API. Detail endpoint can fetch them later if needed.
    potential_rating: null,
    expiry_date: expiryFromRegistration(row.registrationDate),
    inspection_date: row.registrationDate?.slice(0, 10) ?? null,
  };
}

export async function searchByPostcode(postcode: string): Promise<EpcLookupRow[]> {
  const url = new URL(`${BASE}/domestic/search`);
  url.searchParams.set("postcode", postcode);
  url.searchParams.set("page_size", "50");

  const res = await fetch(url.toString(), {
    headers: {
      authorization: authHeader(),
      accept: "application/json",
    },
  });

  if (res.status === 404) return [];
  if (res.status === 401 || res.status === 403) {
    throw new Error(`EPC API auth failed (${res.status}). Check EPC_API_TOKEN.`);
  }
  if (!res.ok) {
    throw new Error(`EPC API responded ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const body = (await res.json()) as RawResponse;
  const rows = body.data ?? [];
  return rows.map(normalise).filter((row): row is EpcLookupRow => row !== null);
}
