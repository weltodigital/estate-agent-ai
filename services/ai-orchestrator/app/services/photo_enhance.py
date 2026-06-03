"""Photo enhancement pipeline.

Downloads the original photo, applies the requested enhancements, uploads the
results to R2, and POSTs the URLs back to the API.

Implementations:
  - exposure_correction: PIL (autocontrast + small brightness lift)
  - gdpr_blur:           AWS Rekognition face/text (number-plate) detection +
                         targeted blur; falls back to a full-image blur when
                         AWS isn't configured
  - sky_replacement:     ClipDrop replace-background with a clear-sky prompt;
                         falls back to leaving the image unchanged
  - dusk_shot:           Replicate relighting model -> dusk_url; falls back to
                         a warm/darker PIL approximation
  - object_removal:      ClipDrop cleanup using the painted mask (mask_url);
                         a no-op if no mask was supplied or ClipDrop is unset

Every provider call degrades gracefully: if the key is unset or the call
fails, the pipeline falls back so a job never hard-fails on an upstream.
"""

from __future__ import annotations

import io
import json
import logging
import uuid
from typing import Literal

import httpx
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from app.integrations import clipdrop, rekognition, replicate
from app.integrations.hmac_sign import sign
from app.integrations.r2 import put_object

logger = logging.getLogger(__name__)

Enhancement = Literal[
    "sky_replacement",
    "object_removal",
    "gdpr_blur",
    "exposure_correction",
    "dusk_shot",
]

_SKY_PROMPT = "a bright clear blue sky with soft natural clouds, sunny day"
_DUSK_PROMPT = "warm golden-hour dusk lighting, sunset glow, soft warm tones, twilight sky"


def _apply_exposure_correction(image: Image.Image) -> Image.Image:
    # Auto-contrast then nudge brightness — keeps the image looking like the
    # property, not a film stock.
    image = ImageOps.autocontrast(image, cutoff=1)
    image = ImageEnhance.Brightness(image).enhance(1.05)
    return image


