import { Router } from 'express';
import { getSettings, updateSetting, updateSettings, getPublicSettings } from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/public', getPublicSettings); // Public endpoint for contact info
router.get('/', authenticateToken, getSettings);
router.put('/', authenticateToken, updateSettings);
router.put('/:key', authenticateToken, updateSetting);

export default router;
