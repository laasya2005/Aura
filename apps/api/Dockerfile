# Stage 1: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/ai/package.json packages/ai/
COPY packages/comms/package.json packages/comms/
COPY packages/queue/package.json packages/queue/
COPY packages/config-ts/package.json packages/config-ts/

RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/api/ apps/api/

RUN pnpm --filter @aura/db exec -- npx prisma generate && \
    pnpm --filter @aura/shared build && \
    pnpm --filter @aura/db build && \
    pnpm --filter @aura/ai build && \
    pnpm --filter @aura/comms build && \
    pnpm --filter @aura/queue build && \
    pnpm --filter @aura/api build

# pnpm deploy creates a standalone dir with flat node_modules (no symlinks)
RUN pnpm --filter @aura/api deploy --prod /prod/api

# Stage 2: Production
FROM node:20-alpine AS runner
RUN addgroup --system aura && adduser --system --ingroup aura aura

WORKDIR /app
COPY --from=builder /prod/api ./

USER aura
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/server.js"]
