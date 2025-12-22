import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../dist/routes/auth.js';
import dashboardRoutes from '../dist/routes/dashboard.js';
import conversationsRoutes from '../dist/routes/conversations.js';
import settingsRoutes from '../dist/routes/settings.js';
import knowledgeRoutes from '../dist/routes/knowledge.js';
import chatRoutes from '../dist/routes/chat.js';

dotenv.config();

// Initialize Prisma with connection pooling for Vercel
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL,
    },
  },
});

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    database: 'unknown',
    api: 'ok',
    admin: 'ok'
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
  } catch (error) {
    health.database = 'disconnected';
    health.status = 'degraded';
  }

  res.json(health);
});

// Database check endpoint
app.get('/api/db-check', async (req, res) => {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Try to count tables
    const adminCount = await prisma.adminUser.count().catch(() => -1);
    const sessionCount = await prisma.session.count().catch(() => -1);
    const settingCount = await prisma.setting.count().catch(() => -1);
    
    const tablesExist = adminCount >= 0 && sessionCount >= 0 && settingCount >= 0;
    
    res.json({
      success: true,
      connected: true,
      tablesExist,
      counts: {
        admins: adminCount,
        sessions: sessionCount,
        settings: settingCount
      },
      message: tablesExist 
        ? 'Database is ready' 
        : 'Database connected but tables may not exist. Run: npx prisma migrate deploy'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      connected: false,
      error: errorMessage,
      message: 'Database connection failed. Check DATABASE_URL or POSTGRES_PRISMA_URL'
    });
  }
});

// Export for Vercel serverless
export default app;
