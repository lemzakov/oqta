# Database Migration Guide

## Will a deploy change my database structure or delete my data?

**No.** Deploys use `prisma migrate deploy`, which only ever *adds* new tables and
columns defined in migration files.  It **never**:

- Drops tables or columns you added manually
- Modifies data in existing rows
- Changes types or constraints of existing columns

Your manually added fields and tables survive every deploy unchanged.

---

## How it works

The application manages the database with **versioned migration files** stored in
`prisma/migrations/`.  On each deploy:

1. `scripts/smart-migrate.sh` (or `scripts/vercel-migrate.sh` on Vercel) runs.
2. It checks the `_prisma_migrations` table to see which migrations have already
   been applied.
3. Only **new, not-yet-applied** migration files are executed.
4. The SQL in each migration file uses `CREATE TABLE IF NOT EXISTS` and
   `ALTER TABLE … ADD COLUMN IF NOT EXISTS` so it is safe to run multiple times.

Because `prisma migrate deploy` only runs the exact SQL you wrote in your migration
files, anything in the database that is *not* mentioned in a migration is left
completely alone.

---

## First deploy against an existing database (automatic baselining)

If your database was previously set up with `prisma db push` (or by hand), it will
not yet have the `_prisma_migrations` tracking table.  `smart-migrate.sh` detects
this and performs a **one-time baseline**:

1. It marks every existing migration file as "already applied" (without re-running
   any SQL).
2. Then it calls `prisma migrate deploy`, which now only runs migrations that are
   genuinely new.

This means the first deploy after switching to migration-based deployments is also
safe for existing data.

---

## Adding schema changes

To add a new table or column to the application schema:

```bash
# 1. Edit prisma/schema.prisma with your changes
# 2. Generate a new migration file
npx prisma migrate dev --name describe_your_change

# 3. Commit the generated file in prisma/migrations/
# 4. Push – the migration runs automatically on next deploy
```

The new migration file will use `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`
so it is safe to apply to any environment.

---

## Migration scripts

| Script | When it runs | What it does |
|---|---|---|
| `scripts/smart-migrate.sh` | `npm start` (traditional hosting) | Baselines if needed, then runs `prisma migrate deploy` |
| `scripts/vercel-migrate.sh` | `npm run vercel-build` (Vercel) | Delegates to `smart-migrate.sh` |

---

## What gets created on a fresh database

If the database is empty, migrations create:

| Table | Purpose |
|---|---|
| `admin_users` | Admin authentication |
| `sessions` | Conversation sessions |
| `n8n_chat_histories` | Chat messages |
| `settings` | Application settings |
| `customers` | CRM customer records |
| `customer_sessions` | Links customers to sessions |
| `invoices` | Invoice tracking |
| `free_zone_integrations` | Free-zone API integrations |
| `conversation_summaries` | AI-generated conversation summaries |

---

## Verifying the database after deployment

```bash
# Basic health check
curl https://your-app.com/api/health

# Detailed database status
curl https://your-app.com/api/db-check
```

---

## Environment variables

| Variable | Used by |
|---|---|
| `POSTGRES_PRISMA_URL` | Vercel Postgres (set automatically by Vercel) |
| `DATABASE_URL` | All other hosting providers |

---

## Best practices

1. ✅ **Use migration files for schema changes** – never alter the Prisma schema
   without generating a migration.
2. ✅ **Commit migration files to Git** – they are the source of truth for your schema.
3. ✅ **Back up before major migrations** – good practice even though deploys are safe.
4. ✅ **Manually added tables are preserved** – `migrate deploy` only touches what
   is in a migration file.
