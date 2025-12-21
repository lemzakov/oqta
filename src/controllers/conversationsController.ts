import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getSessions = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        orderBy: {
          startedAt: 'desc',
        },
        skip,
        take: Number(limit),
        include: {
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.session.count(),
    ]);

    res.json({
      sessions: sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        userEmail: session.userEmail,
        userName: session.userName,
        startedAt: session.startedAt,
        lastMessageAt: session.lastMessageAt,
        messageCount: session._count.messages,
      })),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

export const getSessionMessages = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      session: {
        id: session.id,
        userId: session.userId,
        userEmail: session.userEmail,
        userName: session.userName,
        startedAt: session.startedAt,
        lastMessageAt: session.lastMessageAt,
      },
      messages: session.messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        createdAt: msg.createdAt,
        toolCalls: msg.toolCalls,
        additionalKwargs: msg.additionalKwargs,
        responseMetadata: msg.responseMetadata,
        invalidToolCalls: msg.invalidToolCalls,
      })),
    });
  } catch (error) {
    console.error('Get session messages error:', error);
    res.status(500).json({ error: 'Failed to fetch session messages' });
  }
};
