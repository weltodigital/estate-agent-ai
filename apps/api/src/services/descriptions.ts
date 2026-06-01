import type { FastifyRequest } from "fastify";
import type { GenerateDescriptionRequest, Property } from "@app/shared/schemas";
import { AppError, unauthorised } from "../errors.js";
import { ClaudeNotConfiguredError, defaultModel, getClaude } from "../integrations/claude.js";
import { getProperty } from "./properties.js";
import { assertWithinQuota } from "./quota.js";
import { recordUsageEvent } from "./usage.js";

const TONE_GUIDANCE: Record<GenerateDescriptionRequest["tone"], string> = {
  professional:
    "Tone: professional. Factual, well-presented, no hyperbole. Suitable for a high-street agent's listing card.",
  friendly:
    "Tone: friendly. Warm and welcoming, conversational without being casual. Aimed at first-time buyers and families.",
  luxury:
    "Tone: luxury. Refined and evocative, drawing attention to craft, finishes, and lifestyle. Restrained — no overclaiming.",
  lettings:
    "Tone: lettings. Focused on suitability for tenants — space, condition, transport, council tax band where relevant. Practical, not lyrical.",
};

const SYSTEM_PROMPT = `You write property listings for UK estate agents. Strict rules:

- British English throughout: colour, centre, kerb, lift, garden (not yard), lounge or reception room (not living room).
- Prices: use £ (pound sterling) with commas; never use $ or dollars.
- Honour the facts. Never invent rooms, square footage, schools, transport links, or features that are not in the data.
- Reference the EPC rating if one is provided, briefly and matter-of-factly.
- Produce three or four paragraphs separated by a single blank line. No headings, no bullet lists, no markdown.
- Match the requested tone exactly.
- Do not include the property's full postal address in the body — the address is shown above the listing already. You may reference the town or street name.
- Do not add a sign-off, a call-to-action ("Call us today"), or contact details.
- Output the description text only. No preamble, no closing remarks, no quote marks.`;

function buildUserPrompt(property: Property, payload: GenerateDescriptionRequest): string {
  const lines: string[] = [];
  lines.push(`Property data:`);
  lines.push(
    `- Address: ${property.address_line_1}${property.address_line_2 ? `, ${property.address_line_2}` : ""}, ${property.town}, ${property.postcode}`,
  );
  lines.push(`- Type: ${property.property_type}`);
  lines.push(
    `- ${property.bedrooms} bedroom${property.bedrooms === 1 ? "" : "s"}, ${property.bathrooms} bathroom${property.bathrooms === 1 ? "" : "s"}`,
  );
  const formattedPrice = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(property.price_pence / 100);
  lines.push(
    property.listing_type === "rent"
      ? `- To let at ${formattedPrice} per calendar month`
      : `- For sale at ${formattedPrice}`,
  );
  if (property.epc_current_rating) {
    lines.push(
      `- EPC rating: ${property.epc_current_rating}${property.epc_potential_rating ? ` (potential ${property.epc_potential_rating})` : ""}`,
    );
  }
  if (property.notes) {
    lines.push(``);
    lines.push(`Agent notes (use as input, do not quote directly):`);
    lines.push(property.notes);
  }
  if (payload.highlights && payload.highlights.length > 0) {
    lines.push(``);
    lines.push(`Highlights to feature:`);
    for (const h of payload.highlights) lines.push(`- ${h}`);
  }
  lines.push(``);
  lines.push(TONE_GUIDANCE[payload.tone]);
  lines.push(`Write the listing now.`);
  return lines.join("\n");
}

/**
 * Streams a Claude-generated property description. Calls `onChunk` for each
 * text delta. Records one `description_generated` usage event on completion.
 */
export async function streamDescription(
  request: FastifyRequest,
  propertyId: string,
  payload: GenerateDescriptionRequest,
  onChunk: (text: string) => void,
): Promise<void> {
  if (!request.user || !request.agencyId) throw unauthorised();

  await assertWithinQuota({
    agencyId: request.agencyId,
    eventType: "description_generated",
  });

  // RLS-guarded fetch — confirms the caller owns this property.
  const property = await getProperty(request, propertyId);

  let claude;
  try {
    claude = getClaude();
  } catch (err) {
    if (err instanceof ClaudeNotConfiguredError) {
      throw new AppError({
        status: 503,
        code: "claude_not_configured",
        message: "AI descriptions are not enabled on this environment.",
      });
    }
    throw err;
  }

  const stream = claude.messages.stream({
    model: defaultModel(),
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(property, payload) }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      onChunk(event.delta.text);
    }
  }

  await recordUsageEvent({
    agencyId: request.agencyId,
    branchId: property.branch_id,
    userId: request.user.id,
    propertyId: property.id,
    eventType: "description_generated",
    billable: true,
  });
}
