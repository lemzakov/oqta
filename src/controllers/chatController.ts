import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

// Note: Chat histories table is managed by Lemzakov AI Labs integration
// We only create/update sessions here, not individual messages
// Messages are written directly by Lemzakov AI Labs workflow

export const saveMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, userEmail, userName } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Find or create session only
    // Lemzakov AI Labs will write messages to chat histories table directly
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
