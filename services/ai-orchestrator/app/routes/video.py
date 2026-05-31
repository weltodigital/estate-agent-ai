from fastapi import APIRouter

from app.models import JobAccepted, JobStatusResponse, VideoRenderRequest

router = APIRouter()


@router.post("/render", response_model=JobAccepted)
async def render(_request: VideoRenderRequest) -> JobAccepted:
    """Stub. Post-phase-1 FFmpeg slideshow renderer."""
    return JobAccepted(job_id="stub")


@router.get("/{job_id}", response_model=JobStatusResponse)
async def status(job_id: str) -> JobStatusResponse:
    return JobStatusResponse(job_id=job_id, status="queued", detail="stub")
