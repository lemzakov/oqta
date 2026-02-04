import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminEmail || !adminPassword || !jwtSecret) {
      console.error('Required environment variables are not set: ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Check if admin user exists, create if not
    let admin = await prisma.adminUser.findUnique({ where: { email } });
    
    if (!admin) {
      if (email !== adminEmail) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      admin = await prisma.adminUser.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
        },
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
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

    res.json({ 
      success: true, 
      token,
      user: { id: admin.id, email: admin.email }
    });
  } catch (error) {
    console.error('Login error:', error);
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
