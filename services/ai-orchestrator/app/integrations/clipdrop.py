"""ClipDrop API client (async, via httpx).

Endpoints used:
  - `replace-background` — swaps the background behind the main subject for a
    text-prompted scene. We use it for "sky replacement" on exterior shots.
    Note: it replaces the whole background, not only the sky — good enough for
    a brighter sky on a house photo, but not a true sky-only swap.
  - `cleanup`            — erases a masked region (object removal). It needs a
    mask image marking what to remove. The current enhance contract carries no
    mask, so this stays dormant until a mask-selection UI exists; the client
    method is ready for that.

Auth: `x-api-key` header. Callers guard on `is_configured()` and fall back when
the key is unset or a call fails.
"""

from __future__ import annotations

import httpx

from app.config import get_settings

_API_BASE = "https://clipdrop-api.co"


class ClipDropNotConfiguredError(RuntimeError):
    pass


class ClipDropError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(get_settings().clipdrop_api_key)


def _headers() -> dict[str, str]:
    key = get_settings().clipdrop_api_key
    if not key:
        raise ClipDropNotConfiguredError("CLIPDROP_API_KEY is not set.")
    return {"x-api-key": key}


async def replace_background(image_bytes: bytes, prompt: str) -> bytes:
    """Replace the background behind the subject with a prompted scene."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{_API_BASE}/replace-background/v1",
            headers=_headers(),
            files={"image_file": ("image.jpg", image_bytes, "image/jpeg")},
            data={"prompt": prompt},
        )
        if resp.status_code >= 400:
            raise ClipDropError(
                f"ClipDrop replace-background failed ({resp.status_code}): {resp.text}"
            )
        return resp.content


async def cleanup(image_bytes: bytes, mask_bytes: bytes) -> bytes:
    """Erase the masked region (object removal).

    `mask_bytes` is a PNG the same size as the image where white pixels mark
    what to remove. Not wired into the enhance flow yet — there is no mask
    source in the current contract — but ready for a future mask-drawing UI.
    """
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{_API_BASE}/cleanup/v1",
            headers=_headers(),
            files={
                "image_file": ("image.jpg", image_bytes, "image/jpeg"),
                "mask_file": ("mask.png", mask_bytes, "image/png"),
            },
        )
        if resp.status_code >= 400:
            raise ClipDropError(f"ClipDrop cleanup failed ({resp.status_code}): {resp.text}")
        return resp.content
