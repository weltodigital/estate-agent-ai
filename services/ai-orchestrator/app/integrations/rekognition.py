"""AWS Rekognition client for GDPR-blur region detection.

Detects faces and text (UK number plates show up as text) and returns their
bounding boxes as fractions of the image, so the caller can blur just those
regions instead of the whole photo. boto3 is synchronous, so the calls run in
a worker thread.

Callers guard on `is_configured()` and fall back to a full-image blur when AWS
credentials are unset or a call fails.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import boto3

from app.config import get_settings


@dataclass(frozen=True)
class Box:
    """A bounding box. All values are fractions of width/height in [0, 1]."""

    left: float
    top: float
    width: float
    height: float


def is_configured() -> bool:
    settings = get_settings()
    return bool(settings.aws_access_key_id and settings.aws_secret_access_key)


def _client() -> Any:
    settings = get_settings()
    return boto3.client(
        "rekognition",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )


def _box_from(geometry: dict[str, Any] | None) -> Box | None:
    if not geometry:
        return None
    return Box(
        left=float(geometry["Left"]),
        top=float(geometry["Top"]),
        width=float(geometry["Width"]),
        height=float(geometry["Height"]),
    )


def _detect_sync(image_bytes: bytes) -> list[Box]:
    client = _client()
    boxes: list[Box] = []

    faces = client.detect_faces(Image={"Bytes": image_bytes})
    for face in faces.get("FaceDetails", []):
        box = _box_from(face.get("BoundingBox"))
        if box:
            boxes.append(box)

    # Text covers number plates, house signs, etc. Only WORD detections —
    # LINE detections duplicate the same geometry.
    text = client.detect_text(Image={"Bytes": image_bytes})
    for detection in text.get("TextDetections", []):
        if detection.get("Type") != "WORD":
            continue
        box = _box_from(detection.get("Geometry", {}).get("BoundingBox"))
        if box:
            boxes.append(box)

    return boxes


async def detect_privacy_regions(image_bytes: bytes) -> list[Box]:
    """Return bounding boxes for faces and text (plates) to blur."""
    return await asyncio.to_thread(_detect_sync, image_bytes)
