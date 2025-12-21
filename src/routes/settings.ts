import { Router } from 'express';
import { getSettings, updateSetting, updateSettings } from '../controllers/settingsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getSettings);
router.put('/', authenticateToken, updateSettings);
router.put('/:key', authenticateToken, updateSetting);

export default router;
