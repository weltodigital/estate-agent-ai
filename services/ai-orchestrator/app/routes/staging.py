from fastapi import APIRouter, BackgroundTasks

from app.models import JobAccepted, JobStatusResponse, StagingGenerateRequest
from app.services.staging import run_staging_job

router = APIRouter()


@router.post("/generate", response_model=JobAccepted)
async def generate(
    request: StagingGenerateRequest,
    background: BackgroundTasks,
) -> JobAccepted:
    """Queues a virtual-staging job. The work runs in a background task
    (Replicate staging, with a PIL fallback) and POSTs the resulting variation
    URLs back to `callback_url` signed with HMAC."""
    job_id = f"staging-generate:{request.photo_id}"
    background.add_task(
        run_staging_job,
        photo_id=request.photo_id,
        agency_id=request.agency_id,
        photo_url=str(request.photo_url),
        style=request.style,
        variations=request.variations,
        callback_url=str(request.callback_url),
    )
    return JobAccepted(job_id=job_id)


@router.get("/{job_id}", response_model=JobStatusResponse)
async def status(job_id: str) -> JobStatusResponse:
    return JobStatusResponse(job_id=job_id, status="processing", detail="callback-driven")
