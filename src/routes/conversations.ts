import { Router } from 'express';
import { getSessions, getSessionMessages, generateSummary, exportToGoogleSheets, linkSessionToCustomer, extractCustomerData } from '../controllers/conversationsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiLimiter, exportLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/sessions', authenticateToken, getSessions);
router.get('/sessions/:sessionId', authenticateToken, getSessionMessages);
router.post('/sessions/:sessionId/summary', authenticateToken, aiLimiter, generateSummary);
router.post('/sessions/:sessionId/export-to-sheets', authenticateToken, exportLimiter, exportToGoogleSheets);
router.post('/sessions/:sessionId/link-customer', authenticateToken, linkSessionToCustomer);
router.get('/sessions/:sessionId/extract-customer-data', authenticateToken, aiLimiter, extractCustomerData);

export default router;
