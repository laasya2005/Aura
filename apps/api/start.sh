#!/bin/sh
set -e

echo "[aura-api] Running database migrations..."
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma

echo "[aura-api] Starting server..."
exec node apps/api/dist/server.js
