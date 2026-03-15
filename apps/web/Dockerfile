# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/config-ts/package.json packages/config-ts/

RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/ ./packages/
COPY packages/ packages/
COPY apps/web/ apps/web/
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

RUN pnpm --filter @aura/shared build && \
    pnpm --filter @aura/web build

# Stage 3: Production
FROM node:20-alpine AS runner

RUN addgroup --system aura && adduser --system --ingroup aura aura

WORKDIR /app

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

USER aura
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
