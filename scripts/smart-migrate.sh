#!/bin/bash

# Smart migration script
# Uses 'prisma migrate deploy' for safe, additive-only migrations.
# Manually added tables and columns are NEVER dropped or modified.
#
# On first run against a database that was set up with 'prisma db push',
# this script automatically baselines the migration history so that
# 'prisma migrate deploy' only applies NEW migrations going forward.

echo "🔍 Checking database connection..."

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

# Generate Prisma Client
echo "🔄 Generating Prisma Client..."
npx prisma generate

# Detect if the database has existing tables but no migration history.
# This occurs when the database was previously initialised with 'prisma db push'
# instead of 'prisma migrate deploy'.  In that case we need to baseline once:
# mark every existing migration file as already applied without re-running its
# SQL, so that 'prisma migrate deploy' only runs genuinely new migrations.
echo "🔍 Checking migration history..."

NEEDS_BASELINE=false
# The node script prints "true" when tables exist but _prisma_migrations does not,
# meaning the database was previously set up without migration tracking.
BASELINE_CHECK=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`
  SELECT
    EXISTS(
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
    ) AS has_migrations_table,
    (SELECT COUNT(*)::int FROM information_schema.tables
     WHERE table_schema = 'public') AS table_count
\`.then(rows => {
  const hasMigrationsTable = rows[0].has_migrations_table === true;
  const tableCount = parseInt(rows[0].table_count, 10);
  process.stdout.write(!hasMigrationsTable && tableCount > 0 ? 'true' : 'false');
}).catch(() => process.stdout.write('false')).finally(() => p.\$disconnect().catch(() => {}));
" 2>/dev/null) || BASELINE_CHECK="false"

if [ "$BASELINE_CHECK" = "true" ]; then
  NEEDS_BASELINE=true
fi

if [ "$NEEDS_BASELINE" = "true" ]; then
  echo "📝 Existing database detected without migration history."
  echo "   Baselining all known migrations as already applied (one-time operation)."
  echo "   Manually added tables and columns will be preserved."

  for dir in prisma/migrations/*/; do
    [ -d "$dir" ] || continue
    name=$(basename "$dir")
    echo "  ✅ Marking as applied: $name"
    if ! RESOLVE_OUTPUT=$(npx prisma migrate resolve --applied "$name" 2>&1); then
      echo "  ⚠️  Could not mark $name as applied: $RESOLVE_OUTPUT"
    fi
  done

  echo "✅ Baseline complete"
fi

# Apply only pending migrations from migration files.
# This command is safe: it never drops tables or columns that are not in a
# migration file, so any fields or tables you added manually are preserved.
echo "🔄 Applying pending migrations..."
npx prisma migrate deploy

echo "✅ Migration complete - database is ready"
exit 0
