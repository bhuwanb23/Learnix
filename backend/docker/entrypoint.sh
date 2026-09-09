#!/bin/sh
set -e

echo "Learnix backend starting..."

# SQLite schema sync (idempotent, safe on every boot)
echo "Syncing database schema (prisma db push)..."
npx prisma db push --schema prisma/schema --skip-generate

# Run seed if DATABASE_SEED=true (seeds are idempotent)
if [ "$DATABASE_SEED" = "true" ]; then
  echo "Seeding database (existing data is preserved)..."
  npx tsx prisma/seed.ts || true
  npx tsx prisma/seed-realistic.ts || true
fi

echo "Starting server on port ${PORT:-4000}..."
# tsc emits to dist/src (rootDir is the project root)
exec node dist/src/server.js
