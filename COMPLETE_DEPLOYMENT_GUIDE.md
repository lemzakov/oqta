# Complete Deployment Guide - Database, API, and Assets

## What Was Fixed

### 1. Database Automatic Setup ✅
- **Migration files created**: Database tables are now created automatically on deployment
- **Health checks added**: Server checks if database tables exist on startup
- **Auto-migration**: `npm start` runs `prisma migrate deploy` automatically

### 2. API Health Checks ✅
- **Endpoint**: `GET /api/health`
- **Checks**:
  - Database connection status
  - API availability
  - Admin panel availability
- **Response example**:
```json
{
  "status": "ok",
  "timestamp": "2024-12-22T06:38:00.000Z",
  "environment": "production",
  "database": "connected",
  "api": "ok",
  "admin": "ok"
}
```

### 3. Assets Fixed ✅
- **All assets now deployed correctly**:
  - `/assets/oqta_logo.svg` ✅
  - `/assets/bg.jpg` ✅
  - All images, SVGs, and fonts ✅
- **Admin panel assets**:
  - `/admin/index.html` ✅
  - `/admin/css/admin.css` ✅
  - `/admin/js/admin.js` ✅

## Quick Deployment to Railway (Recommended)

Railway automatically handles everything. Just follow these steps:

### Step 1: Create Railway Account
1. Go to https://railway.app/
2. Sign up with GitHub

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `oqta` repository

### Step 3: Add PostgreSQL
1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway automatically sets `DATABASE_URL` environment variable

### Step 4: Set Environment Variables
Click on your web service → "Variables" tab and add:

```env
ADMIN_EMAIL=admin@oqta.ai
ADMIN_PASSWORD=YourSecurePassword123
JWT_SECRET=your-random-secret-key-min-32-chars
AI_TOKENS_PER_MESSAGE=2315
QDRANT_URL=https://b8d81ce7-04a7-433a-babc-1f8951f2ec8e.europe-west3-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOlt7ImNvbGxlY3Rpb24iOiJvcXRhIiwiYWNjZXNzIjoicncifV19.QWXHTz2ZN5EmB_OmUosSI3LXj4vV2V0_B1WGXgTjQ2M
QDRANT_COLLECTION=oqta
NODE_ENV=production
```

### Step 5: Deploy
Railway will automatically:
1. Run `npm install` (generates Prisma client)
2. Run `npm run build` (compiles TypeScript, copies assets)
3. Run `npm start` (runs migrations, starts server)

### Step 6: Verify Deployment
1. Open your Railway URL (e.g., `https://oqta-production.up.railway.app`)
2. Check health: `https://your-app.up.railway.app/api/health`
3. Open admin: `https://your-app.up.railway.app/admin`

Expected health response:
```json
{
  "status": "ok",
  "database": "connected",
  "api": "ok",
  "admin": "ok"
}
```

## Alternative: Render.com Deployment

### Step 1: Create Render Account
1. Go to https://render.com/
2. Sign up with GitHub

### Step 2: Create PostgreSQL Database
1. Click "New +" → "PostgreSQL"
2. Name: `oqta-db`
3. Copy the "Internal Database URL" (starts with `******`)

### Step 3: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `oqta`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Step 4: Add Environment Variables
In the "Environment" tab, add all variables from Step 4 above, plus:
```env
DATABASE_URL=<paste Internal Database URL from Step 2>
```

### Step 5: Deploy
Click "Create Web Service" and wait for deployment.

## Local Development Setup

### Prerequisites
- Node.js v18+
- PostgreSQL installed locally

### Setup Steps

1. **Install PostgreSQL** (if not installed):
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql
sudo service postgresql start

# Windows
# Download from https://www.postgresql.org/download/windows/
```

2. **Create Database**:
```bash
# Connect to PostgreSQL
psql postgres

