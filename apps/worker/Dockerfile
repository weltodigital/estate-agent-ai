# Privett scan worker. Build from the repository root:
#   docker build -f apps/worker/Dockerfile .
FROM node:22-slim

WORKDIR /repo
RUN corepack enable

# Workspace manifests first for layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY apps/worker/package.json apps/worker/
# Copied only so the workspace matches the lockfile; web deps aren't installed.
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @privett/worker...

COPY packages/core packages/core
COPY apps/worker apps/worker

ENV NODE_ENV=production
WORKDIR /repo/apps/worker
CMD ["pnpm", "start"]
