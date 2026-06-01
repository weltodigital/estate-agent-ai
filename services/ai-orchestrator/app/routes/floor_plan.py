from fastapi import APIRouter, BackgroundTasks

from app.models import FloorPlanParseRequest, JobAccepted, JobStatusResponse
from app.services.floor_plan import run_parse_job

router = APIRouter()


@router.post("/parse", response_model=JobAccepted)
async def parse(
    request: FloorPlanParseRequest,
    background: BackgroundTasks,
) -> JobAccepted:
    """Schedules a floor-plan parse: Claude Vision (CLAUDE_VISION_MODEL) with
    a strict-JSON system prompt, Pydantic validation with one corrective
    retry, SVG render, R2 upload, signed callback to the API."""
    job_id = f"floor-plan-parse:{request.floor_plan_id}"
    background.add_task(
        run_parse_job,
        floor_plan_id=request.floor_plan_id,
        agency_id=request.agency_id,
        sketch_url=str(request.sketch_url),
        callback_url=str(request.callback_url),
    )
    return JobAccepted(job_id=job_id)


@router.get("/{job_id}", response_model=JobStatusResponse)
async def status(job_id: str) -> JobStatusResponse:
    return JobStatusResponse(job_id=job_id, status="processing", detail="callback-driven")
