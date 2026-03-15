# Aura — Launch Checklist & Deployment Guide

## Pre-Launch Security Checklist

- [ ] All environment variables set (see `.env.example`)
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are unique, random, 32+ characters
- [ ] `ENCRYPTION_KEY` is set and backed up securely
- [ ] `DATABASE_URL` uses production credentials (not defaults)
- [ ] Redis is password-protected (`REDIS_PASSWORD` set)
- [ ] `WEB_URL` set to production domain (CORS origin)
- [ ] `ADMIN_USER_IDS` configured
- [ ] Twilio webhook URLs use HTTPS
- [ ] Stripe webhook secret configured
- [ ] `NODE_ENV=production` on all services

## Pre-Launch Compliance Checklist

- [ ] TCPA consent flow tested (SMS opt-in, STOP/HELP keywords)
- [ ] Quiet hours enforcement verified
- [ ] PII encryption working (verify with `pnpm test` security tests)
- [ ] Account deletion anonymizes data correctly
- [ ] Audit logging captures all sensitive operations
- [ ] Crisis detection routes to 988 Lifeline
- [ ] AI safety filter blocks prohibited content categories

## Deployment

### 1. Build and push images

```bash
docker compose -f docker-compose.prod.yml build
```

### 2. Run database migrations

```bash
docker compose -f docker-compose.prod.yml run --rm migrate
```

### 3. Start services

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 4. Verify deployment

```bash
# Health check
curl https://api.yourdomain.com/health

# Expected response:
# {"status":"ok","timestamp":"...","checks":{"database":"ok","redis":"ok"},"uptime":...}
```

### 5. Smoke test

```bash
# Run k6 load test against production
k6 run -e API_URL=https://api.yourdomain.com tests/load/k6-smoke.js
```

## Rollback Procedure

### Quick rollback (revert to previous image)

```bash
# Stop current services
docker compose -f docker-compose.prod.yml down

# Deploy previous version (tag your images!)
docker compose -f docker-compose.prod.yml up -d
```

### Database rollback

```bash
# List migrations
pnpm --filter @aura/db exec -- npx prisma migrate status

# Revert last migration (manual SQL may be needed)
# Always test rollback SQL in staging first
```

## Monitoring

- **Health:** `GET /health` — returns database and Redis status
- **Metrics:** `GET /metrics` — Prometheus-compatible metrics
  - `http_requests_total` — request count by method/route/status
  - `http_request_duration_seconds` — request latency histogram
- **Logs:** Structured JSON via pino (stdout)

## Architecture Overview

```
┌─────────┐     ┌─────────┐     ┌──────────┐
│  Web     │────▶│  API    │────▶│ Postgres │
│ (Next.js)│     │(Fastify)│     │   15     │
└─────────┘     └────┬────┘     └──────────┘
                     │
                ┌────┴────┐     ┌──────────┐
                │  Redis  │     │  BullMQ  │
                │   7     │◀────│ Workers  │
                └─────────┘     └──────────┘
                                     │
                              ┌──────┴──────┐
                              │   Twilio    │
                              │ ElevenLabs  │
                              │   Claude    │
                              │   Stripe    │
                              └─────────────┘
```

## Key Ports

| Service    | Port |
| ---------- | ---- |
| Web        | 3000 |
| API        | 3001 |
| PostgreSQL | 5432 |
| Redis      | 6379 |
