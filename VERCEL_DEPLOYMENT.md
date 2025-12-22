# Vercel Deployment Guide

## Overview

This application is now fully compatible with Vercel! The serverless architecture allows you to deploy both the frontend and backend API on Vercel's platform.

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. PostgreSQL database (use Vercel Postgres or external provider like Neon, Supabase, or PlanetScale)

## Step-by-Step Deployment

### 1. Set Up PostgreSQL Database

#### Option A: Vercel Postgres (Recommended)

1. Go to your Vercel dashboard
2. Navigate to "Storage" tab
3. Click "Create Database" → "Postgres"
4. Name your database (e.g., "oqta-db")
5. Select a region close to your users
6. Click "Create"

Vercel will automatically set the `POSTGRES_*` environment variables. You'll use these to construct `DATABASE_URL`.

#### Option B: External PostgreSQL (Neon, Supabase, PlanetScale)

**Neon (Recommended for free tier):**
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string

**Supabase:**
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (use "Transaction" mode)

**PlanetScale:**
1. Go to https://planetscale.com
2. Create a new database
3. Copy the connection string

### 2. Deploy to Vercel

#### Using Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel will auto-detect the project settings
4. Click "Deploy"

#### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd /path/to/oqta
vercel
```

### 3. Configure Environment Variables

In your Vercel project dashboard, go to "Settings" → "Environment Variables" and add:

#### Required Variables:

```env
# Database (use your actual database connection string)
DATABASE_URL=******your-db-host:5432/oqta?sslmode=require

# Admin Credentials
ADMIN_EMAIL=admin@oqta.ai
ADMIN_PASSWORD=YourSecurePassword123

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your-random-secret-key-at-least-32-characters

# AI Configuration
AI_TOKENS_PER_MESSAGE=2315

# Qdrant Configuration
QDRANT_URL=https://b8d81ce7-04a7-433a-babc-1f8951f2ec8e.europe-west3-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=******
QDRANT_COLLECTION=oqta

# Environment
NODE_ENV=production
```

#### For Vercel Postgres:

If using Vercel Postgres, construct your `DATABASE_URL` from the auto-generated variables:

```env
DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}/${POSTGRES_DATABASE}?sslmode=require
```

Or use the direct connection string from Vercel Postgres dashboard.

### 4. Run Database Migrations

After deploying, you need to run migrations to create the database tables.

#### Option A: Using Vercel CLI

```bash
# Set environment variables locally for migration
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy
```

#### Option B: Add Migration Command to Build

The migrations will run automatically on deployment through the build process.

Alternatively, you can run migrations via Vercel's "Build & Development Settings":

1. Go to Project Settings → "General"
2. Add to "Install Command": `npm install && npx prisma migrate deploy`

### 5. Verify Deployment

Once deployed, verify everything works:

1. **Frontend**: `https://your-app.vercel.app/`
2. **Health Check**: `https://your-app.vercel.app/api/health`
3. **Admin Panel**: `https://your-app.vercel.app/admin`
4. **Assets**: `https://your-app.vercel.app/assets/oqta_logo.svg`

