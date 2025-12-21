# Vercel Deployment Notes

## Important: Vercel Limitations

⚠️ **This application is NOT recommended for Vercel deployment** due to the following reasons:

1. **Requires PostgreSQL Database**: Vercel doesn't provide PostgreSQL hosting
2. **Requires persistent server**: The Express backend needs to run continuously
3. **Serverless limitations**: Vercel serverless functions have:
   - 10-second execution timeout (Hobby tier)
   - No persistent connections
   - Cold start issues

## Recommended Deployment Options

### ✅ Best Options (Recommended)

1. **Railway.app** - Provides PostgreSQL + Node.js hosting
   - Free tier available
   - Easy deployment from GitHub
   - Built-in PostgreSQL
   - See DEPLOYMENT.md for instructions

2. **Render.com** - Free PostgreSQL + Web Service
   - Free tier (with limitations)
   - Auto-deploy from GitHub
   - PostgreSQL included
   - See DEPLOYMENT.md for instructions

3. **VPS (DigitalOcean, Linode, Vultr)** - Full control
   - $5-10/month
   - Complete flexibility
   - Install PostgreSQL yourself
   - See DEPLOYMENT.md for instructions

### ⚠️ Possible but Complex

**Vercel + External Database**
If you still want to use Vercel, you need:
1. External PostgreSQL (e.g., Supabase, Neon, ElephantSQL)
2. Convert Express app to serverless functions
3. Handle cold starts and timeouts
4. Manage database connections carefully

## Current Setup

The current Vercel configuration (`vercel.json`) is set up to:
- Build static files to `public/` directory
- Serve the frontend as static files

**What works on Vercel:**
- ✅ Static frontend (index.html, styles.css, script.js)
- ✅ Admin panel static files

**What DOESN'T work on Vercel:**
- ❌ Backend API (/api/*)
- ❌ Database operations
- ❌ Admin authentication
- ❌ Chat message storage
- ❌ Settings management
- ❌ Knowledge base operations

## If You Must Use Vercel

### Option 1: Static Frontend Only
Deploy just the frontend to Vercel and host the backend elsewhere:
1. Deploy to Vercel for static files
2. Deploy backend to Railway/Render
3. Update frontend API calls to point to backend URL

### Option 2: Hybrid Approach
1. Frontend on Vercel
2. Backend on Railway with PostgreSQL
3. Configure CORS for cross-origin requests

### Option 3: Full Migration to Serverless
(Complex - requires significant refactoring)
1. Convert Express routes to Vercel serverless functions
2. Use external PostgreSQL (Supabase/Neon)
3. Implement connection pooling (e.g., Prisma Data Proxy)
4. Handle cold starts
5. Rewrite file serving logic

## Quick Deploy to Railway (Recommended Alternative)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Add PostgreSQL
railway add

# 5. Set environment variables
railway variables set ADMIN_EMAIL=admin@oqta.ai
railway variables set ADMIN_PASSWORD=your-password
railway variables set JWT_SECRET=your-secret
# ... set other variables

# 6. Deploy
railway up
```

## Conclusion

For this application, we strongly recommend using:
- **Railway.app** (easiest)
- **Render.com** (free tier)
- **VPS** (most control)

instead of Vercel.

If you need help with deployment to these platforms, see DEPLOYMENT.md for detailed instructions.
