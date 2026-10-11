import { Router } from 'express';
import {
  chatWithAssistant,
  getChatHistory,
  clearChatHistory,
  getDiagnostics,
  queryAssistant,
  generateNotes,
  generatePracticeQuiz,
  getCareerGuidance,
} from './ai.controller';
import { authenticate } from '../../middleware/auth';
import { aiChatLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

// AI Chatbot & Isolated Conversation History
router.post('/chat', aiChatLimiter, chatWithAssistant);
router.get('/chat/history', getChatHistory);
router.delete('/chat/history', clearChatHistory);
router.get('/diagnostics', getDiagnostics);

// Academic Study Centre AI
router.post('/assistant', queryAssistant);
router.post('/notes', generateNotes);
router.post('/quiz', generatePracticeQuiz);
router.post('/career', getCareerGuidance);

export default router;
