from fastapi import APIRouter

from app.models import JobAccepted, JobStatusResponse, StagingGenerateRequest

router = APIRouter()


@router.post("/generate", response_model=JobAccepted)
async def generate(_request: StagingGenerateRequest) -> JobAccepted:
    """Stub. Phase-1/6 will call Replicate inpainting with the chosen style."""
    return JobAccepted(job_id="stub")


@router.get("/{job_id}", response_model=JobStatusResponse)
async def status(job_id: str) -> JobStatusResponse:
    return JobStatusResponse(job_id=job_id, status="queued", detail="stub")
