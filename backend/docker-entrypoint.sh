#!/bin/sh
set -e

echo "==> E-Ticket Backend: Checking environment and database..."

# Wait for PostgreSQL to be ready if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "==> Applying Prisma schema to database..."
  npx prisma db push --skip-generate || echo "Warning: prisma db push failed or database not ready yet."
fi

# Optional seed if SEED_DATABASE is true
if [ "$SEED_DATABASE" = "true" ]; then
  echo "==> Seeding database..."
  node -e "require('./dist/prisma/seed.js')" 2>/dev/null || npx ts-node prisma/seed.ts 2>/dev/null || echo "Seed skipped."
fi

echo "==> Starting NestJS application: $@"
exec "$@"
