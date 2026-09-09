#!/bin/sh
set -e

echo "Learnix backend starting..."

# Run Prisma migrations in production
if [ "$NODE_ENV" = "production" ]; then
  echo "Running Prisma migrate deploy..."
  npx prisma migrate deploy --schema prisma/schema
else
  echo "Running Prisma db push (dev mode)..."
  npx prisma db push --schema prisma/schema --skip-generate
fi

# Run seed if DATABASE_SEED=true
if [ "$DATABASE_SEED" = "true" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts || true
  npx tsx prisma/seed-realistic.ts || true
fi

echo "Starting server on port ${PORT:-4000}..."
exec node dist/server.js
