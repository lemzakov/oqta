import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const saveMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, userEmail, userName, type, content, toolCalls = [], additionalKwargs = {}, responseMetadata = {}, invalidToolCalls = [] } = req.body;

    if (!sessionId || !type || !content) {
      return res.status(400).json({ error: 'sessionId, type, and content are required' });
    }

    // Find or create session
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

    // Save message - using the JSONB message field to store all data
    const messageData = {
      type,
      content,
      tool_calls: toolCalls,
      additional_kwargs: additionalKwargs,
      response_metadata: responseMetadata,
      invalid_tool_calls: invalidToolCalls,
    };

    const message = await prisma.chatHistory.create({
      data: {
        sessionId,
        message: messageData,
      },
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error('Save message error:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
};
