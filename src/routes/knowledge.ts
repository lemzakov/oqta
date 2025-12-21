import { Router } from 'express';
import { listDocuments, uploadDocument, deleteDocument } from '../controllers/knowledgeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/documents', authenticateToken, listDocuments);
router.post('/documents', authenticateToken, uploadDocument);
router.delete('/documents/:id', authenticateToken, deleteDocument);

export default router;
