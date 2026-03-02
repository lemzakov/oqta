import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Static imports so Vercel's nft bundler can include all dist/routes files in the bundle
import authRoutes from '../dist/routes/auth.js';
import dashboardRoutes from '../dist/routes/dashboard.js';
import conversationsRoutes from '../dist/routes/conversations.js';
import settingsRoutes from '../dist/routes/settings.js';
import knowledgeRoutes from '../dist/routes/knowledge.js';
import chatRoutes from '../dist/routes/chat.js';
import customersRoutes from '../dist/routes/customers.js';
import billingRoutes from '../dist/routes/billing.js';
import freeZonesRoutes from '../dist/routes/free-zones.js';
import analyticsRoutes from '../dist/routes/analytics.js';
import telegramRoutes from '../dist/routes/telegram.js';

dotenv.config();

console.log(`[BOOT] ${new Date().toISOString()} Starting Vercel serverless function`);
console.log(`[BOOT] Node version         : ${process.version}`);
console.log(`[BOOT] NODE_ENV             : ${process.env.NODE_ENV || 'not set'}`);
console.log(`[BOOT] DATABASE_URL         : ${process.env.DATABASE_URL ? 'set (hidden)' : 'NOT SET'}`);
console.log(`[BOOT] POSTGRES_PRISMA_URL  : ${process.env.POSTGRES_PRISMA_URL ? 'set (hidden)' : 'NOT SET'}`);
console.log(`[BOOT] JWT_SECRET           : ${process.env.JWT_SECRET ? 'set (hidden)' : 'NOT SET'}`);
console.log(`[BOOT] ADMIN_EMAIL          : ${process.env.ADMIN_EMAIL ? 'set' : 'NOT SET'}`);
console.log(`[BOOT] ADMIN_PASSWORD       : ${process.env.ADMIN_PASSWORD ? 'set (hidden)' : 'NOT SET'}`);

// ── Prisma ───────────────────────────────────────────────────────────────────
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL,
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

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/settings',      settingsRoutes);
app.use('/api/knowledge',     knowledgeRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/customers',     customersRoutes);
app.use('/api/billing',       billingRoutes);
app.use('/api/free-zones',    freeZonesRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/telegram',      telegramRoutes);

console.log(`[BOOT] All routes mounted.`);

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
