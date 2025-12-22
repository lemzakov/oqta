import express from 'express';
import {
  getFreeZones,
  getFreeZone,
  createFreeZone,
  updateFreeZone,
  deleteFreeZone,
} from '../controllers/freeZonesController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Protect all free zones routes with admin authentication
router.use(authenticateAdmin);

router.get('/', getFreeZones);
router.get('/:id', getFreeZone);
router.post('/', createFreeZone);
router.put('/:id', updateFreeZone);
router.delete('/:id', deleteFreeZone);

export default router;
