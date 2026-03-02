#!/bin/bash

# Vercel migration script
# This script runs database migrations using Vercel Postgres environment variables
# Handles P3005 error (database schema not empty) gracefully

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }

log "=== Vercel build: migration + Prisma generate ==="
log "Node version: $(node --version 2>/dev/null || echo 'unknown')"
log "npm  version: $(npm --version 2>/dev/null || echo 'unknown')"
log "Working dir : $(pwd)"

# ── Environment variable check ─────────────────────────────────────────────
log "--- Checking environment variables ---"
log "DATABASE_URL        : ${DATABASE_URL:+set (hidden)}${DATABASE_URL:-NOT SET}"
log "POSTGRES_PRISMA_URL : ${POSTGRES_PRISMA_URL:+set (hidden)}${POSTGRES_PRISMA_URL:-NOT SET}"
log "NODE_ENV            : ${NODE_ENV:-NOT SET}"

if [ -z "$POSTGRES_PRISMA_URL" ] && [ -z "$DATABASE_URL" ]; then
  log "❌ FATAL: No database URL found."
  log "   Set either POSTGRES_PRISMA_URL (Vercel Postgres) or DATABASE_URL."
  exit 1
fi

if [ -n "$POSTGRES_PRISMA_URL" ]; then
  log "✅ Using Vercel Postgres (POSTGRES_PRISMA_URL)"
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
else
  log "✅ Using custom DATABASE_URL"
fi

# ── Prisma generate ─────────────────────────────────────────────────────────
log "--- Generating Prisma Client ---"
npx prisma generate 2>&1
GENERATE_EXIT=${PIPESTATUS[0]}
if [ $GENERATE_EXIT -ne 0 ]; then
  log "❌ prisma generate failed (exit $GENERATE_EXIT). Check schema.prisma for syntax errors."
  exit $GENERATE_EXIT
fi
log "✅ Prisma Client generated successfully"

# ── Schema validation ────────────────────────────────────────────────────────
log "--- Validating Prisma schema ---"
npx prisma validate 2>&1
VALIDATE_EXIT=${PIPESTATUS[0]}
if [ $VALIDATE_EXIT -ne 0 ]; then
  log "❌ Prisma schema validation failed (exit $VALIDATE_EXIT)."
  exit $VALIDATE_EXIT
fi
log "✅ Prisma schema is valid"

# ── Database migration ───────────────────────────────────────────────────────
log "--- Running Prisma db push ---"
npx prisma db push --skip-generate --accept-data-loss 2>&1 | tee /tmp/prisma-output.txt
PUSH_EXIT=${PIPESTATUS[0]}

log "--- Prisma db push output summary ---"
if grep -q "P3005" /tmp/prisma-output.txt; then
  log "✅ P3005: Database schema is not empty — using existing schema (this is OK)"
  exit 0
fi

if grep -q "already exists" /tmp/prisma-output.txt || grep -q "is not empty" /tmp/prisma-output.txt; then
  log "✅ Database already has tables — using existing schema (this is OK)"
  exit 0
fi

if grep -q "error" /tmp/prisma-output.txt || grep -q "Error" /tmp/prisma-output.txt; then
  log "⚠️  Prisma db push reported errors (see output above). Exit code: $PUSH_EXIT"
  log "   The deployment will continue, but check the database state."
fi

if [ $PUSH_EXIT -eq 0 ]; then
  log "✅ Database schema applied successfully"
else
  log "⚠️  prisma db push exited with code $PUSH_EXIT — continuing anyway"
fi

log "=== Migration step complete ==="
exit 0
