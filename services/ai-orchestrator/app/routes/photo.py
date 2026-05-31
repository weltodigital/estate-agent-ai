from fastapi import APIRouter

from app.models import JobAccepted, JobStatusResponse, PhotoEnhanceRequest

router = APIRouter()


@router.post("/enhance", response_model=JobAccepted)
async def enhance(_request: PhotoEnhanceRequest) -> JobAccepted:
    """Stub. Phase-1/5 orchestrates ClipDrop + Sharp + Rekognition."""
    return JobAccepted(job_id="stub")


@router.get("/{job_id}", response_model=JobStatusResponse)
async def status(job_id: str) -> JobStatusResponse:
    return JobStatusResponse(job_id=job_id, status="queued", detail="stub")
