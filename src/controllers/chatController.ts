import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

// Note: n8n_chat_histories table is managed by n8n
// We only create/update sessions here, not individual messages
// Messages are written directly by n8n workflow

export const saveMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, userEmail, userName } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Find or create session only
    // n8n will write messages to n8n_chat_histories table directly
    let session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      session = await prisma.session.create({
        data: {
          id: sessionId,
          userId,
          userEmail,
          userName,
          startedAt: new Date(),
          lastMessageAt: new Date(),
        },
      });
    } else {
      // Update last message timestamp
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastMessageAt: new Date() },
      });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Save session error:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
};
