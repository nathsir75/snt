import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { dailyQuizService } from './dailyQuiz.service';

const ERROR_MAP: Record<string, [number, string]> = {
  ACCESS_DENIED: [403, 'Access denied'],
  ATTEMPT_IN_PROGRESS: [409, 'Quiz attempt is still in progress'],
  ATTEMPT_NOT_FOUND: [404, 'Quiz attempt not found'],
  BATCH_NOT_FOUND: [404, 'Batch not found'],
  INVALID_ATTEMPT_DURATION: [400, 'Attempt duration must be between 1 and 60 minutes'],
  INVALID_INPUT: [400, 'Please provide valid quiz details'],
  INVALID_QUESTION: [400, 'Please provide valid question details for the selected question type'],
  INVALID_QUESTION_TYPE: [400, 'Question type must be MCQ, True/False, Ordering, or Matching'],
  INVALID_SCHEDULE: [400, 'Please provide valid availability timings'],
  INVALID_WINDOW: [400, 'Availability end must be after availability start'],
  QUIZ_CLOSED: [409, 'Quiz availability has ended'],
  QUIZ_NOT_FOUND: [404, 'Quiz not found'],
  QUIZ_NOT_OPEN: [409, 'Quiz is not open yet'],
  QUESTION_IMAGE_NOT_FOUND: [404, 'Question image not found'],
  STUDENT_RECORD_NOT_FOUND: [404, 'Student record not found'],
  TEACHER_NOT_ASSIGNED: [403, 'Teacher is not assigned to this batch'],
  TOO_MANY_QUESTIONS: [400, 'Daily revision quizzes support up to 15 questions'],
};

function handle(res: Response, err: unknown): void {
  const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, message] = ERROR_MAP[code] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const dailyQuizController = {
  teacherList: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.json(await dailyQuizService.listForTeacher(req.user!)); } catch (err) { handle(res, err); }
  },
  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.status(201).json(await dailyQuizService.create(req.user!, req.body)); } catch (err) { handle(res, err); }
  },
  archive: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.json(await dailyQuizService.archive(req.user!, Number(req.params.id))); } catch (err) { handle(res, err); }
  },
  studentList: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.json(await dailyQuizService.listForStudent(req.user!)); } catch (err) { handle(res, err); }
  },
  start: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.json(await dailyQuizService.start(req.user!, Number(req.params.id))); } catch (err) { handle(res, err); }
  },
  getAttempt: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.json(await dailyQuizService.getAttempt(req.user!, Number(req.params.id))); } catch (err) { handle(res, err); }
  },
  submit: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.json(await dailyQuizService.submit(req.user!, Number(req.params.id), req.body?.answers ?? {})); } catch (err) { handle(res, err); }
  },
  result: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.json(await dailyQuizService.result(req.user!, Number(req.params.id))); } catch (err) { handle(res, err); }
  },
};