#### Health Check Response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-22T06:48:00.000Z",
  "environment": "production",
  "database": "connected",
  "api": "ok",
  "admin": "ok"
}
```

### 6. Custom Domain (Optional)

1. Go to Project Settings → "Domains"
2. Add your custom domain
3. Configure DNS according to Vercel's instructions
4. Add your domain to CORS allowed origins if needed

## Troubleshooting

### Issue: `/api/auth/verify` Returns 401

**Problem**: CORS or authentication token not being passed correctly.

**Solutions**:

1. **Check CORS Configuration**: Ensure your frontend origin is allowed
2. **Check Cookie Settings**: Cookies might not work across domains
3. **Use Authorization Header**: Instead of cookies, send token in header:
   ```javascript
   fetch('/api/auth/verify', {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   })
   ```

### Issue: Database Connection Failed

**Problem**: `DATABASE_URL` not set or incorrect.

**Solutions**:

1. Verify `DATABASE_URL` in environment variables
2. Ensure SSL mode is enabled: `?sslmode=require`
3. Check database is accessible from Vercel's IP addresses
4. For Neon/Supabase: Use the "pooled" or "direct" connection string

### Issue: Prisma Client Not Generated

**Problem**: Build fails with "Cannot find module '@prisma/client'"

**Solutions**:

1. Ensure `postinstall` script runs: `"postinstall": "prisma generate"`
2. Check build logs for Prisma generation errors
3. Manually trigger: Add to vercel.json:
   ```json
   {
     "buildCommand": "npm run vercel-build"
   }
   ```

### Issue: Assets Not Loading

**Problem**: Images/CSS not found.

**Solutions**:

1. Check `vercel.json` routes configuration
2. Ensure static files are in the root directory
3. Verify file paths in HTML/CSS (use absolute paths: `/assets/...`)

### Issue: Function Timeout

**Problem**: Serverless function times out (10s limit on free tier).

**Solutions**:

1. Optimize database queries
2. Add indexes to frequently queried columns
3. Upgrade to Vercel Pro for 60s timeout
4. Use connection pooling (Prisma Data Proxy or PgBouncer)

## Environment-Specific Configuration

### Development vs Production

The app automatically detects the environment:

- **Development**: Uses `NODE_ENV=development`, allows all CORS origins
- **Production**: Uses `NODE_ENV=production`, restricts CORS to specific origins

### Database Connection Pooling

For production on Vercel, consider using connection pooling:

#### Using Prisma Data Proxy:

1. Enable Prisma Data Proxy in Prisma Cloud
2. Update `DATABASE_URL` to use Data Proxy connection string
3. Prevents connection limits in serverless environment

#### Using PgBouncer:

1. Set up PgBouncer (available in Neon, Supabase)
2. Use pooled connection string
3. Update `schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     directUrl = env("DIRECT_URL") // for migrations
   }
   ```

## Architecture on Vercel

### How It Works:

1. **Frontend**: Served as static files from root directory
2. **API Routes**: Handled by serverless function at `/api/index.js`
3. **Database**: External PostgreSQL (Vercel Postgres or third-party)
4. **Static Assets**: Served directly by Vercel CDN

### File Structure:

```
Root Directory (Deployed to Vercel):
├── admin/              → /admin/*
├── assets/             → /assets/*
├── index.html          → /
├── script.js           → /script.js
├── styles.css          → /styles.css
└── api/
    └── index.js        → /api/* (serverless function)
```

### Build Process on Vercel:

1. `npm install` → Installs dependencies, generates Prisma client
2. `npm run vercel-build` → Compiles TypeScript to JavaScript
3. Static files served from root
4. API routes handled by `api/index.js` serverless function

## Cost Considerations

### Vercel Free Tier Limits:

- ✅ 100GB bandwidth/month
- ✅ Serverless function invocations: unlimited
- ✅ Function execution: 100GB-hours
- ⚠️ Function timeout: 10 seconds
- ⚠️ Concurrent executions: 100

### Vercel Pro ($20/month):

- ✅ 1TB bandwidth/month
- ✅ Function timeout: 60 seconds
- ✅ Concurrent executions: 1000
- ✅ Custom domains: unlimited

### Database Costs:

- **Vercel Postgres**: Starts at $20/month
- **Neon**: Free tier available (0.5GB storage)
- **Supabase**: Free tier available (500MB storage)
- **PlanetScale**: Free tier available (5GB storage)

## Migration from Railway/Render

If you're migrating from Railway or Render:

1. **Export database**: `pg_dump` your current database
2. **Import to new database**: `psql` to new Vercel Postgres
3. **Update environment variables** in Vercel
4. **Deploy** to Vercel
5. **Test** all endpoints
6. **Update DNS** to point to Vercel

## Best Practices

1. **Use Environment Variables**: Never hardcode secrets
2. **Enable Connection Pooling**: Prevents database connection limits
3. **Monitor Function Logs**: Check Vercel dashboard for errors
4. **Set Up Alerts**: Configure Vercel alerts for downtime
5. **Use Preview Deployments**: Test changes before production
6. **Regular Backups**: Back up your database regularly

## Support

If you encounter issues:

1. Check Vercel function logs in dashboard
2. Test health endpoint: `/api/health`
3. Verify environment variables are set
4. Check database connectivity
5. Review Vercel documentation: https://vercel.com/docs

## Example Deployment Commands

```bash
# Development
npm run dev

# Build locally
npm run build

# Build for Vercel
npm run vercel-build

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# Check deployment logs
vercel logs
```

---

**Last Updated**: December 22, 2024
**Vercel Compatibility**: ✅ Fully Compatible
**Recommended Database**: Neon (free tier) or Vercel Postgres
