import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

const logLoginAttempt = async (
  email: string,
  ipAddress: string,
  userAgent: string | undefined,
  success: boolean,
  errorMsg?: string
): Promise<void> => {
  const timestamp = new Date().toISOString();
  const status = success ? 'SUCCESS' : 'FAILED';
  console.log(`[AUTH] ${timestamp} | ${status} | email=${email} | ip=${ipAddress} | ua=${userAgent || 'unknown'}${errorMsg ? ` | error=${errorMsg}` : ''}`);

  try {
    await prisma.adminLoginLog.create({
      data: {
        email,
        ipAddress,
        userAgent,
        success,
        error: errorMsg,
      },
    });
  } catch (dbError) {
    console.error('[AUTH] Failed to write login log to database:', dbError instanceof Error ? dbError.message : dbError);
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminEmail || !adminPassword || !jwtSecret) {
      const missing = [
        !adminEmail && 'ADMIN_EMAIL',
        !adminPassword && 'ADMIN_PASSWORD',
        !jwtSecret && 'JWT_SECRET',
      ].filter(Boolean).join(', ');
      console.error(`[AUTH] Server configuration error: missing environment variables: ${missing}`);
      await logLoginAttempt(email, ipAddress, userAgent, false, `Missing env vars: ${missing}`);
      return res.status(500).json({ error: 'Server configuration error. Please contact the administrator.' });
    }

    // Check if admin user exists, create if not
    let admin = await prisma.adminUser.findUnique({ where: { email } });

    if (!admin) {
      if (email !== adminEmail) {
        await logLoginAttempt(email, ipAddress, userAgent, false, 'User not found');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      admin = await prisma.adminUser.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
        },
      });
      console.log(`[AUTH] Admin user created for ${adminEmail}`);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      await logLoginAttempt(email, ipAddress, userAgent, false, 'Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: admin.id, email: admin.email },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    await logLoginAttempt(email, ipAddress, userAgent, true);

    res.json({
      success: true,
      token,
      user: { id: admin.id, email: admin.email }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[AUTH] Login error for ${email || 'unknown'} from ${ipAddress}:`, error);
    try {
      await logLoginAttempt(email || '', ipAddress, userAgent, false, `Server error: ${errorMsg}`);
    } catch {
      // ignore secondary logging failure
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
};

export const verify = async (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
};

export const getLoginLogs = async (req: Request, res: Response) => {
  try {
    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = Math.min(Number.isNaN(rawLimit) ? 50 : rawLimit, 200);
    const logs = await prisma.adminLoginLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        ipAddress: true,
        userAgent: true,
        success: true,
        error: true,
        createdAt: true,
      },
    });
    res.json({ logs });
  } catch (error) {
    console.error('[AUTH] Failed to fetch login logs:', error);
    res.status(500).json({ error: 'Failed to fetch login logs' });
  }
};
