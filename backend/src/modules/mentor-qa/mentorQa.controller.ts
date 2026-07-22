import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { mentorQaService } from './mentorQa.service';

const ERROR_MAP: Record<string, [number, string]> = {
  STUDENT_RECORD_NOT_FOUND:  [404, 'Student record not found for this account'],
  LIVE_SESSION_NOT_FOUND:    [404, 'Live session not found'],
  MENTOR_QUESTION_NOT_FOUND: [404, 'Question not found'],
  BATCH_MEMBERSHIP_REQUIRED: [403, 'Access denied. Student is not enrolled in this batch'],
  TEACHER_NOT_ASSIGNED:      [403, 'Access denied. Teacher is not assigned to this batch'],
  ACCESS_DENIED:             [403, 'Access denied'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ message });
}

function parsePositiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseNonEmptyText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

export const mentorQaController = {
  createQuestion: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const liveSessionId = parsePositiveId(req.body.liveSessionId);
      const questionText = parseNonEmptyText(req.body.questionText);

      if (!liveSessionId) {
        res.status(400).json({ message: 'liveSessionId must be a positive integer' });
        return;
      }
      if (!questionText) {
        res.status(400).json({ message: 'questionText is required' });
        return;
      }

      const question = await mentorQaService.createQuestion(req.user!, { liveSessionId, questionText });
      res.status(201).json(question);
    } catch (error: any) {
      console.error('[MentorQA] createQuestion error:', error.message);
      handleError(res, error);
    }
  },

  listQuestions: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const liveSessionId = parsePositiveId(req.query.liveSessionId);
      if (!liveSessionId) {
        res.status(400).json({ message: 'liveSessionId query param must be a positive integer' });
        return;
      }

      const questions = await mentorQaService.listQuestions(req.user!, liveSessionId);
      res.json(questions);
    } catch (error: any) {
      console.error('[MentorQA] listQuestions error:', error.message);
      handleError(res, error);
    }
  },

  answerQuestion: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const questionId = parsePositiveId(req.params.id);
      const answerText = parseNonEmptyText(req.body.answerText);

      if (!questionId) {
        res.status(400).json({ message: 'Invalid question id' });
        return;
      }
      if (!answerText) {
        res.status(400).json({ message: 'answerText is required' });
        return;
      }

      const question = await mentorQaService.answerQuestion(req.user!, questionId, answerText);
      res.json(question);
    } catch (error: any) {
      console.error('[MentorQA] answerQuestion error:', error.message);
      handleError(res, error);
    }
  },
};
