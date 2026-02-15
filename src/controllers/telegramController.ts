import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Telegram Bot API base URL
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(chatId: string | number, text: string, replyToMessageId?: number) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  const url = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    ...(replyToMessageId && { reply_to_message_id: replyToMessageId })
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Telegram API error:', response.status, errorData);
      return false;
    }

    const data = await response.json();
    console.log('Message sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

/**
 * Generate conversation summary (reused logic from conversationsController)
 */
async function generateConversationSummary(sessionId: string) {
  // Check if summary already exists
  const existingSummary = await prisma.conversationSummary.findUnique({
    where: { sessionId },
  });

  if (existingSummary) {
    return {
      customerName: existingSummary.customerName,
      summary: existingSummary.summary,
      nextAction: existingSummary.nextAction,
      createdAt: existingSummary.createdAt,
      cached: true,
    };
  }

  // Get conversation history
  const messages = await prisma.chatHistory.findMany({
    where: { sessionId },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (messages.length === 0) {
    throw new Error('Session not found');
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
    throw new Error('OpenAI API key not configured');
  }

  // Generate summary using Vercel AI SDK with GPT-4 mini
  const summarySchema = z.object({
    customerName: z.string().describe('The name of the customer or "Unknown" if not mentioned'),
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
2. A brief summary of the conversation (2-3 sentences)
3. What is expected next or what action should be taken`,
  });

  // Save summary to database
  const savedSummary = await prisma.conversationSummary.create({
    data: {
      sessionId,
      customerName: object.customerName,
      summary: object.summary,
      nextAction: object.nextAction,
    },
  });

  return {
    customerName: savedSummary.customerName,
    summary: savedSummary.summary,
    nextAction: savedSummary.nextAction,
    createdAt: savedSummary.createdAt,
    cached: false,
  };
}

/**
 * Format summary for Telegram message
 */
function formatSummaryMessage(summaryData: any): string {
  const { customerName, summary, nextAction, cached } = summaryData;
  
  let message = '<b>📊 Conversation Summary</b>\n\n';
  
  if (customerName && customerName !== 'Unknown') {
    message += `<b>Customer:</b> ${customerName}\n\n`;
  }
  
  message += `<b>Summary:</b>\n${summary}\n\n`;
  
  if (nextAction) {
    message += `<b>Next Action:</b>\n${nextAction}\n\n`;
  }
  
  if (cached) {
    message += '<i>📝 Note: This is a cached summary</i>';
  }
  
  return message;
}

/**
 * Handle Telegram webhook requests
 * Accepts inline keyboard callback queries with session IDs
 */
export const handleTelegramWebhook = async (req: Request, res: Response) => {
  try {
    console.log('Telegram webhook received:', JSON.stringify(req.body, null, 2));

    const update = req.body;

    // Handle callback query (inline keyboard button press)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
      const callbackData = callbackQuery.data;

      console.log(`Callback query received - Chat ID: ${chatId}, Data: ${callbackData}`);

      // Extract session ID from callback data
      // Expected format: "summary:session_id" or just the session_id
      let sessionId = callbackData;
      if (callbackData.startsWith('summary:')) {
        sessionId = callbackData.replace('summary:', '');
      }

      // Validate session ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(sessionId)) {
        console.error('Invalid session ID format:', sessionId);
        await sendTelegramMessage(chatId, '❌ Invalid session ID format', messageId);
        return res.json({ success: false, error: 'Invalid session ID' });
      }

      try {
        // Generate or retrieve summary
        console.log(`Generating summary for session: ${sessionId}`);
        const summaryData = await generateConversationSummary(sessionId);
        
        // Format and send summary message
        const message = formatSummaryMessage(summaryData);
        const sent = await sendTelegramMessage(chatId, message, messageId);

        if (sent) {
          console.log(`Summary sent successfully for session ${sessionId}`);
          return res.json({ success: true, sessionId });
        } else {
          console.error('Failed to send Telegram message');
          return res.status(500).json({ success: false, error: 'Failed to send message' });
        }
      } catch (error) {
        console.error('Error processing summary:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await sendTelegramMessage(
          chatId,
          `❌ Error generating summary: ${errorMessage}`,
          messageId
        );
        return res.status(500).json({ success: false, error: errorMessage });
      }
    }

    // Handle regular message (optional - for testing or future use)
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      console.log(`Message received from chat ${chatId}: ${text}`);
      
      // You can add custom message handling here if needed
      // For now, just acknowledge receipt
      return res.json({ success: true, message: 'Message received' });
    }

    // If no recognized update type
    console.log('Unhandled update type');
    res.json({ success: true, message: 'Update received' });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
};

/**
 * Set Telegram webhook URL (for setup)
 */
export const setWebhook = async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
    }

    const url = `${TELEGRAM_API_BASE}${botToken}/setWebhook`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    const data = await response.json() as any;
    
    if (data.ok) {
      res.json({ 
        success: true, 
        message: 'Webhook set successfully',
        webhookUrl,
        result: data.result 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: data.description || 'Failed to set webhook' 
      });
    }
  } catch (error) {
    console.error('Set webhook error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to set webhook' 
    });
  }
};

/**
 * Get webhook info (for debugging)
 */
export const getWebhookInfo = async (req: Request, res: Response) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
    }

    const url = `${TELEGRAM_API_BASE}${botToken}/getWebhookInfo`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('Get webhook info error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get webhook info' 
    });
  }
};
