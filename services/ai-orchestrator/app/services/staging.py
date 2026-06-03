"""Virtual staging pipeline.

Phase-1 placeholder: produces N visibly-distinct variations via PIL colour /
contrast / saturation tweaks. This proves the queue + callback flow against
real images without burning Replicate credits during dev.

Production: replace `_render_variation` with Replicate inpainting (model is
picked per style — modern/minimal use a different prompt + reference than
luxury/classic). Keep the same callback contract.
"""

from __future__ import annotations

import io
import json
import uuid
from typing import Literal

import httpx
from PIL import Image, ImageEnhance, ImageFilter

from app.integrations.hmac_sign import sign
from app.integrations.r2 import put_object

Style = Literal["modern", "scandi", "classic", "minimal", "luxury", "family"]

STYLE_TUNING: dict[Style, tuple[float, float, float, float]] = {
    # (saturation, contrast, brightness, sharpness)
    "modern": (0.95, 1.15, 1.02, 1.10),
    "scandi": (0.85, 1.05, 1.10, 1.05),
    "classic": (1.05, 1.10, 0.98, 1.00),
    "minimal": (0.70, 1.20, 1.05, 1.05),
    "luxury": (1.15, 1.15, 1.00, 1.10),
    "family": (1.10, 1.00, 1.05, 1.00),
}

# Three variations per style nudge the tuning differently so the user sees
# meaningfully different outputs.
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


def _render_variation(
    image: Image.Image,
    style: Style,
    variation_index: int,
) -> Image.Image:
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
            rendered = _render_variation(original, style, i)
            url = put_object(_key(photo_id, variation_id), _encode_jpeg(rendered))
            outputs.append(
                {
                    "id": variation_id,
                    "url": url,
                    "sort_order": i,
                }
            )

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
