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
    sketch_url: HttpUrl
    callback_url: HttpUrl


class StagingGenerateRequest(BaseModel):
    photo_url: HttpUrl
    style: Literal["modern", "scandi", "classic", "minimal", "luxury", "family"]
    variations: int = 3
    callback_url: HttpUrl


class PhotoEnhanceRequest(BaseModel):
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
    callback_url: HttpUrl


class VideoRenderRequest(BaseModel):
    photo_urls: list[HttpUrl]
    template: Literal["modern", "bold", "classic"]
    aspect: Literal["16:9", "1:1", "9:16"]
    callback_url: HttpUrl
