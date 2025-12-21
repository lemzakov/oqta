import { Router } from 'express';
import { getSessions, getSessionMessages } from '../controllers/conversationsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/sessions', authenticateToken, getSessions);
router.get('/sessions/:sessionId', authenticateToken, getSessionMessages);

export default router;
