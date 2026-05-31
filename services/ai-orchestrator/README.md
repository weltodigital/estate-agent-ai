# ai-orchestrator

Python 3.12 + FastAPI service. Calls Claude Vision (floor plan parsing,
room-type detection), Replicate (inpainting / virtual staging), ClipDrop +
Sharp + Rekognition (photo enhancement), and FFmpeg (video rendering).

```
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

See [CLAUDE.md](./CLAUDE.md).
