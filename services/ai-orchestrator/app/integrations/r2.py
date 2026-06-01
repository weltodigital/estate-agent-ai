"""Cloudflare R2 (S3-compatible) client + helpers.

The orchestrator uploads enhanced / staged / final outputs directly to R2,
then POSTs the resulting URL back to the API callback. Bytes never round-trip
through the API.
"""

from __future__ import annotations

from typing import Any

import boto3

from app.config import get_settings


def _client() -> Any:
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


def public_url(key: str) -> str:
    base = get_settings().r2_public_base_url.rstrip("/")
    return f"{base}/{key}"


def put_object(key: str, body: bytes, content_type: str = "image/jpeg") -> str:
    """Uploads bytes to R2 under `key` and returns the public URL."""
    settings = get_settings()
    _client().put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=body,
        ContentType=content_type,
    )
    return public_url(key)
