from typing import Literal

from pydantic import BaseModel, HttpUrl

JobStatus = Literal["queued", "processing", "complete", "failed"]


class JobAccepted(BaseModel):
    job_id: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    detail: str | None = None


class FloorPlanParseRequest(BaseModel):
    floor_plan_id: str
    agency_id: str
    sketch_url: HttpUrl
    callback_url: HttpUrl


class StagingGenerateRequest(BaseModel):
    photo_id: str
    agency_id: str
    photo_url: HttpUrl
    style: Literal["modern", "scandi", "classic", "minimal", "luxury", "family"]
    room_type: (
        Literal["living_room", "bedroom", "kitchen", "bathroom", "exterior", "garden", "other"]
        | None
    ) = None
    variations: int = 3
    callback_url: HttpUrl


class PhotoEnhanceRequest(BaseModel):
    photo_id: str
    agency_id: str
    property_id: str | None = None
    photo_url: HttpUrl
    enhancements: list[
        Literal[
            "sky_replacement",
            "object_removal",
            "gdpr_blur",
            "exposure_correction",
            "dusk_shot",
        ]
    ]
    # Present only for object_removal — the painted mask (white = remove).
    mask_url: HttpUrl | None = None
    callback_url: HttpUrl


class VideoRenderRequest(BaseModel):
    photo_urls: list[HttpUrl]
    template: Literal["modern", "bold", "classic"]
    aspect: Literal["16:9", "1:1", "9:16"]
    callback_url: HttpUrl
