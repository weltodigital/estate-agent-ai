"""Replicate REST API client (async, via httpx).

We call Replicate's HTTP API directly rather than adding the `replicate`
package — it keeps the dependency set unchanged and matches the async-httpx
convention used elsewhere in the orchestrator.

Helpers exposed:
  - `relight_dusk`  — golden-hour / dusk relighting
  - `replace_sky`   — relight toward a bright, clear blue-sky day
  - `remove_object` — LaMa inpainting (erase a masked region)

Both take raw image bytes, hand the model a data URI, run the prediction to
completion, and return the generated image bytes. Model slugs come from config
(`replicate_relight_model` / `replicate_inpaint_model`) so they can be pinned
or swapped without a code change. Callers guard on `is_configured()` and fall
back to a local PIL approximation when the token is unset or a call fails.

(Virtual staging moved to the fal.ai FLUX.2 model — see app/integrations/fal.py.)
"""

from __future__ import annotations

import asyncio
import base64
from typing import Any

import httpx

from app.config import get_settings

_API_BASE = "https://api.replicate.com/v1"
# Terminal Replicate prediction states.
_PENDING = ("starting", "processing")
# Cache each model's latest-version id for the process lifetime. Resolving it
# costs an extra round-trip per prediction, and it changes only when the model
# owner publishes a new version (rare; a redeploy clears the cache).
_version_cache: dict[str, str] = {}


class ReplicateNotConfiguredError(RuntimeError):
    pass


class ReplicateError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(get_settings().replicate_api_token)


def _headers() -> dict[str, str]:
    token = get_settings().replicate_api_token
    if not token:
        raise ReplicateNotConfiguredError("REPLICATE_API_TOKEN is not set.")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _data_uri(image_bytes: bytes, mime: str = "image/jpeg") -> str:
    return f"data:{mime};base64,{base64.b64encode(image_bytes).decode()}"


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


async def _latest_version(client: httpx.AsyncClient, model: str) -> str:
    """Resolve a model's latest version id (cached per process)."""
    cached = _version_cache.get(model)
    if cached:
        return cached
    resp = await client.get(f"{_API_BASE}/models/{model}", headers=_headers())
    if resp.status_code >= 400:
        raise ReplicateError(f"Replicate model lookup failed ({resp.status_code}): {resp.text}")
    version = resp.json().get("latest_version", {}).get("id")
    if not isinstance(version, str) or not version:
        raise ReplicateError(f"Replicate model {model!r} has no published version.")
    _version_cache[model] = version
    return version


async def run_model(model: str, model_input: dict[str, Any]) -> list[str]:
    """Run a Replicate model to completion and return its output URL(s).

    Resolves the model's latest version and creates the prediction via the
    versioned `/predictions` endpoint with the `Prefer: wait` header (so short
    jobs return synchronously; anything still running after the wait window is
    polled until it terminates). The versioned endpoint works for community
    models — `/models/{model}/predictions` is limited to Replicate's official
    models and 404s otherwise.
    """
    async with httpx.AsyncClient(timeout=120) as client:
        version = await _latest_version(client, model)
        resp = await client.post(
            f"{_API_BASE}/predictions",
            headers={**_headers(), "Prefer": "wait"},
            json={"version": version, "input": model_input},
        )
        if resp.status_code >= 400:
            raise ReplicateError(f"Replicate create failed ({resp.status_code}): {resp.text}")
        prediction: Any = resp.json()

        get_url = prediction.get("urls", {}).get("get")
        while prediction.get("status") in _PENDING and get_url:
            await asyncio.sleep(2)
            poll = await client.get(get_url, headers=_headers())
            poll.raise_for_status()
            prediction = poll.json()

        status = prediction.get("status")
        if status != "succeeded":
            raise ReplicateError(f"Replicate prediction {status}: {prediction.get('error')}")

        output = prediction.get("output")
        if isinstance(output, str):
            return [output]
        if isinstance(output, list):
            return [item for item in output if isinstance(item, str)]
        raise ReplicateError(f"Unexpected Replicate output shape: {type(output)!r}")


async def relight_dusk(image_bytes: bytes, prompt: str) -> bytes:
    """Relight a photo for a dusk / golden-hour look. Returns image bytes."""
    outputs = await run_model(
        get_settings().replicate_relight_model,
        {"image": _data_uri(image_bytes), "prompt": prompt},
    )
    if not outputs:
        raise ReplicateError("Relight model returned no image.")
    return await _download(outputs[0])


async def replace_sky(image_bytes: bytes, prompt: str) -> bytes:
    """Relight a photo toward a bright, clear blue-sky day. Uses the same
    relight model as dusk with a daylight prompt. Returns image bytes."""
    outputs = await run_model(
        get_settings().replicate_relight_model,
        {"image": _data_uri(image_bytes), "prompt": prompt},
    )
    if not outputs:
        raise ReplicateError("Sky model returned no image.")
    return await _download(outputs[0])


async def remove_object(image_bytes: bytes, mask_bytes: bytes) -> bytes:
    """Erase the masked region (object removal) with LaMa inpainting. The mask
    is a PNG the same size as the image where white = remove. Returns the
    inpainted image bytes."""
    outputs = await run_model(
        get_settings().replicate_inpaint_model,
        {"image": _data_uri(image_bytes), "mask": _data_uri(mask_bytes, "image/png")},
    )
    if not outputs:
        raise ReplicateError("Inpaint model returned no image.")
    return await _download(outputs[0])


async def upscale(image_bytes: bytes, scale: int = 2) -> bytes:
    """HD upscale with Real-ESRGAN. `scale` is the factor (2x by default).
    Returns the upscaled image bytes."""
    outputs = await run_model(
        get_settings().replicate_upscale_model,
        {"image": _data_uri(image_bytes), "scale": scale},
    )
    if not outputs:
        raise ReplicateError("Upscale model returned no image.")
    return await _download(outputs[0])
