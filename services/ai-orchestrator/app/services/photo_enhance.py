"""Photo enhancement pipeline.

Downloads the original photo, applies the requested enhancements, uploads the
results to R2, and POSTs the URLs back to the API.

Auto-cleanup enhancements are gated (only applied when an analysis says they
help), so they never make a good photo worse.

Implementations:
  - exposure_correction: PIL (autocontrast + brightness), only when under/over
                         exposed or low-contrast
  - colour_temperature:  PIL grey-world white balance, only when a cast is found
  - hd_upscale:          Replicate Real-ESRGAN, only for sub-1400px photos
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
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageStat

from app.integrations import rekognition, replicate
from app.integrations.hmac_sign import sign
from app.integrations.r2 import put_object

logger = logging.getLogger(__name__)

Enhancement = Literal[
    "sky_replacement",
    "object_removal",
    "gdpr_blur",
    "exposure_correction",
    "colour_temperature",
    "colour_saturation",
    "shadow_boost",
    "hd_upscale",
    "logo_watermark",
    "dusk_shot",
]
WatermarkPosition = Literal["top-left", "top-right", "bottom-left", "bottom-right"]

_DUSK_PROMPT = "warm golden-hour dusk lighting, sunset glow, soft warm tones, twilight sky"
# Auto-upscale only photos whose longest side is below this (anything larger is
# already listing-quality, so we don't spend a Replicate call on it).
_UPSCALE_THRESHOLD = 1400


# --- Conditional gates: auto-cleanup only applies when it genuinely helps, so
# it never makes a good photo worse. ---


def _needs_exposure(image: Image.Image) -> bool:
    stat = ImageStat.Stat(image.convert("L"))
    mean, std = stat.mean[0], stat.stddev[0]
    # Under-exposed, over-exposed, or flat (low contrast).
    return mean < 105 or mean > 175 or std < 45


def _needs_colour_temperature(image: Image.Image) -> bool:
    r, g, b = ImageStat.Stat(image.convert("RGB")).mean
    avg = (r + g + b) / 3
    if avg <= 0:
        return False
    return max(abs(r - avg), abs(g - avg), abs(b - avg)) / avg > 0.06


def _needs_shadow_boost(image: Image.Image) -> bool:
    hist = image.convert("L").histogram()
    total = sum(hist) or 1
    # Crushed shadows: a meaningful share of pixels sit in the darkest band.
    return sum(hist[:40]) / total > 0.12


def _needs_upscale(image: Image.Image) -> bool:
    return max(image.size) < _UPSCALE_THRESHOLD


def _apply_exposure_correction(image: Image.Image) -> Image.Image:
    # Auto-contrast then nudge brightness — keeps the image looking like the
    # property, not a film stock.
    image = ImageOps.autocontrast(image, cutoff=1)
    image = ImageEnhance.Brightness(image).enhance(1.05)
    return image


def _apply_colour_temperature(image: Image.Image) -> Image.Image:
    """Grey-world white balance: scale each channel toward neutral so a yellow
    or blue cast is corrected. Partial (70%) so the photo keeps its character."""
    r, g, b = ImageStat.Stat(image.convert("RGB")).mean
    avg = (r + g + b) / 3

    def lut(channel_mean: float) -> list[int]:
        scale = 1 + (avg / max(channel_mean, 1) - 1) * 0.7
        return [min(255, round(i * scale)) for i in range(256)]

    rc, gc, bc = image.convert("RGB").split()
    return Image.merge("RGB", (rc.point(lut(r)), gc.point(lut(g)), bc.point(lut(b))))


def _apply_colour_saturation(image: Image.Image) -> Image.Image:
    # Gentle saturation lift — punchier without looking oversaturated.
    return ImageEnhance.Color(image).enhance(1.15)


async def _apply_upscale(image: Image.Image) -> Image.Image | None:
    """HD upscale via Replicate Real-ESRGAN. Returns None if Replicate isn't
    configured or the call fails (the pipeline then keeps the original size)."""
    if not replicate.is_configured():
        return None
    try:
        out = await replicate.upscale(_encode_jpeg(image), scale=2)
        return Image.open(io.BytesIO(out)).convert("RGB")
    except Exception:
        logger.warning("hd_upscale: Replicate failed; skipping", exc_info=True)
        return None


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


async def _apply_gdpr_blur(image: Image.Image) -> tuple[Image.Image, bool]:
    """Blur faces and number plates that Rekognition finds. Returns the image
    and whether anything was actually blurred — so on auto-apply a photo with no
    people/plates is left untouched (no whole-image softening) and isn't marked
    as enhanced."""
    if not rekognition.is_configured():
        return image, False
    try:
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=90)
        boxes = await rekognition.detect_privacy_regions(buf.getvalue())
    except Exception:
        logger.warning("gdpr_blur: Rekognition failed; skipping", exc_info=True)
        return image, False
    if not boxes:
        return image, False
    return _blur_regions(image, boxes), True


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

    # Upscale first, so every later op runs at the higher resolution. Gated on
    # size so we don't spend a Replicate call on already-large photos.
    if "hd_upscale" in enhancements and _needs_upscale(out):
        upscaled = await _apply_upscale(out)
        if upscaled is not None:
            out = upscaled
            applied.append("hd_upscale")

    if "object_removal" in enhancements and mask is not None:
        cleaned = await _apply_object_removal(out, mask)
        if cleaned is not None:
            out = cleaned
            applied.append("object_removal")

    # Auto-cleanup ops are gated so they only apply when they genuinely help.
    if "shadow_boost" in enhancements and _needs_shadow_boost(out):
        out = _apply_shadow_boost(out)
        applied.append("shadow_boost")

    if "exposure_correction" in enhancements and _needs_exposure(out):
        out = _apply_exposure_correction(out)
        applied.append("exposure_correction")

    if "colour_temperature" in enhancements and _needs_colour_temperature(out):
        out = _apply_colour_temperature(out)
        applied.append("colour_temperature")

    if "colour_saturation" in enhancements:
        out = _apply_colour_saturation(out)
        applied.append("colour_saturation")

    if "gdpr_blur" in enhancements:
        out, blurred = await _apply_gdpr_blur(out)
        if blurred:
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
