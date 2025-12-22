# Vercel + Vercel Postgres - Complete Setup Guide

## ✅ This Configuration is Optimized for Vercel

The application is now fully configured to work with **Vercel** and **Vercel Postgres** using Vercel's Project Settings (not the deprecated `builds` config).

## Quick Deployment Steps

### 1. Deploy to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Click "Deploy" (don't configure anything yet)

### 2. Add Vercel Postgres Database

1. Go to your project dashboard on Vercel
2. Click on "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Click "Continue"
6. Name your database (e.g., "oqta-db")
7. Select a region (choose one close to your users)
8. Click "Create"

**✅ Vercel automatically sets these environment variables:**
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` ← **This is what we use**
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### 3. Set Additional Environment Variables

Go to Project Settings → Environment Variables and add:

```env
# Admin Credentials
ADMIN_EMAIL=admin@oqta.ai
ADMIN_PASSWORD=YourSecurePassword123

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your-random-secret-key-at-least-32-characters-long

# AI Configuration
AI_TOKENS_PER_MESSAGE=2315

# Qdrant Configuration
QDRANT_URL=https://b8d81ce7-04a7-433a-babc-1f8951f2ec8e.europe-west3-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key-here
QDRANT_COLLECTION=oqta

# Environment
NODE_ENV=production
```

**Important:** 
- ✅ Do NOT set `DATABASE_URL` - Vercel Postgres automatically provides `POSTGRES_PRISMA_URL`
- ✅ The app will use `POSTGRES_PRISMA_URL` if available, otherwise `DATABASE_URL`

### 4. Redeploy

After adding environment variables:
1. Go to "Deployments" tab
2. Click the three dots (...) on the latest deployment
3. Click "Redeploy"

Or push a new commit to trigger automatic deployment.

### 5. Verify Deployment

Once deployed, test these endpoints:

#### Health Check
```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-22T07:00:00.000Z",
  "environment": "production",
  "database": "connected",
  "api": "ok",
  "admin": "ok"
}
```

#### Database Check
```bash
curl https://your-app.vercel.app/api/db-check
```

Expected response if tables exist:
```json
{
  "success": true,
  "connected": true,
  "tablesExist": true,
  "counts": {
    "admins": 0,
    "sessions": 0,
    "settings": 0
  },
  "message": "Database is ready"
}
```

Expected response if tables don't exist:
```json
{
  "success": true,
  "connected": true,
  "tablesExist": false,
  "message": "Database connected but tables may not exist. Run: npx prisma migrate deploy"
}
```

### 6. Run Migrations (If Needed)

If `/api/db-check` shows `tablesExist: false`, you need to run migrations.

#### Option A: From Your Local Machine

```bash
# Set the database URL from Vercel
export POSTGRES_PRISMA_URL="your-vercel-postgres-url"

# Or use the direct connection
export POSTGRES_URL_NON_POOLING="your-direct-url"

# Run migrations
npx prisma migrate deploy
```

To get the URLs:
1. Go to Vercel dashboard → Storage → Your Postgres DB
2. Click on ".env.local" tab
3. Copy the connection strings

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Pull environment variables
vercel env pull

# Run migrations
npx prisma migrate deploy
```

## How It Works

### Build Process

When you deploy to Vercel:

1. **Install** - `npm install`
   - Runs `postinstall` → generates Prisma client

2. **Build** - `npm run vercel-build`
   - Runs `scripts/vercel-migrate.sh` → applies database migrations
   - Compiles TypeScript → creates `dist/` folder

3. **Deploy**
   - Static files (HTML, CSS, JS, images) → Served by Vercel CDN
   - API routes (`/api/*`) → Handled by `api/index.js` serverless function

### File Structure on Vercel

```
Root Directory:
├── admin/              → /admin/* (static files)
├── assets/             → /assets/* (images, fonts)
├── index.html          → / (homepage)
├── script.js           → /script.js
├── styles.css          → /styles.css
├── api/
│   └── index.js        → /api/* (serverless function)
└── dist/               → Compiled TypeScript (used by api/index.js)
```

### Environment Variables Used

The app checks for these in order:

1. **For Database**:
   - `POSTGRES_PRISMA_URL` (Vercel Postgres - preferred)
   - `DATABASE_URL` (fallback for other providers)

2. **For Migrations**:
   - `POSTGRES_URL_NON_POOLING` (direct connection for migrations)
   - `POSTGRES_PRISMA_URL` (pooled connection)

## Vercel Configuration (vercel.json)

