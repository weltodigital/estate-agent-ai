import type { FastifyRequest } from "fastify";
import type { RoomType, StagingStyle } from "@app/shared/constants";
import { ROOM_TYPES, STAGING_STYLES } from "@app/shared/constants";
import type { SuggestStyleResponse } from "@app/shared/schemas";
import { AppError, notFound, unauthorised } from "../errors.js";
import { ClaudeNotConfiguredError, getClaude, visionModel } from "../integrations/claude.js";
import { getUserClient } from "../integrations/supabase.js";

const SYSTEM_PROMPT = `You are a UK estate agent's interior staging assistant. Given a photo of a room, classify the room type and recommend ONE staging style appropriate for the room and its current aesthetic.

Respond as compact JSON exactly matching this schema and nothing else:
{
  "room_type": "living_room" | "bedroom" | "kitchen" | "bathroom" | "exterior" | "garden" | "other",
  "suggested_style": "modern" | "scandi" | "classic" | "minimal" | "luxury" | "family"
}

Rules:
- Pick the room_type that best matches the dominant function of the space.
- Pick a single suggested_style that would appeal to the most likely UK buyer for that room.
- Output JSON only. No prose, no markdown, no preamble.`;

function parseSuggestion(text: string): SuggestStyleResponse | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const roomType = parsed.room_type;
    const style = parsed.suggested_style;
    if (
      typeof roomType !== "string" ||
      typeof style !== "string" ||
      !(ROOM_TYPES as readonly string[]).includes(roomType) ||
      !(STAGING_STYLES as readonly string[]).includes(style)
    ) {
      return null;
    }
    return {
      room_type: roomType as RoomType,
      suggested_style: style as StagingStyle,
    };
  } catch {
    return null;
  }
}

export async function suggestStyleForPhoto(
  request: FastifyRequest,
  photoId: string,
): Promise<SuggestStyleResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { data: photo, error } = await supabase
    .from("property_photos")
    .select("id, original_url")
    .eq("id", photoId)
    .maybeSingle<{ id: string; original_url: string }>();
  if (error) {
    throw new AppError({
      status: 500,
      code: "lookup_photo_failed",
      message: "Could not load photo.",
    });
  }
  if (!photo) throw notFound("Photo");

  let claude;
  try {
    claude = getClaude();
  } catch (err) {
    if (err instanceof ClaudeNotConfiguredError) {
      throw new AppError({
        status: 503,
        code: "claude_not_configured",
        message: "AI style suggestions are not enabled on this environment.",
      });
    }
    throw err;
  }

  const message = await claude.messages.create({
    model: visionModel(),
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: photo.original_url },
          },
          {
            type: "text",
            text: "Classify the room and suggest a staging style.",
          },
        ],
      },
    ],
  });

  const text = message.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const parsed = parseSuggestion(text);
  if (!parsed) {
    throw new AppError({
      status: 502,
      code: "style_suggest_unparsable",
      message: "Claude returned an unexpected response.",
    });
  }

  // Persist the suggestion on the photo so the UI can default to it next time
  // without re-billing for a Vision call.
  await supabase
    .from("property_photos")
    .update({ room_type: parsed.room_type, suggested_style: parsed.suggested_style })
    .eq("id", photoId);

  return parsed;
}
