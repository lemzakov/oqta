import express from 'express';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  sendInvoice,
  deleteInvoice,
} from '../controllers/billingController.js';

const router = express.Router();

router.get('/', getInvoices);
router.get('/:id', getInvoice);
router.post('/', createInvoice);
router.put('/:id', updateInvoice);
router.post('/:id/send', sendInvoice);
router.delete('/:id', deleteInvoice);

export default router;
