import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth';
import { ChatController } from './chat.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// All chat routes require verified authentication
router.use(authenticate);

// Conversations
router.get('/conversations', ChatController.getConversations);
router.get('/conversations/:id/messages', ChatController.getMessages);
router.post('/conversations/:id/messages', ChatController.postMessage);

// Secure Attachments
router.post('/conversations/:id/attachments', upload.single('file'), ChatController.uploadAttachment);
router.get('/conversations/:id/attachments/:attachmentId', ChatController.downloadAttachment);

// Public Key & E2EE Management
router.post('/public-key', ChatController.registerPublicKey);
router.get('/users/:userId/public-key', ChatController.getUserPublicKey);

// Group Key Envelopes
router.post('/conversations/:id/group-key', ChatController.storeGroupKey);
router.get('/conversations/:id/group-key', ChatController.getGroupKey);

export default router;
