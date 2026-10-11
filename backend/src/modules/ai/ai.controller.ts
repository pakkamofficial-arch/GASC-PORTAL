import { Response } from 'express';
import { z } from 'zod';
import { AIService } from './ai.service';
import { AIUsageRecord } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { GASC_APP_METADATA } from './knowledge/gasc-knowledge-base';
import { config } from '../../config';

const AssistantQuerySchema = z.object({
  prompt: z.string().min(2, 'Please enter a valid question or topic'),
  language: z.enum(['ENGLISH', 'TAMIL', 'BILATERAL']).default('BILATERAL'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXAM_PREP']).default('EXAM_PREP'),
});

const NotesQuerySchema = z.object({
  topic: z.string().min(2),
  subjectTitle: z.string().min(2),
});

const QuizGenSchema = z.object({
  topic: z.string().min(2),
});

const CareerQuerySchema = z.object({
  degree: z.string().min(2),
  interests: z.string().optional().default('General'),
});

const ChatQuerySchema = z.object({
  message: z.string().min(1, 'Please enter a question or topic').max(1000, 'Message cannot exceed 1000 characters'),
});

export const chatWithAssistant = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = ChatQuerySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const result = await AIService.handleCollegeChat(req.user!, parsed.data.message);

  await AIUsageRecord.create({
    userId: req.user!.userId,
    feature: 'ASSISTANT',
    promptLength: parsed.data.message.length,
    responseLength: result.response.length,
    status: result.isAiConfigured ? 'SUCCESS' : 'FALLBACK',
  });

  sendSuccess(
    res,
    {
      ...result,
      reply: result.response,
      developerCredit: GASC_APP_METADATA.developerCredit,
    },
    'College assistant response generated'
  );
};

export const getChatHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const history = await AIService.getChatHistory(req.user!.userId);
  sendSuccess(res, { messages: history }, 'Chat history retrieved successfully');
};

export const clearChatHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const cleared = await AIService.clearChatHistory(req.user!.userId);
  sendSuccess(res, { cleared }, 'Chat history cleared successfully');
};

export const getDiagnostics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  sendSuccess(
    res,
    {
      service: 'GASC Connect AI Assistant',
      institution: GASC_APP_METADATA.institution,
      affiliation: GASC_APP_METADATA.affiliation,
      developer: GASC_APP_METADATA.developerName,
      developerCredit: GASC_APP_METADATA.developerCredit,
      aiProviderConfigured: Boolean(config.ai.apiKey && config.ai.apiKey.trim().length > 0),
      aiModel: config.ai.modelName,
      userRole: req.user?.role,
      userIdentifier: req.user?.identifier,
    },
    'AI Assistant diagnostic status'
  );
};

export const queryAssistant = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = AssistantQuerySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const result = await AIService.askAssistant(
    parsed.data.prompt,
    parsed.data.language,
    parsed.data.level
  );

  // Track usage record
  await AIUsageRecord.create({
    userId: req.user!.userId,
    feature: 'ASSISTANT',
    promptLength: parsed.data.prompt.length,
    responseLength: result.response.length,
    status: result.isAiConfigured ? 'SUCCESS' : 'FALLBACK',
  });

  sendSuccess(res, result, 'Assistant response generated');
};

export const generateNotes = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = NotesQuerySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const result = await AIService.generateNotes(parsed.data.topic, parsed.data.subjectTitle);

  await AIUsageRecord.create({
    userId: req.user!.userId,
    feature: 'NOTES',
    promptLength: parsed.data.topic.length,
    responseLength: 500,
    status: result.isAiConfigured ? 'SUCCESS' : 'FALLBACK',
  });

  sendSuccess(res, result, 'Revision notes generated');
};

export const generatePracticeQuiz = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = QuizGenSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const result = await AIService.generatePracticeQuiz(parsed.data.topic);

  await AIUsageRecord.create({
    userId: req.user!.userId,
    feature: 'QUIZ',
    promptLength: parsed.data.topic.length,
    responseLength: 300,
    status: result.isAiConfigured ? 'SUCCESS' : 'FALLBACK',
  });

  sendSuccess(res, result, 'Practice quiz generated');
};

export const getCareerGuidance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CareerQuerySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const result = await AIService.getCareerGuidance(parsed.data.degree, parsed.data.interests);

  await AIUsageRecord.create({
    userId: req.user!.userId,
    feature: 'CAREER',
    promptLength: parsed.data.degree.length,
    responseLength: 400,
    status: result.isAiConfigured ? 'SUCCESS' : 'FALLBACK',
  });

  sendSuccess(res, result, 'Career roadmap generated');
};
