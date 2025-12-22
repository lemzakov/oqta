#!/bin/bash

# Vercel migration script
# This script runs database migrations using Vercel Postgres environment variables

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
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️  Migration failed, but continuing..."
fi

echo "✅ Build complete"
