"""Virtual staging pipeline.

Stages an empty room into a furnished interior with Replicate (the model slug
is `replicate_staging_model`), producing N variations by varying the seed.
Each variation is uploaded to R2 and the URLs are POSTed back to the API,
signed with HMAC.

When Replicate isn't configured — or a call fails — we fall back to a local
PIL approximation (colour / contrast / saturation tweaks) so the queue and
callback flow still works end to end during dev without burning credits.
"""

from __future__ import annotations

import io
import json
import logging
import uuid
from typing import Literal

import httpx
from PIL import Image, ImageEnhance, ImageFilter

from app.integrations import replicate
from app.integrations.hmac_sign import sign
from app.integrations.r2 import put_object

logger = logging.getLogger(__name__)

Style = Literal["modern", "scandi", "classic", "minimal", "luxury", "family"]

# Prompts tuned for the UK market — understated, John Lewis not Restoration
# Hardware. Geometry (walls, windows, floor) is preserved by the model.
STYLE_PROMPTS: dict[Style, str] = {
    "modern": "a modern British interior, contemporary furniture, clean lines, neutral palette",
    "scandi": "a Scandinavian interior, light oak, soft textiles, white walls, uncluttered",
    "classic": "a classic British interior, elegant traditional furniture, warm tones",
    "minimal": "a minimalist interior, uncluttered, neutral palette, generous space",
    "luxury": "a refined luxury British interior, high-end furnishings, rich textures",
    "family": "a comfortable family British interior, practical furniture, warm and inviting",
}
_PROMPT_SUFFIX = (
    ", interior design photography, photorealistic, natural daylight, tasteful staging, "
    "estate agent quality"
)
_NEGATIVE_PROMPT = (
    "cluttered, distorted architecture, warped walls, low quality, blurry, watermark, text, "
    "people, deformed furniture"
)
# Base seed; each variation offsets it so outputs differ but stay reproducible.
_SEED_BASE = 1000

# Fallback (PIL) tuning, used only when Replicate is unavailable.
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
    """Local PIL approximation used when Replicate isn't available."""
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
    raw: bytes,
    original: Image.Image,
    style: Style,
    variation_index: int,
) -> bytes:
    """Produce one staged variation as JPEG bytes — Replicate if configured,
    otherwise the PIL fallback. A Replicate failure degrades to the fallback
    rather than failing the whole job."""
    if replicate.is_configured():
        prompt = STYLE_PROMPTS[style] + _PROMPT_SUFFIX
        try:
            staged = await replicate.stage_room(
                raw, prompt, _NEGATIVE_PROMPT, seed=_SEED_BASE + variation_index
            )
            return _encode_jpeg(Image.open(io.BytesIO(staged)))
        except Exception:
            logger.warning(
                "staging: Replicate failed for style=%s var=%d; using PIL fallback",
                style,
                variation_index,
                exc_info=True,
            )
    return _encode_jpeg(_render_variation_fallback(original, style, variation_index))


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
            jpeg = await _staged_jpeg(raw, original, style, i)
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
