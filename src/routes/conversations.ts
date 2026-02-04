import { Router } from 'express';
import { getSessions, getSessionMessages } from '../controllers/conversationsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/sessions', authenticateToken, getSessions);
router.get('/sessions/:sessionId', authenticateToken, getSessionMessages);

export default router;
