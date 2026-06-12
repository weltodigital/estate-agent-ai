"""Virtual staging pipeline.

Stages an empty room into a furnished interior with the fal.ai FLUX.2
apartment-staging model (`fal_staging_model`), producing N variations by varying
the seed. Each variation is uploaded to R2 and the URLs are POSTed back to the
API, signed with HMAC. FLUX.2 follows natural-language edits, so we instruct it
to furnish the room while holding the architecture fixed — the
structure-preservation the previous SD-based Replicate model could not manage.

When fal isn't configured — i.e. local dev with no FAL_KEY — we fall back to a
local PIL approximation (colour / contrast / saturation tweaks) so the queue and
callback flow still works end to end without burning credits. A configured-but-
failed call propagates so the job reports ``failed`` rather than silently
shipping an un-staged image as if it were staged (and billing for it).
"""

from __future__ import annotations

import io
import json
import logging
import uuid
from typing import Literal

import httpx
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

from app.integrations import fal
from app.integrations.hmac_sign import sign
from app.integrations.r2 import put_object

logger = logging.getLogger(__name__)

Style = Literal["modern", "scandi", "classic", "minimal", "luxury", "family"]

# Per-style descriptions, tuned for the UK market — understated, John Lewis not
# Restoration Hardware. Folded into the instruction below.
STYLE_PROMPTS: dict[Style, str] = {
    "modern": "a modern British interior, contemporary furniture, clean lines, neutral palette",
    "scandi": "a Scandinavian interior, light oak, soft textiles, white walls, uncluttered",
    "classic": "a classic British interior, elegant traditional furniture, warm tones",
    "minimal": "a minimalist interior, uncluttered, neutral palette, generous space",
    "luxury": "a refined luxury British interior, high-end furnishings, rich textures",
    "family": "a comfortable family British interior, practical furniture, warm and inviting",
}
# FLUX.2 follows natural-language edits, so we instruct it to furnish the room
# AND explicitly hold the architecture fixed — this is what keeps the staging
# honest (no fabricated windows/doors/flooring) for an estate-agent listing.
_STAGING_INSTRUCTION = (
    "Furnish this empty room as {style}. Add tasteful, photorealistic furniture "
    "and decor suitable for a UK estate-agent listing photo, with natural "
    "daylight and realistic shadows. Keep the existing walls, windows, doors, "
    "flooring, ceiling and room dimensions exactly as they are — do not alter, "
    "add or remove any architectural features."
)


def _staging_prompt(style: Style) -> str:
    return _STAGING_INSTRUCTION.format(style=STYLE_PROMPTS[style])


# Base seed; each variation offsets it so outputs differ but stay reproducible.
_SEED_BASE = 1000

# Fallback (PIL) tuning, used only when fal is unavailable (dev, no FAL_KEY).
STYLE_TUNING: dict[Style, tuple[float, float, float, float]] = {
    # (saturation, contrast, brightness, sharpness)
    "modern": (0.95, 1.15, 1.02, 1.10),
    "scandi": (0.85, 1.05, 1.10, 1.05),
    "classic": (1.05, 1.10, 0.98, 1.00),
    "minimal": (0.70, 1.20, 1.05, 1.05),
    "luxury": (1.15, 1.15, 1.00, 1.10),
    "family": (1.10, 1.00, 1.05, 1.00),
}
VARIATION_OFFSETS: list[tuple[float, float, float, float]] = [
    (1.00, 1.00, 1.00, 1.00),
    (0.92, 1.05, 1.02, 1.08),
    (1.08, 0.95, 0.97, 0.95),
]


def _encode_jpeg(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="JPEG", quality=88, optimize=True)
    return buf.getvalue()


# Disclosure stamped into every staged image — the furniture is digital, so the
# image must say so. Baked into the pixels (not metadata) so it survives a
# download / re-upload to a portal.
_WATERMARK_TEXT = "Virtually staged"


