"""Photo enhancement pipeline.

Downloads the original photo, applies the requested enhancements, uploads the
results to R2, and POSTs the URLs back to the API.

Implementations:
  - exposure_correction: PIL (autocontrast + small brightness lift)
  - colour_saturation:   PIL (gentle saturation boost)
  - shadow_boost:        PIL (lift shadows only — composite a brightened copy
                         into dark regions via an inverted-luminance mask)
  - logo_watermark:      PIL (composite the agency logo into a corner; needs
                         logo_url + watermark_position)
  - gdpr_blur:           AWS Rekognition face/text (number-plate) detection +
                         targeted blur; falls back to a full-image blur when
                         AWS isn't configured
  - dusk_shot:           Replicate relighting model -> dusk_url; falls back to
                         a warm/darker PIL approximation
  - object_removal:      Replicate LaMa inpainting using the painted mask
                         (mask_url); a no-op if no mask or Replicate is unset
  - sky_replacement:     no provider — hidden in the UI. Kept in the enum so a
                         future sky provider can be wired back in cleanly.

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

from app.integrations import rekognition, replicate
from app.integrations.hmac_sign import sign
from app.integrations.r2 import put_object

logger = logging.getLogger(__name__)

Enhancement = Literal[
    "sky_replacement",
    "object_removal",
    "gdpr_blur",
    "exposure_correction",
    "colour_saturation",
    "shadow_boost",
    "logo_watermark",
    "dusk_shot",
]
WatermarkPosition = Literal["top-left", "top-right", "bottom-left", "bottom-right"]

_DUSK_PROMPT = "warm golden-hour dusk lighting, sunset glow, soft warm tones, twilight sky"


def _apply_exposure_correction(image: Image.Image) -> Image.Image:
    # Auto-contrast then nudge brightness — keeps the image looking like the
    # property, not a film stock.
    image = ImageOps.autocontrast(image, cutoff=1)
    image = ImageEnhance.Brightness(image).enhance(1.05)
    return image


def _apply_colour_saturation(image: Image.Image) -> Image.Image:
    # Gentle saturation lift — punchier without looking oversaturated.
    return ImageEnhance.Color(image).enhance(1.15)


def _apply_shadow_boost(image: Image.Image) -> Image.Image:
    """Lift shadows to reveal detail without blowing out the highlights:
    composite a brightened copy into the dark regions only, weighted by an
    inverted-luminance mask (darker pixels get more of the brightened copy)."""
    brightened = ImageEnhance.Brightness(image).enhance(1.4)
    mask = ImageOps.invert(image.convert("L"))
    return Image.composite(brightened, image, mask)


def _watermark_offset(
    position: WatermarkPosition,
    base_size: tuple[int, int],
    logo_size: tuple[int, int],
    margin: int,
) -> tuple[int, int]:
    base_w, base_h = base_size
    logo_w, logo_h = logo_size
    x = margin if "left" in position else base_w - logo_w - margin
    y = margin if "top" in position else base_h - logo_h - margin
    return x, y


def _apply_logo_watermark(
    image: Image.Image, logo_bytes: bytes, position: WatermarkPosition
) -> Image.Image:
    """Composite the agency logo into the chosen corner, scaled to ~18% of the
    image width and slightly transparent so it reads as a watermark."""
    logo = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
    target_w = max(60, image.width // 6)
    if logo.width != target_w:
        ratio = target_w / logo.width
        logo = logo.resize((target_w, max(1, round(logo.height * ratio))))
    # Knock the logo back to ~85% so it sits on the photo, not over it.
    logo.putalpha(logo.getchannel("A").point(lambda a: round(a * 0.85)))

    margin = max(12, image.width // 50)
    base = image.convert("RGBA")
    base.alpha_composite(logo, _watermark_offset(position, base.size, logo.size, margin))
    return base.convert("RGB")


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


async def _apply_object_removal(image: Image.Image, mask: bytes) -> Image.Image | None:
    """Erase the masked region via Replicate LaMa inpainting. Operates on the
    current image so it composes with any prior step. Returns None when
    Replicate isn't configured or the call fails."""
    if replicate.is_configured():
        try:
            cleaned = await replicate.remove_object(_encode_jpeg(image), mask)
            return Image.open(io.BytesIO(cleaned)).convert("RGB")
        except Exception:
            logger.warning("object_removal: Replicate inpaint failed; skipping", exc_info=True)
    return None


async def _process_enhanced(
    image: Image.Image,
    mask: bytes | None,
    logo: bytes | None,
    watermark_position: WatermarkPosition,
    enhancements: list[Enhancement],
) -> tuple[Image.Image, list[Enhancement]]:
    applied: list[Enhancement] = []
    # PIL.ImageOps.autocontrast (and several other ops) doesn't accept RGBA.
    # PNG sources can land here with an alpha channel; flatten to RGB up front
    # so every downstream op is happy and the JPEG encode at the end is
    # consistent.
    out = image.convert("RGB") if image.mode != "RGB" else image.copy()

    # sky_replacement: no provider currently (hidden in the UI), so it's a
    # no-op here and never marked applied.

    if "object_removal" in enhancements and mask is not None:
        cleaned = await _apply_object_removal(out, mask)
        if cleaned is not None:
            out = cleaned
            applied.append("object_removal")

    if "shadow_boost" in enhancements:
        out = _apply_shadow_boost(out)
        applied.append("shadow_boost")

    if "exposure_correction" in enhancements:
        out = _apply_exposure_correction(out)
        applied.append("exposure_correction")

    if "colour_saturation" in enhancements:
        out = _apply_colour_saturation(out)
        applied.append("colour_saturation")

    if "gdpr_blur" in enhancements:
        out = await _apply_gdpr_blur(out)
        applied.append("gdpr_blur")

    # Watermark goes on last so the logo sits on top of every other edit.
    if "logo_watermark" in enhancements and logo is not None:
        out = _apply_logo_watermark(out, logo, watermark_position)
        applied.append("logo_watermark")

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
    logo_url: str | None = None,
    watermark_position: WatermarkPosition = "bottom-right",
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

        # Likewise the logo only matters for logo_watermark.
        logo: bytes | None = None
        if logo_url and "logo_watermark" in enhancements:
            logo = await _download(logo_url)

        enhanced_url: str | None = None
        dusk_url: str | None = None
        applied: list[Enhancement] = []

        non_dusk: list[Enhancement] = [e for e in enhancements if e != "dusk_shot"]
        if non_dusk:
            processed, marks = await _process_enhanced(
                original, mask, logo, watermark_position, non_dusk
            )
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
