import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { generalApiLimiter } from './middleware/rateLimiter';
import { attachRequestId } from './middleware/requestId';
import { sanitizeNoSql } from './middleware/sanitize';
import mongoose from 'mongoose';

// Import route modules
import authRoutes from './modules/auth/auth.routes';
import studentRoutes from './modules/students/student.routes';
import facultyRoutes from './modules/faculty/faculty.routes';
import adminRoutes from './modules/admin/admin.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import assessmentRoutes from './modules/assessments/assessment.routes';
import timetableRoutes from './modules/timetable/timetable.routes';
import certificateRoutes from './modules/certificates/certificate.routes';
import idCardRoutes from './modules/idcards/idcard.routes';
import paymentRoutes from './modules/payments/payment.routes';
import assignmentRoutes from './modules/assignments/assignment.routes';
import quizRoutes from './modules/quizzes/quiz.routes';
import aiRoutes from './modules/ai/ai.routes';
import noticeRoutes from './modules/notices/notice.routes';
import reportRoutes from './modules/reports/report.routes';
import materialRoutes from './modules/materials/material.routes';
import academicRoutes from './modules/academic/academic.routes';
import complaintRoutes from './modules/complaints/complaint.routes';
import eventRoutes from './modules/events/event.routes';
import hodRoutes from './modules/hod/hod.routes';
import chatRoutes from './modules/chat/chat.routes';

export const createApp = (): Application => {
  const app: Application = express();

  // Security and utilities middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Attach request ID and sanitize NoSQL injection
  app.use(attachRequestId);
  app.use(sanitizeNoSql);

  // General API rate limiter
  app.use('/api/', generalApiLimiter);

  // Health and readiness check endpoint (validates real database connection)
  const healthHandler = (_req: Request, res: Response) => {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      res.status(503).json({
        status: 'DEGRADED',
        database: 'DISCONNECTED',
        app: 'Government College Connect API',
        institution: config.college.name,
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        error: 'Database connection is not ready. Service is temporarily degraded.',
      });
      return;
    }

    res.status(200).json({
      status: 'HEALTHY',
      database: 'CONNECTED',
      app: 'Government College Connect API',
      institution: config.college.name,
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    });
  };

  // Root and API status endpoints (provides safe, public service discovery)
  const rootHandler = (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      app: 'Government College Connect API',
      institution: config.college.name,
      status: 'ONLINE',
      version: '1.0.0',
      apiPrefix: config.apiPrefix,
      healthEndpoint: `${config.apiPrefix}/health`,
    });
  };

  app.get('/', rootHandler);
  app.get(config.apiPrefix, rootHandler);

  app.get('/health', healthHandler);
  app.get(`${config.apiPrefix}/health`, healthHandler);

  // Mount API modules
  const api = config.apiPrefix;
  app.use(`${api}/auth`, authRoutes);
  app.use(`${api}/students`, studentRoutes);
  app.use(`${api}/faculty`, facultyRoutes);
  app.use(`${api}/admin`, adminRoutes);
  app.use(`${api}/attendance`, attendanceRoutes);
  app.use(`${api}/assessments`, assessmentRoutes);
  app.use(`${api}/timetable`, timetableRoutes);
  app.use(`${api}/certificates`, certificateRoutes);
  app.use(`${api}/idcards`, idCardRoutes);
  app.use(`${api}/payments`, paymentRoutes);
  app.use(`${api}/assignments`, assignmentRoutes);
  app.use(`${api}/quizzes`, quizRoutes);
  app.use(`${api}/ai`, aiRoutes);
  app.use(`${api}/notices`, noticeRoutes);
  app.use(`${api}/reports`, reportRoutes);
  app.use(`${api}/materials`, materialRoutes);
  app.use(`${api}/academic`, academicRoutes);
  app.use(`${api}/complaints`, complaintRoutes);
  app.use(`${api}/events`, eventRoutes);
  app.use(`${api}/hod`, hodRoutes);
  app.use(`${api}/chat`, chatRoutes);

  // 404 handler
  app.use('*', (_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'The requested API endpoint was not found on this server.',
    });
  });

  // Centralized Error handling
  app.use(errorHandler);

  return app;
};
