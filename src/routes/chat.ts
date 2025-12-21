import { Router } from 'express';
import { saveMessage } from '../controllers/chatController';

const router = Router();

router.post('/message', saveMessage);

export default router;
