from fastapi import APIRouter

from app.models import FloorPlanParseRequest, JobAccepted, JobStatusResponse

router = APIRouter()


@router.post("/parse", response_model=JobAccepted)
async def parse(_request: FloorPlanParseRequest) -> JobAccepted:
    """Stub. Phase-1/7 will call Claude Vision (Sonnet 4.6) with a strict-JSON
    system prompt, validate via Pydantic, and POST the result to callback_url
    signed with HMAC-SHA256(AI_CALLBACK_SECRET)."""
    return JobAccepted(job_id="stub")


@router.get("/{job_id}", response_model=JobStatusResponse)
async def status(job_id: str) -> JobStatusResponse:
    return JobStatusResponse(job_id=job_id, status="queued", detail="stub")
