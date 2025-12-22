import express from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  linkSessionToCustomer,
  unlinkSessionFromCustomer,
} from '../controllers/customersController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Protect all customer routes with admin authentication
router.use(authenticateAdmin);

router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/link-session', linkSessionToCustomer);
router.delete('/sessions/:id', unlinkSessionFromCustomer);

export default router;
