import { Router } from 'express';
import { login, logout, verify } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/verify', authenticateToken, verify);

export default router;
