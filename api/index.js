import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const startTs = new Date().toISOString();
console.log(`[BOOT] ${startTs} Starting Vercel serverless function`);
console.log(`[BOOT] Node version : ${process.version}`);
console.log(`[BOOT] NODE_ENV     : ${process.env.NODE_ENV || 'not set'}`);
console.log(`[BOOT] DATABASE_URL : ${process.env.DATABASE_URL ? 'set (hidden)' : 'NOT SET'}`);
console.log(`[BOOT] POSTGRES_PRISMA_URL : ${process.env.POSTGRES_PRISMA_URL ? 'set (hidden)' : 'NOT SET'}`);
console.log(`[BOOT] JWT_SECRET   : ${process.env.JWT_SECRET ? 'set (hidden)' : 'NOT SET'}`);
console.log(`[BOOT] ADMIN_EMAIL  : ${process.env.ADMIN_EMAIL ? 'set' : 'NOT SET'}`);
console.log(`[BOOT] ADMIN_PASSWORD : ${process.env.ADMIN_PASSWORD ? 'set (hidden)' : 'NOT SET'}`);

// ── Prisma ───────────────────────────────────────────────────────────────────
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL,
    },
  },
});

// ── Express app ──────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));
app.use(express.json());
app.use(cookieParser());

// ── Route imports ────────────────────────────────────────────────────────────
// Load route modules; log per-route failures so partial outages are visible.
const loadRoute = async (name, path) => {
  try {
    const mod = await import(path);
    console.log(`[BOOT] ✅ Loaded route: ${name} (${path})`);
    return mod.default;
  } catch (err) {
    console.error(`[BOOT] ❌ Failed to load route: ${name} (${path}) — ${err.message}`);
    return null;
  }
};

const mountRoutes = async () => {
  const [
    authRoutes,
    dashboardRoutes,
    conversationsRoutes,
    settingsRoutes,
    knowledgeRoutes,
    chatRoutes,
    customersRoutes,
    billingRoutes,
    freeZonesRoutes,
    analyticsRoutes,
    telegramRoutes,
  ] = await Promise.all([
    loadRoute('auth',          '../dist/routes/auth.js'),
    loadRoute('dashboard',     '../dist/routes/dashboard.js'),
    loadRoute('conversations', '../dist/routes/conversations.js'),
    loadRoute('settings',      '../dist/routes/settings.js'),
    loadRoute('knowledge',     '../dist/routes/knowledge.js'),
    loadRoute('chat',          '../dist/routes/chat.js'),
    loadRoute('customers',     '../dist/routes/customers.js'),
    loadRoute('billing',       '../dist/routes/billing.js'),
    loadRoute('free-zones',    '../dist/routes/free-zones.js'),
    loadRoute('analytics',     '../dist/routes/analytics.js'),
    loadRoute('telegram',      '../dist/routes/telegram.js'),
  ]);

  const mount = (path, router) => {
    if (router) {
      app.use(path, router);
      console.log(`[BOOT] Mounted: ${path}`);
    } else {
      console.warn(`[BOOT] Skipped (load failed): ${path}`);
    }
  };

  mount('/api/auth',          authRoutes);
  mount('/api/dashboard',     dashboardRoutes);
  mount('/api/conversations', conversationsRoutes);
  mount('/api/settings',      settingsRoutes);
  mount('/api/knowledge',     knowledgeRoutes);
  mount('/api/chat',          chatRoutes);
  mount('/api/customers',     customersRoutes);
  mount('/api/billing',       billingRoutes);
  mount('/api/free-zones',    freeZonesRoutes);
  mount('/api/analytics',     analyticsRoutes);
  mount('/api/telegram',      telegramRoutes);

  console.log(`[BOOT] All routes mounted.`);
};

// Initialize routes once at module load time (top-level await is valid in ESM)
await mountRoutes().catch((err) => {
  console.error('[BOOT] Fatal: route mounting failed:', err);
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    database: 'unknown',
    api: 'ok',
    admin: 'ok',
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
  } catch (error) {
    health.database = 'disconnected';
    health.status = 'degraded';
    console.error('[HEALTH] DB check failed:', error.message);
  }
  res.json(health);
});

// ── DB check endpoint ─────────────────────────────────────────────────────────
app.get('/api/db-check', async (req, res) => {
  try {
    await prisma.$connect();
    const adminCount   = await prisma.adminUser.count().catch(() => -1);
    const sessionCount = await prisma.session.count().catch(() => -1);
    const settingCount = await prisma.setting.count().catch(() => -1);
    const tablesExist  = adminCount >= 0 && sessionCount >= 0 && settingCount >= 0;
    res.json({
      success: true,
      connected: true,
      tablesExist,
      counts: { admins: adminCount, sessions: sessionCount, settings: settingCount },
      message: tablesExist
        ? 'Database is ready'
        : 'Database connected but tables may not exist. Run: npx prisma migrate deploy',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DB-CHECK] Error:', errorMessage);
    res.status(500).json({
      success: false,
      connected: false,
      error: errorMessage,
      message: 'Database connection failed. Check DATABASE_URL or POSTGRES_PRISMA_URL',
    });
  }
});

// Export for Vercel serverless
export default app;
