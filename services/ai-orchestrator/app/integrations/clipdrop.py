"""ClipDrop API client (async, via httpx).

Used for sky replacement only — object removal moved to Replicate LaMa
(replicate.remove_object). `replace-background` swaps the background behind the
main subject for a text-prompted scene; on exterior shots that brightens the
sky, though it replaces the whole background, not only the sky.

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
