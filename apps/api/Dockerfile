# Dockerfile for the @app/api server AND worker (one image, two start commands).
#
# Build context is the REPO ROOT — on Railway set:
#   Root Directory   = /                (repo root)
#   Dockerfile Path  = apps/api/Dockerfile
#
# Why tsx and not `node dist`: the workspace packages @app/shared and @app/db
# export TypeScript source (no compiled dist), so the API is run with tsx,
# which transpiles the app and the workspace .ts on the fly. Railway injects
# PORT; the server binds 0.0.0.0:$PORT (see apps/api/src/server.ts).

# Node 22: required for native WebSocket, which @supabase/supabase-js needs at
# runtime (Node 20 throws "Node.js 20 detected without native WebSocket support").
FROM node:22-slim

# pnpm via corepack — version is pinned by the root package.json "packageManager".
RUN corepack enable
WORKDIR /repo

# Survive transient npm-registry blips during install. The default 2 retries
# isn't enough — flaky registry GETs surface as ERR_PNPM_ENOENT and fail the
# build (and can leave a half-written store). pnpm reads these npm_config_* vars.
ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000

# Install the whole workspace from the committed lockfile. The repo is copied
# in full; .dockerignore keeps node_modules / .next / dist / .venv / .env out.
COPY . .
RUN pnpm install --frozen-lockfile

WORKDIR /repo/apps/api
EXPOSE 3001

# Default = API server. The WORKER service reuses this image and overrides the
# Railway start command with:  pnpm exec tsx src/worker.ts
CMD ["pnpm", "exec", "tsx", "src/server.ts"]
