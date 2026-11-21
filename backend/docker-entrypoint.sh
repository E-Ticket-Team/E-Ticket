#!/bin/sh
set -e

echo "==> E-Ticket Backend: Checking environment and database..."

if [ -n "$DATABASE_URL" ]; then
  if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
    echo "==> Applying Prisma migrations..."
    npx prisma migrate deploy
  else
    echo "==> Pushing Prisma schema to database..."
    npx prisma db push --skip-generate
  fi
fi

if [ "$SEED_DATABASE" = "true" ]; then
  echo "==> Seeding database..."
  node -e "require('./dist/prisma/seed.js')" 2>/dev/null || npx ts-node prisma/seed.ts 2>/dev/null || echo "Seed skipped."
fi

echo "==> Starting NestJS application: $@"
exec "$@"
