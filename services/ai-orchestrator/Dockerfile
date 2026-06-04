# Multi-stage build for the ai-orchestrator service.

# ---------- builder ----------
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install uv (the modern Python tooling) and build the project.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:${PATH}"

COPY pyproject.toml ./
COPY app ./app

RUN uv sync --no-dev

# ---------- runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copy the resolved virtualenv from the builder.
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app /app/app
COPY pyproject.toml ./

ENV PATH="/app/.venv/bin:${PATH}"

EXPOSE 8000

# Bind :: (IPv6, dual-stack) so Railway's private network can reach the
# service internally — the worker calls it at <service>.railway.internal:8000.
CMD ["uvicorn", "app.main:app", "--host", "::", "--port", "8000"]