def _blur_regions(image: Image.Image, boxes: list[rekognition.Box]) -> Image.Image:
    """Blur each relative bounding box (faces / number plates)."""
    width, height = image.size
    out = image.copy()
    for box in boxes:
        left = int(box.left * width)
        top = int(box.top * height)
        right = int((box.left + box.width) * width)
        bottom = int((box.top + box.height) * height)
        # Pad slightly so the edges of a face/plate are covered too.
        pad_x = int((right - left) * 0.1)
        pad_y = int((bottom - top) * 0.1)
        left = max(0, left - pad_x)
        top = max(0, top - pad_y)
        right = min(width, right + pad_x)
        bottom = min(height, bottom + pad_y)
        if right <= left or bottom <= top:
            continue
        region = out.crop((left, top, right, bottom))
        region = region.filter(ImageFilter.GaussianBlur(radius=max(8, (right - left) // 6)))
        out.paste(region, (left, top))
    return out


async def _apply_gdpr_blur(image: Image.Image) -> Image.Image:
    """Blur faces and number plates. Uses Rekognition to find them and blur
    only those regions; falls back to a soft full-image blur otherwise."""
    if rekognition.is_configured():
        try:
            buf = io.BytesIO()
            image.save(buf, format="JPEG", quality=90)
            boxes = await rekognition.detect_privacy_regions(buf.getvalue())
            return _blur_regions(image, boxes) if boxes else image
        except Exception:
            logger.warning("gdpr_blur: Rekognition failed; using full-image blur", exc_info=True)
    return image.filter(ImageFilter.GaussianBlur(radius=2))


async def _apply_sky_replacement(raw: bytes) -> Image.Image | None:
    """Replace the sky/background via ClipDrop. Returns None (caller keeps the
    current image) when ClipDrop isn't configured or the call fails."""
    if clipdrop.is_configured():
        try:
            replaced = await clipdrop.replace_background(raw, _SKY_PROMPT)
            return Image.open(io.BytesIO(replaced)).convert("RGB")
        except Exception:
            logger.warning(
                "sky_replacement: ClipDrop failed; leaving image unchanged", exc_info=True
            )
    return None


async def _apply_object_removal(image: Image.Image, mask: bytes) -> Image.Image | None:
    """Erase the masked region via ClipDrop cleanup. Operates on the current
    image so it composes with any prior step. Returns None when ClipDrop isn't
    configured or the call fails."""
    if clipdrop.is_configured():
        try:
            cleaned = await clipdrop.cleanup(_encode_jpeg(image), mask)
            return Image.open(io.BytesIO(cleaned)).convert("RGB")
        except Exception:
            logger.warning("object_removal: ClipDrop cleanup failed; skipping", exc_info=True)
    return None


async def _process_enhanced(
    image: Image.Image,
    raw: bytes,
    mask: bytes | None,
    enhancements: list[Enhancement],
) -> tuple[Image.Image, list[Enhancement]]:
    applied: list[Enhancement] = []
    # PIL.ImageOps.autocontrast (and several other ops) doesn't accept RGBA.
    # PNG sources can land here with an alpha channel; flatten to RGB up front
    # so every downstream op is happy and the JPEG encode at the end is
    # consistent.
    out = image.convert("RGB") if image.mode != "RGB" else image.copy()

    if "sky_replacement" in enhancements:
        replaced = await _apply_sky_replacement(raw)
        if replaced is not None:
            out = replaced
            applied.append("sky_replacement")

    if "object_removal" in enhancements and mask is not None:
        cleaned = await _apply_object_removal(out, mask)
        if cleaned is not None:
            out = cleaned
            applied.append("object_removal")

    if "exposure_correction" in enhancements:
        out = _apply_exposure_correction(out)
        applied.append("exposure_correction")

    if "gdpr_blur" in enhancements:
        out = await _apply_gdpr_blur(out)
        applied.append("gdpr_blur")

    return out, applied


async def _process_dusk(image: Image.Image, raw: bytes) -> Image.Image:
    """Dusk relight via Replicate; warm/darker PIL approximation as fallback."""
    if replicate.is_configured():
        try:
            relit = await replicate.relight_dusk(raw, _DUSK_PROMPT)
            return Image.open(io.BytesIO(relit)).convert("RGB")
        except Exception:
            logger.warning("dusk_shot: Replicate failed; using PIL approximation", exc_info=True)
    base = image.convert("RGB") if image.mode != "RGB" else image
    out = ImageEnhance.Color(base).enhance(0.85)
    out = ImageEnhance.Brightness(out).enhance(0.75)
    return out


def _key(photo_id: str, suffix: str) -> str:
    # The API's photo objects already live under
    # agencies/<a>/properties/<p>/photos/<photo>/<filename>. We don't have the
    # agency/property here, so we put outputs under a flat "enhanced/" prefix
    # keyed by photo id + a random nonce.
    return f"enhanced/{photo_id}/{suffix}-{uuid.uuid4().hex}.jpg"


def _encode_jpeg(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="JPEG", quality=88, optimize=True)
    return buf.getvalue()


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


async def _post_callback(
    callback_url: str,
    payload: dict[str, object],
) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode()
    headers = {
        "content-type": "application/json",
        "x-orchestrator-signature": sign(body),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        await client.post(callback_url, content=body, headers=headers)


async def run_photo_enhance_job(
    *,
    photo_id: str,
    agency_id: str,
    photo_url: str,
    enhancements: list[Enhancement],
    callback_url: str,
    mask_url: str | None = None,
) -> None:
    """Background-task entry point. Fetches the original, applies the
    enhancements, uploads outputs, and POSTs the callback. Any failure is
    reported via callback `status: failed` rather than raising."""
    try:
        raw = await _download(photo_url)
        original = Image.open(io.BytesIO(raw))

        # The mask only matters for object_removal; fetch it when both are present.
        mask: bytes | None = None
        if mask_url and "object_removal" in enhancements:
            mask = await _download(mask_url)

        enhanced_url: str | None = None
        dusk_url: str | None = None
        applied: list[Enhancement] = []

        non_dusk: list[Enhancement] = [e for e in enhancements if e != "dusk_shot"]
        if non_dusk:
            processed, marks = await _process_enhanced(original, raw, mask, non_dusk)
            enhanced_url = put_object(_key(photo_id, "enhanced"), _encode_jpeg(processed))
            applied.extend(marks)

        if "dusk_shot" in enhancements:
            dusk = await _process_dusk(original, raw)
            dusk_url = put_object(_key(photo_id, "dusk"), _encode_jpeg(dusk))
            applied.append("dusk_shot")

        await _post_callback(
            callback_url,
            {
                "photo_id": photo_id,
                "agency_id": agency_id,
                "enhancements_applied": applied,
                "enhanced_url": enhanced_url,
                "dusk_url": dusk_url,
                "status": "complete",
            },
        )
    except Exception as exc:
        # Any failure is reported via the callback rather than raised, so the
        # API can mark the photo failed and the user can retry. Guard the
        # callback itself — if even that throws, there's nothing more to do.
        try:
            await _post_callback(
                callback_url,
                {
                    "photo_id": photo_id,
                    "agency_id": agency_id,
                    "enhancements_applied": [],
                    "enhanced_url": None,
                    "dusk_url": None,
                    "status": "failed",
                    "error": str(exc),
                },
            )
        except Exception:
            pass
