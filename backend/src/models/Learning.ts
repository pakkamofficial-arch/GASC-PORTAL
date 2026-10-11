import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignment extends Document {
  title: string;
  description: string;
  subjectId: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  semester: number;
  section: string;
  dueDate: Date;
  maxMarks: number;
  attachmentUrl?: string;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true },
    section: { type: String, required: true, uppercase: true },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, required: true, default: 10 },
    attachmentUrl: { type: String },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);

export interface ISubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  submissionDate: Date;
  textContent?: string;
  fileUrl?: string;
  marksAwarded?: number;
  feedback?: string;
  status: 'SUBMITTED' | 'EVALUATED' | 'LATE';
  evaluatedBy?: mongoose.Types.ObjectId;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    submissionDate: { type: Date, default: Date.now },
    textContent: { type: String },
    fileUrl: { type: String },
    marksAwarded: { type: Number },
    feedback: { type: String },
    status: { type: String, enum: ['SUBMITTED', 'EVALUATED', 'LATE'], default: 'SUBMITTED' },
    evaluatedBy: { type: Schema.Types.ObjectId, ref: 'Faculty' },
  },
  { timestamps: true }
);

SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);

export interface IQuizQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface IQuiz extends Document {
  title: string;
  description?: string;
  subjectId: mongoose.Types.ObjectId;
  facultyId?: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  semester: number;
  timeLimitMinutes: number;
  questions: IQuizQuestion[];
  isAIGenerated: boolean;
}

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true },
    timeLimitMinutes: { type: Number, required: true, default: 15 },
    questions: [
      {
        questionText: { type: String, required: true },
        options: { type: [String], required: true },
        correctOptionIndex: { type: Number, required: true },
        explanation: { type: String },
      },
    ],
    isAIGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);

export interface IQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  score: number;
  totalQuestions: number;
  percentage: number;
  selectedAnswers: number[]; // Index of option chosen for each question
  startedAt: Date;
  completedAt: Date;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    selectedAnswers: { type: [Number], required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const QuizAttempt = mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
