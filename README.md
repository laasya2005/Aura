# Aura

Full-stack AI companion application that sends personalized texts, voice calls, and messages based on your goals and preferred personality style.

## Quick Start

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Architecture

- **apps/web** — Next.js 14 dashboard
- **apps/api** — Fastify API server
- **packages/db** — Prisma ORM + PostgreSQL
- **packages/shared** — Types, utilities, security
- **packages/ai** — AI engine (Claude)
- **packages/comms** — Twilio SMS/Voice, ElevenLabs TTS
- **packages/queue** — BullMQ job scheduler

## Scripts

| Command           | Description             |
| ----------------- | ----------------------- |
| `pnpm dev`        | Start all services      |
| `pnpm build`      | Build all packages      |
| `pnpm test`       | Run all tests           |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed`    | Seed test data          |
| `pnpm db:studio`  | Open Prisma Studio      |
