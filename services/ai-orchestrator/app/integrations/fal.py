"""fal.ai queue API client (async, via httpx).

Used for virtual staging via the FLUX.2 apartment-staging model
(`fal_staging_model`). We submit the job to fal's queue endpoint, poll until it
completes, then download the generated image bytes.

Auth is the `FAL_KEY` environment variable, sent as `Authorization: Key <key>`.
Callers guard on `is_configured()` and fall back to a local PIL approximation
when the key is unset (dev) — see app/services/staging.py.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.config import get_settings

_QUEUE_BASE = "https://queue.fal.run"
# Non-terminal fal queue states.
_PENDING = ("IN_QUEUE", "IN_PROGRESS")


class FalError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(get_settings().fal_key)


def _headers() -> dict[str, str]:
    key = get_settings().fal_key
    if not key:
        raise FalError("FAL_KEY is not set.")
    return {"Authorization": f"Key {key}", "Content-Type": "application/json"}


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


async def run_model(model: str, model_input: dict[str, Any]) -> dict[str, Any]:
    """Submit a job to the fal queue, poll to completion, return the result JSON.

    The submit response carries `status_url`/`response_url`; we poll the former
    until the request leaves the pending states, then fetch the latter.
    """
    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(f"{_QUEUE_BASE}/{model}", headers=_headers(), json=model_input)
        if resp.status_code >= 400:
            raise FalError(f"fal submit failed ({resp.status_code}): {resp.text}")
        submit = resp.json()

        status_url = submit.get("status_url")
        response_url = submit.get("response_url")
        if not status_url or not response_url:
            raise FalError(f"fal submit returned no status/response url: {submit}")

        status = submit.get("status") or "IN_QUEUE"
        while status in _PENDING:
            await asyncio.sleep(2)
            poll = await client.get(status_url, headers=_headers())
            poll.raise_for_status()
            status = poll.json().get("status")

        if status != "COMPLETED":
            raise FalError(f"fal request did not complete (status={status})")

        result = await client.get(response_url, headers=_headers())
        result.raise_for_status()
        data: dict[str, Any] = result.json()
        return data


async def stage_room(
    image_url: str,
    prompt: str,
    *,
    seed: int,
    image_size: dict[str, int],
) -> bytes:
    """Furnish an empty room. `image_url` must be publicly fetchable by fal
    (our R2 public URLs are). Returns the generated JPEG bytes."""
    result = await run_model(
        get_settings().fal_staging_model,
        {
            "image_urls": [image_url],
            "prompt": prompt,
            "seed": seed,
            "image_size": image_size,
            "num_images": 1,
            "output_format": "jpeg",
        },
    )
    images = result.get("images") or []
    url = images[0].get("url") if images else None
    if not url:
        raise FalError(f"fal staging returned no image: {result}")
    return await _download(url)
