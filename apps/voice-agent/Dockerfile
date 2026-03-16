# Stage 1: Install & Build
FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/voice-agent/package.json apps/voice-agent/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/ai/package.json packages/ai/
COPY packages/comms/package.json packages/comms/
COPY packages/config-ts/package.json packages/config-ts/

RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/voice-agent/ apps/voice-agent/

RUN pnpm --filter @aura/db exec -- npx prisma generate && \
    pnpm --filter @aura/shared build && \
    pnpm --filter @aura/db build && \
    pnpm --filter @aura/ai build && \
    pnpm --filter @aura/comms build && \
    pnpm --filter @aura/voice-agent build

# pnpm deploy creates flat node_modules
RUN pnpm --filter @aura/voice-agent deploy --prod /prod/voice-agent && \
    PRISMA_SRC=$(find /app/node_modules/.pnpm -path "*/.prisma/client" -type d | head -1) && \
    PRISMA_DST=$(find /prod/voice-agent/node_modules/.pnpm -path "*/.prisma/client" -type d | head -1) && \
    if [ -n "$PRISMA_SRC" ] && [ -n "$PRISMA_DST" ]; then cp -r "$PRISMA_SRC"/. "$PRISMA_DST"/; fi

# Stage 2: Production
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd --system aura && useradd --system --gid aura aura

WORKDIR /app
COPY --from=builder /prod/voice-agent ./

USER aura
ENV NODE_ENV=production

CMD ["node", "dist/agent.js", "start"]
