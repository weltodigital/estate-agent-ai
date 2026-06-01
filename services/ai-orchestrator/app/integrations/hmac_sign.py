"""HMAC-SHA256 callback signing.

The API verifies an `X-Orchestrator-Signature: sha256=<hex>` header on every
callback POST. Both sides share AI_CALLBACK_SECRET.
"""

from __future__ import annotations

import hashlib
import hmac

from app.config import get_settings


def sign(body: bytes) -> str:
    secret = get_settings().ai_callback_secret.encode()
    digest = hmac.new(secret, body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"
