import type { EpcRating } from "@app/shared/constants";
import { loadEnv } from "../env.js";

/**
 * Client for the GOV.UK Energy Performance Certificate Register.
 *
 * Docs: https://epc.opendatacommunities.org/docs/api
 * Auth: HTTP Basic with `email:api_key` base64-encoded.
 *
 * The API returns one row per certificate. For an agent looking up a single
 * property, multiple rows usually mean multiple lodgements over time (most
 * recent first by `lodgement-date`).
 */

const BASE = "https://epc.opendatacommunities.org/api/v1";
const RATING_PATTERN = /^[A-G]$/;

type RawRow = {
  address1?: string;
  address2?: string;
  address3?: string;
  posttown?: string;
  postcode?: string;
  "current-energy-rating"?: string;
  "potential-energy-rating"?: string;
  "lodgement-date"?: string;
  "lodgement-datetime"?: string;
  "inspection-date"?: string;
};

type RawResponse = {
  "column-names"?: string[];
  rows?: RawRow[];
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
    super("EPC API credentials are not configured.");
    this.name = "EpcNotConfiguredError";
  }
}

function authHeader(): string {
  const env = loadEnv();
  if (!env.EPC_API_EMAIL || !env.EPC_API_KEY) {
    throw new EpcNotConfiguredError();
  }
  const token = Buffer.from(`${env.EPC_API_EMAIL}:${env.EPC_API_KEY}`).toString("base64");
  return `Basic ${token}`;
}

function asRating(value: string | undefined): EpcRating | null {
  if (!value) return null;
  const v = value.toUpperCase();
  return RATING_PATTERN.test(v) ? (v as EpcRating) : null;
}

function expiryFromLodgement(lodgement: string | undefined): string | null {
  if (!lodgement) return null;
  // Lodgement may be ISO date or ISO datetime; take the YYYY-MM-DD portion.
  const date = lodgement.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // EPCs are valid for 10 years from lodgement.
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const expiryYear = y + 10;
  return `${expiryYear.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

function formatAddress(row: RawRow): string {
  return [row.address1, row.address2, row.address3]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function normalise(row: RawRow): EpcLookupRow | null {
  const current = asRating(row["current-energy-rating"]);
  if (!current) return null;
  return {
    address: formatAddress(row),
    postcode: row.postcode ?? "",
    current_rating: current,
    potential_rating: asRating(row["potential-energy-rating"]),
    expiry_date: expiryFromLodgement(row["lodgement-date"] ?? row["lodgement-datetime"]),
    inspection_date: row["inspection-date"]?.slice(0, 10) ?? null,
  };
}

export async function searchByPostcode(postcode: string): Promise<EpcLookupRow[]> {
  const url = new URL(`${BASE}/domestic/search`);
  url.searchParams.set("postcode", postcode);
  url.searchParams.set("size", "50");

  const res = await fetch(url.toString(), {
    headers: {
      authorization: authHeader(),
      accept: "application/json",
    },
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`EPC API responded ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const body = (await res.json()) as RawResponse;
  const rows = body.rows ?? [];
  return rows.map(normalise).filter((row): row is EpcLookupRow => row !== null);
}
