import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getSessions = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Get all unique session IDs from n8n_chat_histories table
    // Group by session_id to get all conversations
    const uniqueSessions = await prisma.$queryRaw<Array<{ session_id: string; message_count: bigint; first_message_at: Date; last_message_at: Date }>>`
      SELECT 
        session_id,
        COUNT(*) as message_count,
        MIN(created_at) as first_message_at,
        MAX(created_at) as last_message_at
      FROM n8n_chat_histories
      GROUP BY session_id
      ORDER BY last_message_at DESC
      LIMIT ${Number(limit)}
      OFFSET ${skip}
    `;

    // Get total count of unique sessions
    const totalResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT session_id) as count
      FROM n8n_chat_histories
    `;
    const total = Number(totalResult[0]?.count || 0);

    // Try to get additional info from sessions table if available
    const sessionsWithDetails = await Promise.all(
      uniqueSessions.map(async (sessionData) => {
        const sessionInfo = await prisma.session.findFirst({
          where: { id: sessionData.session_id },
        });

        return {
          id: sessionData.session_id,
          userId: sessionInfo?.userId || null,
          userEmail: sessionInfo?.userEmail || null,
          userName: sessionInfo?.userName || 'Guest User',
          startedAt: sessionData.first_message_at,
          lastMessageAt: sessionData.last_message_at,
          messageCount: Number(sessionData.message_count),
        };
      })
    );

    res.json({
      sessions: sessionsWithDetails,
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

    // Read messages from n8n_chat_histories table (managed by n8n)
    const messages = await prisma.chatHistory.findMany({
      where: { sessionId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Try to get additional info from sessions table if available (optional)
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    // Get session metadata from messages
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    res.json({
      session: {
        id: sessionId,
        userId: session?.userId || null,
        userEmail: session?.userEmail || null,
        userName: session?.userName || 'Guest User',
        startedAt: firstMessage.createdAt,
        lastMessageAt: lastMessage.createdAt,
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
