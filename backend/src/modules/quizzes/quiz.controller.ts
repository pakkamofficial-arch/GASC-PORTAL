import { Response } from 'express';
import { z } from 'zod';
import { Quiz, QuizAttempt, Student, Faculty } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';

const CreateQuizSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  subjectId: z.string().min(1),
  departmentId: z.string().min(1),
  semester: z.number().min(1).max(8),
  timeLimitMinutes: z.number().positive().default(15),
  questions: z.array(
    z.object({
      questionText: z.string().min(3),
      options: z.array(z.string()).min(2),
      correctOptionIndex: z.number().min(0),
      explanation: z.string().optional(),
    })
  ).min(1),
});

const SubmitQuizSchema = z.object({
  selectedAnswers: z.array(z.number()),
});

export const createQuiz = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateQuizSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  let facultyId = undefined;
  if (req.user!.role === 'FACULTY') {
    const faculty = await Faculty.findOne({ userId: req.user!.userId });
    facultyId = faculty?._id;
  }

  const quiz = await Quiz.create({
    ...parsed.data,
    facultyId,
  });

  sendSuccess(res, quiz, 'Quiz created successfully', 201);
};

export const getQuizzes = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user!.role === 'STUDENT') {
      const student = await Student.findOne({ userId: req.user!.userId });
      if (student) {
        filter.departmentId = student.departmentId;
        filter.semester = student.currentSemester;
      }
    }

    const quizzes = await Quiz.find(filter)
      .select('title description subjectId departmentId semester timeLimitMinutes questions.length isAIGenerated createdAt')
      .populate('subjectId', 'title code')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { quizzes }, 'Quizzes retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Start quiz attempt: Returns questions WITHOUT correct answer indices
export const getQuizForAttempt = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id).populate('subjectId', 'title code').lean();

    if (!quiz) {
      sendError(res, 'Quiz not found', 404);
      return;
    }

    // Mask the correct options & explanations
    const safeQuestions = quiz.questions.map((q, idx) => ({
      index: idx,
      questionText: q.questionText,
      options: q.options,
    }));

    sendSuccess(
      res,
      {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        subject: quiz.subjectId,
        timeLimitMinutes: quiz.timeLimitMinutes,
        questions: safeQuestions,
      },
      'Quiz questions loaded'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Submit quiz and calculate score
export const submitQuizAttempt = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const parsed = SubmitQuizSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const student = await Student.findOne({ userId: req.user!.userId });
  if (!student) {
    sendError(res, 'Student profile not found', 404);
    return;
  }

  const quiz = await Quiz.findById(id);
  if (!quiz) {
    sendError(res, 'Quiz not found', 404);
    return;
  }

  const { selectedAnswers } = parsed.data;
  let score = 0;
  const review = quiz.questions.map((q, idx) => {
    const selected = selectedAnswers[idx];
    const isCorrect = selected === q.correctOptionIndex;
    if (isCorrect) score++;

    return {
      questionText: q.questionText,
      options: q.options,
      selectedAnswer: selected,
      correctOptionIndex: q.correctOptionIndex,
      isCorrect,
      explanation: q.explanation || 'Refer course material for explanation',
    };
  });

  const percentage = Math.round((score / quiz.questions.length) * 100);

  const attempt = await QuizAttempt.create({
    quizId: quiz._id,
    studentId: student._id,
    score,
    totalQuestions: quiz.questions.length,
    percentage,
    selectedAnswers,
    startedAt: new Date(Date.now() - 10 * 60 * 1000),
    completedAt: new Date(),
  });

  sendSuccess(
    res,
    {
      attemptId: attempt._id,
      score,
      totalQuestions: quiz.questions.length,
      percentage,
      review,
    },
    'Quiz evaluated successfully'
  );
};
