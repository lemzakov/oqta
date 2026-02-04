import { Router } from 'express';
import multer from 'multer';
import { listDocuments, uploadDocument, deleteDocument } from '../controllers/knowledgeController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept text-based files
    const allowedMimeTypes = [
      'text/plain',
      'text/markdown',
      'text/html',
      'text/csv',
      'application/pdf',
      'application/json',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text-based files are allowed.'));
    }
  },
});

router.get('/documents', authenticateToken, listDocuments);
router.post('/documents', authenticateToken, upload.single('file'), uploadDocument);
router.delete('/documents/:id', authenticateToken, deleteDocument);

export default router;
