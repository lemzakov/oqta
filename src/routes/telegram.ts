import { Router } from 'express';
import { handleTelegramWebhook, setWebhook, getWebhookInfo } from '../controllers/telegramController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Webhook endpoint - public (Telegram will call this)
router.post('/webhook', handleTelegramWebhook);

// Admin endpoints for webhook management (protected)
router.post('/set-webhook', authenticateToken, setWebhook);
router.get('/webhook-info', authenticateToken, getWebhookInfo);

export default router;
