import { Router } from 'express';
import { handleTelegramWebhook, setWebhook, getWebhookInfo, notifyLead } from '../controllers/telegramController.js';
import { authenticateToken } from '../middleware/auth.js';
import { telegramWebhookLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Webhook endpoint - public (Telegram will call this) with rate limiting
router.post('/webhook', telegramWebhookLimiter, handleTelegramWebhook);

// Lead notification from CTA form — public with standard rate limiting
router.post('/lead', apiLimiter, notifyLead);

// Admin endpoints for webhook management (protected with auth and rate limiting)
router.post('/set-webhook', authenticateToken, apiLimiter, setWebhook);
router.get('/webhook-info', authenticateToken, apiLimiter, getWebhookInfo);

export default router;
