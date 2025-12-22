import express from 'express';
import {
  getFreeZones,
  getFreeZone,
  createFreeZone,
  updateFreeZone,
  deleteFreeZone,
} from '../controllers/freeZonesController.js';

const router = express.Router();

router.get('/', getFreeZones);
router.get('/:id', getFreeZone);
router.post('/', createFreeZone);
router.put('/:id', updateFreeZone);
router.delete('/:id', deleteFreeZone);

export default router;
