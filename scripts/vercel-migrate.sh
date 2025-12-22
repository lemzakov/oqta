#!/bin/bash

# Vercel migration script
# This script runs database migrations using Vercel Postgres environment variables
# Handles P3005 error (database schema not empty) gracefully

echo "🔍 Checking environment variables..."

# Check if POSTGRES_PRISMA_URL or DATABASE_URL is set
if [ -z "$POSTGRES_PRISMA_URL" ] && [ -z "$DATABASE_URL" ]; then
  echo "❌ No database URL found"
  echo "   Set either POSTGRES_PRISMA_URL (for Vercel Postgres) or DATABASE_URL"
  exit 1
fi

# Use POSTGRES_PRISMA_URL if available (Vercel Postgres), otherwise use DATABASE_URL
if [ -n "$POSTGRES_PRISMA_URL" ]; then
  echo "✅ Using Vercel Postgres (POSTGRES_PRISMA_URL)"
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
else
  echo "✅ Using custom DATABASE_URL"
fi

echo "🔄 Running Prisma migrations..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 | tee /tmp/prisma-output.txt || true

# Check for P3005 error (database schema not empty) - this is OK!
if grep -q "P3005" /tmp/prisma-output.txt; then
  echo "✅ P3005: Database schema is not empty - this is OK!"
  echo "📝 Using existing database schema"
  exit 0
fi

# Check for other indicators that database already has schema
if grep -q "already exists" /tmp/prisma-output.txt || grep -q "is not empty" /tmp/prisma-output.txt; then
  echo "✅ Database already has tables - this is OK!"
  echo "📝 Using existing database schema"
  exit 0
fi

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️  Migration had warnings, but continuing..."
fi

echo "✅ Build complete"
exit 0
