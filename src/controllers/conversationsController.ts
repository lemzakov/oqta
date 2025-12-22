import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getSessions = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Get all sessions with message count
    const sessions = await prisma.session.findMany({
      orderBy: {
        startedAt: 'desc',
      },
      skip,
      take: Number(limit),
    });

    const total = await prisma.session.count();

    // Get message counts for each session
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        const messageCount = await prisma.chatHistory.count({
          where: { sessionId: session.id },
        });
        return {
          id: session.id,
          userId: session.userId,
          userEmail: session.userEmail,
          userName: session.userName,
          startedAt: session.startedAt,
          lastMessageAt: session.lastMessageAt,
          messageCount,
        };
      })
    );

    res.json({
      sessions: sessionsWithCounts,
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
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Read messages from n8n_chat_histories table (managed by n8n)
    const messages = await prisma.chatHistory.findMany({
      where: { sessionId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json({
      session: {
        id: session.id,
        userId: session.userId,
        userEmail: session.userEmail,
        userName: session.userName,
        startedAt: session.startedAt,
        lastMessageAt: session.lastMessageAt,
      },
      messages: messages.map((msg: any) => {
        // Parse the JSONB message field from n8n format
        // n8n stores messages like: { "type": "ai|human", "content": "...", "tool_calls": [], ... }
        const messageData = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
        return {
          id: msg.id,
          type: messageData.type || 'human', // n8n uses "human" instead of "user"
          content: messageData.content || '',
          createdAt: msg.createdAt,
          toolCalls: messageData.tool_calls || [],
          additionalKwargs: messageData.additional_kwargs || {},
          responseMetadata: messageData.response_metadata || {},
          invalidToolCalls: messageData.invalid_tool_calls || [],
        };
      }),
    });
  } catch (error) {
    console.error('Get session messages error:', error);
    res.status(500).json({ error: 'Failed to fetch session messages' });
  }
};
