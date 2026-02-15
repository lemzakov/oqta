import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const getSessions = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Get all unique session IDs from chat histories table
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

    // Try to get additional info from sessions table, summaries, and linked customers
    const sessionsWithDetails = await Promise.all(
      uniqueSessions.map(async (sessionData) => {
        const sessionInfo = await prisma.session.findFirst({
          where: { id: sessionData.session_id },
        });

        const summary = await prisma.conversationSummary.findUnique({
          where: { sessionId: sessionData.session_id },
        });

        // Check if session is linked to a customer
        const customerSession = await prisma.customerSession.findFirst({
          where: { sessionId: sessionData.session_id },
          include: {
            customer: true,
          },
        });

        return {
          id: sessionData.session_id,
          userId: sessionInfo?.userId || null,
          userEmail: sessionInfo?.userEmail || null,
          userName: sessionInfo?.userName || 'Guest User',
          startedAt: sessionData.first_message_at,
          lastMessageAt: sessionData.last_message_at,
          messageCount: Number(sessionData.message_count),
          summary: summary ? {
            customerName: summary.customerName,
            phoneNumber: summary.phoneNumber,
            summary: summary.summary,
            nextAction: summary.nextAction,
            createdAt: summary.createdAt,
          } : null,
          customer: customerSession ? {
            id: customerSession.customer.id,
            name: customerSession.customer.name,
            email: customerSession.customer.email,
            phone: customerSession.customer.phone,
            company: customerSession.customer.company,
          } : null,
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

    // Read messages from chat histories table (managed by Lemzakov AI Labs integration)
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

    // Get summary if available
    const summary = await prisma.conversationSummary.findUnique({
      where: { sessionId },
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
      summary: summary ? {
        customerName: summary.customerName,
        summary: summary.summary,
        nextAction: summary.nextAction,
        createdAt: summary.createdAt,
      } : null,
      messages: messages.map((msg: any) => {
        // Parse the JSONB message field from integration format
        // Lemzakov AI Labs stores messages like: { "type": "ai|human", "content": "...", "tool_calls": [], ... }
        const messageData = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
        return {
          id: msg.id,
          type: messageData.type || 'human',
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

export const generateSummary = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Check if summary already exists
    const existingSummary = await prisma.conversationSummary.findUnique({
      where: { sessionId },
    });

    if (existingSummary) {
      return res.json({
        summary: {
          customerName: existingSummary.customerName,
          phoneNumber: existingSummary.phoneNumber,
          summary: existingSummary.summary,
          nextAction: existingSummary.nextAction,
          createdAt: existingSummary.createdAt,
        },
        cached: true,
      });
    }

    // Get conversation history
    const messages = await prisma.chatHistory.findMany({
      where: { sessionId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Format messages for AI
    const conversationHistory = messages.map((msg: any) => {
      const messageData = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
      const role = messageData.type === 'human' ? 'user' : 'assistant';
      return {
        role,
        content: messageData.content || '',
      };
    });

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Generate summary using Vercel AI SDK with GPT-4 mini
    const summarySchema = z.object({
      customerName: z.string().describe('The name of the customer or "Unknown" if not mentioned'),
      phoneNumber: z.string().nullable().describe('The phone number of the customer if mentioned in the conversation, in international format (e.g., +971501234567), or null if not mentioned'),
      summary: z.string().describe('A concise summary of the conversation in 2-3 sentences'),
      nextAction: z.string().describe('What is expected next or what follow-up action is needed'),
    });

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: summarySchema,
      prompt: `You are analyzing a customer service conversation. Based on the following conversation history, provide a summary.

Conversation:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Generate a summary that includes:
1. Customer name (if mentioned, otherwise "Unknown")
2. Customer phone number (if mentioned, in international format like +971501234567)
3. A brief summary of the conversation (2-3 sentences)
4. What is expected next or what action should be taken`,
    });

    // Update session name if customer name is provided
    if (object.customerName && object.customerName !== 'Unknown') {
      await prisma.session.upsert({
        where: { id: sessionId },
        update: { userName: object.customerName },
        create: {
          id: sessionId,
          userName: object.customerName,
        },
      });
    }

    // Save summary to database
    const savedSummary = await prisma.conversationSummary.create({
      data: {
        sessionId,
        customerName: object.customerName,
        phoneNumber: object.phoneNumber,
        summary: object.summary,
        nextAction: object.nextAction,
      },
    });

    res.json({
      summary: {
        customerName: savedSummary.customerName,
        phoneNumber: savedSummary.phoneNumber,
        summary: savedSummary.summary,
        nextAction: savedSummary.nextAction,
        createdAt: savedSummary.createdAt,
      },
      cached: false,
    });
  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};

export const exportToGoogleSheets = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists
    const messages = await prisma.chatHistory.findMany({
      where: { sessionId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get Lemzakov AI Labs Google Sheets integration URL from settings
    const n8nSheetsUrlSetting = await prisma.setting.findUnique({
      where: { key: 'n8n_sheets_url' },
    });

    if (!n8nSheetsUrlSetting || !n8nSheetsUrlSetting.value) {
      return res.status(400).json({ 
        error: 'Lemzakov AI Labs Google Sheets integration URL not configured. Please configure it in Settings.' 
      });
    }

    const webhookUrl = n8nSheetsUrlSetting.value;
    console.log('Exporting conversation to Google Sheets:', { sessionId, webhookUrl });

    // Send session_id to the Lemzakov AI Labs webhook
    const payload = { session_id: sessionId };
    
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('Webhook request failed:', { status: webhookResponse.status, error: errorText });
        return res.status(500).json({ 
          error: `Failed to export to Google Sheets. Webhook returned status ${webhookResponse.status}` 
        });
      }

      const webhookData = await webhookResponse.json().catch((parseError) => {
        console.warn('Failed to parse webhook response as JSON:', parseError);
        return {};
      });
      console.log('Successfully exported to Google Sheets:', { sessionId, response: webhookData });

      res.json({
        success: true,
        message: 'Successfully exported conversation to Google Sheets',
        sessionId,
      });
    } catch (webhookError) {
      console.error('Error calling webhook:', webhookError);
      return res.status(500).json({ 
        error: 'Failed to connect to Google Sheets webhook. Please check the webhook URL in Settings.' 
      });
    }
  } catch (error) {
    console.error('Export to Google Sheets error:', error);
    res.status(500).json({ error: 'Failed to export to Google Sheets' });
  }
};

/**
 * Link a session to a customer
 */
export const linkSessionToCustomer = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if already linked
    const existing = await prisma.customerSession.findUnique({
      where: {
        customerId_sessionId: {
          customerId,
          sessionId,
        },
      },
    });

    if (existing) {
      return res.json({ 
        message: 'Session already linked to customer',
        customerSession: existing,
      });
    }

    // Create the link
    const customerSession = await prisma.customerSession.create({
      data: {
        customerId,
        sessionId,
      },
      include: {
        customer: true,
      },
    });

    res.json({
      message: 'Session linked to customer successfully',
      customerSession,
    });
  } catch (error) {
    console.error('Link session to customer error:', error);
    res.status(500).json({ error: 'Failed to link session to customer' });
  }
};

/**
 * Extract customer data from conversation using AI
 */
export const extractCustomerData = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Get conversation history
    const messages = await prisma.chatHistory.findMany({
      where: { sessionId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Format messages for AI
    const conversationHistory = messages.map((msg: any) => {
      const messageData = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
      const role = messageData.type === 'human' ? 'user' : 'assistant';
      return {
        role,
        content: messageData.content || '',
      };
    });

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Extract customer data using Vercel AI SDK
    const customerDataSchema = z.object({
      name: z.string().nullable().describe('The full name of the customer, or null if not mentioned'),
      email: z.string().nullable().describe('The email address of the customer, or null if not mentioned'),
      phone: z.string().nullable().describe('The phone number in international format (e.g., +971501234567), or null if not mentioned'),
      company: z.string().nullable().describe('The company name or business name, or null if not mentioned'),
      notes: z.string().nullable().describe('Any additional relevant information about the customer or their needs'),
    });

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: customerDataSchema,
      prompt: `You are extracting customer information from a conversation. Based on the following conversation history, extract the customer's details.

Conversation:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Extract the following information if mentioned:
1. Customer's full name
2. Email address
3. Phone number (in international format like +971501234567)
4. Company or business name
5. Any other relevant notes about the customer or their inquiry

Return null for any field that is not mentioned in the conversation.`,
    });

    res.json({
      customerData: object,
    });
  } catch (error) {
    console.error('Extract customer data error:', error);
    res.status(500).json({ error: 'Failed to extract customer data' });
  }
};
