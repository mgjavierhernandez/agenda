#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Seeding database (idempotent)..."
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts 2>&1 || echo "[entrypoint] Seed skipped or already applied"

echo "[entrypoint] Starting API..."
exec node dist/main.js
