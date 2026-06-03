from fastapi import APIRouter, BackgroundTasks

from app.models import JobAccepted, JobStatusResponse, PhotoEnhanceRequest
from app.services.photo_enhance import run_photo_enhance_job

router = APIRouter()


@router.post("/enhance", response_model=JobAccepted)
async def enhance(
    request: PhotoEnhanceRequest,
    background: BackgroundTasks,
) -> JobAccepted:
    """Queues a photo-enhancement job. The work runs in a background task
    (PIL exposure, Rekognition GDPR blur, Replicate dusk + object removal) and
    POSTs the resulting URLs back to `callback_url` signed with HMAC."""
    job_id = f"photo-enhance:{request.photo_id}"
    background.add_task(
        run_photo_enhance_job,
        photo_id=request.photo_id,
        agency_id=request.agency_id,
        photo_url=str(request.photo_url),
        enhancements=list(request.enhancements),
        mask_url=str(request.mask_url) if request.mask_url else None,
        callback_url=str(request.callback_url),
    )
    return JobAccepted(job_id=job_id)


@router.get("/{job_id}", response_model=JobStatusResponse)
async def status(job_id: str) -> JobStatusResponse:
    # We don't persist job state — the API gets the outcome via callback.
    # This endpoint is kept for parity with the other queues.
    return JobStatusResponse(job_id=job_id, status="processing", detail="callback-driven")
