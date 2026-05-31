# ai-orchestrator — Python FastAPI service
Supplements root CLAUDE.md.

## Conventions
- Python 3.12, `uv` for env and dependency management, `ruff` for lint and format, `mypy --strict`.
- Pydantic v2 for all request/response models.
- Async everywhere (`httpx.AsyncClient`, async route handlers).
- All Claude calls go through `app/llm/claude.py`. Model string from env. No hardcoded strings.
- Floor plan parsing: strict JSON output. The schema is in `app/llm/schemas.py`. Validate the model's response with Pydantic before returning to the callback. If validation fails, retry once with a corrective system message; on second failure, return `status: failed` with the parse error.
- Long-running jobs (>5s expected): accept the request, return a job_id immediately, do the work in a background task (`fastapi.BackgroundTasks` for v1; later move to a proper task runner).

## Calling the API back
- When a job finishes, POST to the callback URL provided by the caller. Sign the callback with HMAC-SHA256 using `AI_CALLBACK_SECRET`.
- The Fastify API verifies the signature before trusting the payload.

## Out of scope here
- No DB access. The orchestrator is stateless w.r.t. the product DB. It receives URLs, returns results.
