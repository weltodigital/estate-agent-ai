from fastapi import FastAPI

from app.routes import floor_plan, health, photo, staging, video

app = FastAPI(title="ai-orchestrator", version="0.1.0")

app.include_router(health.router)
app.include_router(floor_plan.router, prefix="/jobs/floor-plan", tags=["floor-plan"])
app.include_router(staging.router, prefix="/jobs/staging", tags=["staging"])
app.include_router(photo.router, prefix="/jobs/photo", tags=["photo"])
app.include_router(video.router, prefix="/jobs/video", tags=["video"])
