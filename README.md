# Aura

Full-stack AI companion application that sends personalized texts, voice calls, and messages based on your goals and preferred personality style.

<img width="1512" height="855" alt="Screenshot 2026-03-25 at 10 46 36 PM" src="https://github.com/user-attachments/assets/935e957b-d94a-4f52-94e4-03335d8a858b" />

<img width="1512" height="858" alt="Screenshot 2026-03-25 at 10 47 06 PM" src="https://github.com/user-attachments/assets/3f1f77cd-8fb3-45ed-9c22-313592d6a293" />


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