# In psql:
CREATE DATABASE oqta;
CREATE USER oqtauser WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE oqta TO oqtauser;
\q
```

3. **Clone and Install**:
```bash
git clone <your-repo-url>
cd oqta
npm install
```

4. **Configure Environment**:
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="******localhost:5432/oqta"
ADMIN_EMAIL="admin@oqta.ai"
ADMIN_PASSWORD="YourSecurePassword"
JWT_SECRET="your-random-secret-at-least-32-characters-long"
AI_TOKENS_PER_MESSAGE=2315
QDRANT_URL="https://b8d81ce7-04a7-433a-babc-1f8951f2ec8e.europe-west3-0.gcp.cloud.qdrant.io"
QDRANT_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOlt7ImNvbGxlY3Rpb24iOiJvcXRhIiwiYWNjZXNzIjoicncifV19.QWXHTz2ZN5EmB_OmUosSI3LXj4vV2V0_B1WGXgTjQ2M"
QDRANT_COLLECTION="oqta"
PORT=3000
NODE_ENV="development"
```

5. **Build and Run**:
```bash
npm run build
npm start
```

6. **Access Application**:
- Frontend: http://localhost:3000/
- Admin Panel: http://localhost:3000/admin
- Health Check: http://localhost:3000/api/health

## Troubleshooting

### Database Tables Not Created

**Check if migrations ran**:
```bash
npx prisma migrate status
```

**Manually run migrations**:
```bash
npx prisma migrate deploy
```

**Reset database** (WARNING: deletes all data):
```bash
npx prisma migrate reset
```

### Assets Not Loading

**Check if build completed**:
```bash
npm run build
ls -la public/assets/
ls -la public/admin/
```

**Rebuild**:
```bash
rm -rf public dist
npm run build
```

### Health Check Fails

1. **Check server is running**:
```bash
curl http://localhost:3000/api/health
```

2. **Check database connection**:
```bash
# Try connecting directly
psql $DATABASE_URL
```

3. **Check environment variables**:
```bash
# In your deployment platform, verify all env vars are set
```

### Admin Panel Returns 404

**Verify files exist**:
```bash
ls -la public/admin/index.html
ls -la dist/server.js
```

**Check server logs** for routing issues.

## Verification Checklist

After deployment, verify:

- [ ] Health endpoint responds: `curl https://your-app.com/api/health`
- [ ] Database shows "connected" in health response
- [ ] Frontend loads: `https://your-app.com/`
- [ ] Assets load: `https://your-app.com/assets/oqta_logo.svg`
- [ ] Admin panel loads: `https://your-app.com/admin`
- [ ] Can login to admin with configured credentials
- [ ] Dashboard shows metrics (may be 0 if no data yet)

## What Happens on Deployment

1. **npm install**:
   - Installs all dependencies
   - Runs `postinstall` → generates Prisma client

2. **npm run build**:
   - Generates Prisma client again (ensure latest)
   - Compiles TypeScript to JavaScript
   - Copies all static files:
     - `index.html`, `script.js`, `styles.css` → `public/`
     - `admin/**/*` → `public/admin/`
     - `assets/**/*` → `public/assets/`

3. **npm start**:
   - Runs `prisma migrate deploy` → creates database tables
   - Starts Node.js server
   - Checks database connection
   - Serves:
     - Frontend at `/`
     - Admin at `/admin`
     - Assets at `/assets/*`
     - API at `/api/*`

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `******localhost:5432/oqta` |
| `ADMIN_EMAIL` | Admin login email | `admin@oqta.ai` |
| `ADMIN_PASSWORD` | Admin login password (min 8 chars) | `SecurePass123` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `your-random-32-char-secret` |
| `AI_TOKENS_PER_MESSAGE` | Token calculation multiplier | `2315` |
| `QDRANT_URL` | Qdrant vector DB URL | (provided in problem) |
| `QDRANT_API_KEY` | Qdrant API key | (provided in problem) |
| `QDRANT_COLLECTION` | Collection name in Qdrant | `oqta` |
| `NODE_ENV` | Environment mode | `production` or `development` |
| `PORT` | Server port | `3000` |

## Getting Help

If issues persist after following this guide:

1. Check server logs in your deployment platform
2. Run health check and share the response
3. Verify all environment variables are set correctly
4. Check PostgreSQL is accessible from your server

---

**Last Updated**: December 22, 2024
**Compatible with**: Railway, Render, VPS with PostgreSQL
