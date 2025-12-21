import { Router } from 'express';
import { login, logout, verify } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/verify', authenticateToken, verify);

export default router;
