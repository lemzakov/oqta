import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Configuration constant for AI token calculation
const AI_TOKENS_PER_MESSAGE = parseInt(process.env.AI_TOKENS_PER_MESSAGE || '2315', 10);

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Conversations started today
    const conversationsToday = await prisma.session.count({
      where: {
        startedAt: {
          gte: today,
        },
      },
    });

    // Total messages
    const totalMessages = await prisma.chatHistory.count();

    // Messages sent today
    const messagesToday = await prisma.chatHistory.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    // AI tokens used (messages * AI_TOKENS_PER_MESSAGE)
    const aiTokens = totalMessages * AI_TOKENS_PER_MESSAGE;

    // Invoice statistics
    const [totalInvoiced, totalPaid, dealsInProgress] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: {
          amount: true,
        },
      }),
      prisma.invoice.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'paid',
        },
      }),
      prisma.invoice.count({
        where: {
          status: 'in_progress',
        },
      }),
    ]);

    res.json({
      conversationsToday,
      messagesToday,
      totalMessages,
      aiTokens,
      totalInvoiced: totalInvoiced._sum.amount || 0,
      totalPaid: totalPaid._sum.amount || 0,
      dealsInProgress,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};