def _apply_watermark(image: Image.Image) -> Image.Image:
    """Stamp the staging disclosure into the bottom-right corner, on a
    semi-transparent slate pill so it stays legible over any background. Sized
    relative to the image so it reads at thumbnail and full size alike."""
    base = image.convert("RGBA")
    w, h = base.size
    font_size = max(18, w // 36)
    font = ImageFont.load_default(size=font_size)

    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    left, top, right, bottom = draw.textbbox((0, 0), _WATERMARK_TEXT, font=font)
    text_w, text_h = right - left, bottom - top

    pad = max(8, font_size // 3)
    margin = max(12, w // 60)
    box_right, box_bottom = w - margin, h - margin
    box_left, box_top = box_right - text_w - 2 * pad, box_bottom - text_h - 2 * pad
    draw.rounded_rectangle(
        (box_left, box_top, box_right, box_bottom),
        radius=pad,
        fill=(15, 23, 42, 140),  # slate-900 at ~55% opacity
    )
    draw.text(
        (box_left + pad - left, box_top + pad - top),
        _WATERMARK_TEXT,
        font=font,
        fill=(255, 255, 255, 235),
    )
    return Image.alpha_composite(base, overlay).convert("RGB")


def _fal_image_size(image: Image.Image) -> dict[str, int]:
    """Output size matching the input's aspect ratio so the room isn't cropped
    or stretched. Longest side scaled to ~1024px, dimensions snapped to a
    multiple of 32 (a FLUX requirement)."""
    w, h = image.size
    longest = max(w, h)
    scale = 1024 / longest if longest > 1024 else 1.0

    def snap(value: float) -> int:
        return max(512, round(value * scale / 32) * 32)

    return {"width": snap(w), "height": snap(h)}


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


def _render_variation_fallback(
    image: Image.Image,
    style: Style,
    variation_index: int,
) -> Image.Image:
    """Local PIL approximation used when fal isn't configured (dev)."""
    base = STYLE_TUNING[style]
    offset = VARIATION_OFFSETS[variation_index % len(VARIATION_OFFSETS)]
    sat, con, bri, sha = (base[i] * offset[i] for i in range(4))

    # Flatten alpha; downstream ops + JPEG output need RGB.
    out = image.convert("RGB") if image.mode != "RGB" else image.copy()
    out = ImageEnhance.Color(out).enhance(sat)
    out = ImageEnhance.Contrast(out).enhance(con)
    out = ImageEnhance.Brightness(out).enhance(bri)
    out = ImageEnhance.Sharpness(out).enhance(sha)
    if style == "minimal":
        out = out.filter(ImageFilter.SMOOTH)
    return out


async def _staged_jpeg(
    photo_url: str,
    original: Image.Image,
    style: Style,
    variation_index: int,
) -> bytes:
    """Produce one staged variation as JPEG bytes.

    When fal is configured we use it and let any failure propagate so the job
    reports ``failed`` — the PIL fallback only adjusts colour/contrast and
    cannot furnish a room, so silently substituting it would ship un-staged
    images as if they were staged (and bill the user for them). The fallback is
    reserved for local dev where no FAL_KEY is set, keeping the queue/callback
    flow working without burning credits.
    """
    if fal.is_configured():
        staged = await fal.stage_room(
            photo_url,
            _staging_prompt(style),
            seed=_SEED_BASE + variation_index,
            image_size=_fal_image_size(original),
        )
        image: Image.Image = Image.open(io.BytesIO(staged))
    else:
        logger.info("staging: fal not configured; using PIL fallback (dev)")
        image = _render_variation_fallback(original, style, variation_index)
    # Every staged image carries the disclosure watermark.
    return _encode_jpeg(_apply_watermark(image))


def _key(photo_id: str, variation_id: str) -> str:
    return f"staged/{photo_id}/{variation_id}.jpg"


async def _post_callback(callback_url: str, payload: dict[str, object]) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode()
    headers = {
        "content-type": "application/json",
        "x-orchestrator-signature": sign(body),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        await client.post(callback_url, content=body, headers=headers)


async def run_staging_job(
    *,
    photo_id: str,
    agency_id: str,
    photo_url: str,
    style: Style,
    variations: int,
    callback_url: str,
) -> None:
    """Background-task entry point. Renders N variations, uploads them to R2,
    and POSTs the resulting URLs to `callback_url` signed with HMAC."""
    try:
        raw = await _download(photo_url)
        original = Image.open(io.BytesIO(raw))

        outputs: list[dict[str, object]] = []
        for i in range(max(1, min(variations, 4))):
            variation_id = str(uuid.uuid4())
            jpeg = await _staged_jpeg(photo_url, original, style, i)
            url = put_object(_key(photo_id, variation_id), jpeg)
            outputs.append({"id": variation_id, "url": url, "sort_order": i})

        await _post_callback(
            callback_url,
            {
                "photo_id": photo_id,
                "agency_id": agency_id,
                "style": style,
                "variations": outputs,
                "status": "complete",
            },
        )
    except Exception as exc:
        # Surface failure via callback rather than raising.
        await _post_callback(
            callback_url,
            {
                "photo_id": photo_id,
                "agency_id": agency_id,
                "style": style,
                "variations": [],
                "status": "failed",
                "error": str(exc),
            },
        )
