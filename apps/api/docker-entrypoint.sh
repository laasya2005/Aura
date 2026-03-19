#!/bin/sh
set -e

# Run database migrations on deploy (set RUN_MIGRATIONS=true in Railway)
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma
  echo "Migrations complete."
fi

exec "$@"
