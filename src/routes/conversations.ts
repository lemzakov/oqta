import { Router } from 'express';
import { getSessions, getSessionMessages, generateSummary, exportToGoogleSheets } from '../controllers/conversationsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/sessions', authenticateToken, getSessions);
router.get('/sessions/:sessionId', authenticateToken, getSessionMessages);
router.post('/sessions/:sessionId/summary', authenticateToken, generateSummary);
router.post('/sessions/:sessionId/export-to-sheets', authenticateToken, exportToGoogleSheets);

export default router;