The new `vercel.json` uses **rewrites** instead of deprecated **builds**:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api"
    }
  ],
  "headers": [...]
}
```

This allows Vercel's Project Settings to work properly.

## Troubleshooting

### Issue: "No database URL found"

**Problem**: Neither `POSTGRES_PRISMA_URL` nor `DATABASE_URL` is set.

**Solution**:
1. Verify Vercel Postgres is attached to your project
2. Check Environment Variables in Vercel Project Settings
3. Redeploy after adding the database

### Issue: "Database connected but tables don't exist"

**Problem**: Database is accessible but migrations haven't run.

**Solution**:
Run migrations using Option A or B above.

### Issue: `/api/health` shows `database: "disconnected"`

**Problem**: Cannot connect to database.

**Solutions**:
1. Check `POSTGRES_PRISMA_URL` is set in Vercel environment variables
2. Verify Vercel Postgres is in the same region as your deployment
3. Check Vercel Postgres dashboard for any issues
4. Try redeploying

### Issue: `/api/auth/verify` returns 401

**Problem**: Authentication not working.

**Solutions**:
1. Verify `JWT_SECRET` is set in environment variables
2. Check that cookies are enabled in your browser
3. Make sure you're logged in (visit `/admin` and login first)
4. Check browser console for CORS errors

### Issue: Admin panel shows blank page

**Problem**: Static files not loading.

**Solutions**:
1. Check `/admin/index.html` is accessible
2. Verify assets are loading (check browser Network tab)
3. Check Vercel deployment logs for build errors
4. Try clearing browser cache

## Verification Checklist

After deployment, verify:

- [ ] Health check works: `https://your-app.vercel.app/api/health`
- [ ] Database check works: `https://your-app.vercel.app/api/db-check`
- [ ] Database shows `"connected": true`
- [ ] Tables exist: `"tablesExist": true`
- [ ] Frontend loads: `https://your-app.vercel.app/`
- [ ] Admin panel loads: `https://your-app.vercel.app/admin`
- [ ] Assets load: `https://your-app.vercel.app/assets/oqta_logo.svg`
- [ ] Can login to admin panel
- [ ] Dashboard shows metrics

## Monitoring

### Vercel Dashboard

Monitor your deployment:
1. **Deployments**: See build logs and deployment status
2. **Analytics**: View traffic and performance
3. **Logs**: Check runtime logs for errors
4. **Metrics**: Monitor function invocations and duration

### Database Monitoring

Monitor Vercel Postgres:
1. Go to Storage → Your Database
2. View connection count, query performance
3. Check storage usage

## Costs

### Vercel Pricing

**Hobby (Free)**:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Serverless function executions: unlimited
- ⚠️ Function timeout: 10 seconds

**Pro ($20/month)**:
- ✅ 1TB bandwidth/month
- ✅ Function timeout: 60 seconds
- ✅ Team collaboration

### Vercel Postgres Pricing

**Starter**:
- ❌ Not available on free tier
- 💰 $20/month
- ✅ 256MB storage
- ✅ 60 hours compute/month

**Pro**:
- 💰 $90/month
- ✅ 2GB storage
- ✅ 480 hours compute/month

## Alternative: Free Tier Setup

To use 100% free tier:

1. **Vercel Free Tier** for hosting
2. **Neon Free Tier** for PostgreSQL:
   - Go to https://neon.tech
   - Create free account
   - Create database
   - Copy connection string
   - Add to Vercel as `DATABASE_URL`

This gives you:
- $0/month
- 0.5GB database storage
- Serverless architecture

## Best Practices

1. **Use Connection Pooling**: 
   - Vercel Postgres automatically provides pooled connections via `POSTGRES_PRISMA_URL`
   - Always use pooled connections in serverless functions

2. **Monitor Function Duration**:
   - Free tier has 10s timeout
   - Optimize slow database queries
   - Add database indexes if needed

3. **Set Up Error Alerts**:
   - Configure Vercel alerts for failed deployments
   - Monitor function errors in logs

4. **Regular Backups**:
   - Vercel Postgres has automatic backups
   - Consider exporting data periodically

5. **Environment Variables**:
   - Never commit secrets to Git
   - Use Vercel's encrypted environment variables
   - Different values for preview vs production

## Getting Help

If you encounter issues:

1. Check `/api/health` endpoint
2. Check `/api/db-check` endpoint
3. Review Vercel function logs
4. Check Vercel Postgres metrics
5. Verify all environment variables are set

## Example: Full Deployment

```bash
# 1. Deploy to Vercel
vercel

# 2. Add Vercel Postgres via dashboard

# 3. Set environment variables via dashboard

# 4. Pull environment variables locally
vercel env pull

# 5. Run migrations
npx prisma migrate deploy

# 6. Verify
curl https://your-app.vercel.app/api/health
curl https://your-app.vercel.app/api/db-check

# 7. Visit your app
open https://your-app.vercel.app
open https://your-app.vercel.app/admin
```

---

**Last Updated**: December 22, 2024
**Status**: ✅ Fully Compatible with Vercel + Vercel Postgres
**Build Configuration**: Uses Vercel Project Settings (not deprecated builds config)
