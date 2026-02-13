import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './utils/prisma.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import conversationsRoutes from './routes/conversations.js';
import settingsRoutes from './routes/settings.js';
import knowledgeRoutes from './routes/knowledge.js';
import chatRoutes from './routes/chat.js';
import customersRoutes from './routes/customers.js';
import billingRoutes from './routes/billing.js';
import freeZonesRoutes from './routes/free-zones.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database initialization function
async function initializeDatabase() {
  try {
    console.log('Checking database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test if tables exist by trying to count admin users
    try {
      await prisma.adminUser.count();
      console.log('✅ Database tables exist');
    } catch (error) {
      console.log('⚠️  Database tables might not exist. Please run migrations.');
      console.log('Run: npx prisma migrate deploy');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Database connection failed:', errorMessage);
    console.error('Make sure DATABASE_URL is set correctly in environment variables');
  }
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '', process.env.FRONTEND_URL || '']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(express.json());
app.use(cookieParser());

// API Routes (before static files to ensure API takes precedence)
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/free-zones', freeZonesRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint with database check
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
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

// Serve static files for admin panel
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Serve static files for assets
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Serve admin panel HTML for /admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

// Serve static files (existing frontend) - place this after specific routes
app.use(express.static(path.join(__dirname, '..')));

// Fallback route for SPA
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Initialize database on startup
initializeDatabase();

// Export app for serverless environments
export default app;

// Only listen if not in serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`   - Frontend: http://localhost:${PORT}/`);
    console.log(`   - Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`   - Health Check: http://localhost:${PORT}/api/health`);
  });
}
