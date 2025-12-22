# Database Migration Guide

## Handling Existing Production Database

This application is designed to work with **existing production databases** that may already have tables, including the `n8n_chat_histories` table.

### P3005 Error - Database Schema Not Empty

**This error is COMPLETELY NORMAL and OK!**

When deploying to a database that already has tables, you may see:

```
Error: P3005

The database schema is not empty. Read more about how to baseline an existing production database: https://pris.ly/d/migrate-baseline
```

✅ **This is expected and handled automatically!**

The migration scripts detect this error and continue successfully, using your existing database schema.

### Existing `n8n_chat_histories` Table

If your database already has the `n8n_chat_histories` table, the application will:

1. ✅ **Use the existing table** - No changes required
2. ✅ **Auto-detect the schema** - Works with existing structure
3. ✅ **Continue deployment** - No errors or failures

### Expected Schema for `n8n_chat_histories`

The application expects this structure (compatible with existing n8n installations):

```sql
CREATE TABLE n8n_chat_histories (
    id SERIAL PRIMARY KEY,              -- Auto-incrementing integer
    session_id VARCHAR(255) NOT NULL,   -- Session identifier
    message JSONB NOT NULL,             -- Message content and metadata
    created_at TIMESTAMP DEFAULT NOW()  -- Message timestamp
);
```

The `message` JSONB field stores:
```json
{
  "type": "user|ai|system",
  "content": "Message text",
  "tool_calls": [],
  "additional_kwargs": {},
  "response_metadata": {},
  "invalid_tool_calls": []
}
```

### Migration Scripts

**For Traditional Hosting (Railway, Render, VPS):**
```bash
npm run migrate:deploy
```

Uses `scripts/smart-migrate.sh` which:
- Checks for existing tables
- Only creates missing tables
- Handles P3005 error gracefully
- Uses `prisma db push` instead of migrations

**For Vercel:**
```bash
npm run vercel-build
```

Uses `scripts/vercel-migrate.sh` which:
- Detects Vercel Postgres environment variables
- Handles P3005 error gracefully
- Continues deployment successfully
- Never fails on existing schema

### What Gets Created

If tables don't exist, these will be created:

1. **admin_users** - Admin authentication
   - Used by: Admin panel login

2. **sessions** - User conversation sessions
   - Used by: Tracking conversations
   - Links to: `n8n_chat_histories` via `session_id`

3. **settings** - Application settings
   - Used by: Settings page
   - Stores: WhatsApp number, phone number, n8n URL

4. **invoices** - Invoice tracking
   - Used by: Dashboard metrics
   - Shows: Amount invoiced, paid, deals in progress

5. **n8n_chat_histories** - Chat messages
   - **Only created if it doesn't already exist**
   - If exists: Uses your existing table and data

### Verifying Database After Deployment

**Check health endpoint:**
```bash
curl https://your-app.com/api/health
```

Response should show:
```json
{
  "status": "ok",
  "database": "connected",
  "api": "ok",
  "admin": "ok"
}
```

**Check database detailed status:**
```bash
curl https://your-app.com/api/db-check
```

Response will show:
```json
{
  "success": true,
  "connected": true,
  "tablesExist": true,
  "counts": {
    "admins": 0,
    "sessions": 5,
    "settings": 3
  },
  "message": "Database is ready"
}
```

### Troubleshooting

**Problem: P3005 error during deployment**
✅ **Solution: This is normal!** The scripts handle this automatically.

**Problem: Migration fails**
✅ **Solution: Check logs** - If P3005 is mentioned, it's OK and handled.

**Problem: Existing data not showing**
✅ **Solution: Check session_id** - Ensure `session_id` in `n8n_chat_histories` matches sessions in `sessions` table.

### Manual Database Baseline (Optional)

If you want to create a migration baseline for your existing database:

```bash
# Only if you want to manage migrations manually
npx prisma migrate dev --name init
```

**Not recommended** - The automatic `db push` approach is better for existing databases.

### Best Practices

1. ✅ **Don't delete existing data** - The app preserves everything
2. ✅ **Let scripts handle P3005** - Don't try to fix it manually
3. ✅ **Use existing tables** - No need to migrate data
4. ✅ **Check health endpoints** - Verify everything works after deployment
5. ✅ **Backup before deployment** - Always have a backup of production data

### Environment Variables

Required for database connection:

**Vercel Postgres:**
- `POSTGRES_PRISMA_URL` - Auto-set by Vercel
- `POSTGRES_URL_NON_POOLING` - Auto-set by Vercel

**Other Providers:**
- `DATABASE_URL` - PostgreSQL connection string

Example:
```env
# Vercel Postgres (auto-set)
POSTGRES_PRISMA_URL=postgres://user:pass@host/db

# Or custom PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/oqta
```

### Summary

✅ **P3005 error is OK** - Scripts handle it automatically
✅ **Existing tables preserved** - No data loss
✅ **Auto-detection** - Works with your existing schema
✅ **Zero downtime** - Deployment continues successfully
✅ **Health checks** - Verify everything works

The application is designed to work seamlessly with existing production databases!
