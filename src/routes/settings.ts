import { Router } from 'express';
import { getSettings, updateSetting, updateSettings } from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, getSettings);
router.put('/', authenticateToken, updateSettings);
router.put('/:key', authenticateToken, updateSetting);

export default router;
