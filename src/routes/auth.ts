import { Router } from 'express';
import { login, logout, verify, getLoginLogs } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loginLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/verify', authenticateToken, verify);
router.get('/login-logs', apiLimiter, authenticateToken, getLoginLogs);

export default router;
