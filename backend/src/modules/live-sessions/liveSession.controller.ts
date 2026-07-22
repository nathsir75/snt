import { LiveSessionType } from '@prisma/client';
import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { liveSessionService } from './liveSession.service';

const ERROR_MAP: Record<string, [number, string]> = {
  BATCH_NOT_FOUND:        [404, 'Batch not found'],
  LIVE_SESSION_NOT_FOUND: [404, 'Live session not found'],
  STUDENT_RECORD_NOT_FOUND: [404, 'Student record not found for this account'],
  ACCESS_DENIED:          [403, 'Access denied. This live session does not belong to your branch'],
  TEACHER_NOT_ASSIGNED:   [403, 'Access denied. Teacher is not assigned to this batch'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ message });
}

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isLiveSessionType(value: unknown): value is LiveSessionType {
  return value === LiveSessionType.live || value === LiveSessionType.recorded;
}

export const liveSessionController = {
  createLiveSession: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { batchId, title, youtubeVideoId, sessionType, scheduledAt, durationMinutes, isActive } = req.body;

      if (!batchId || !title || !youtubeVideoId || !sessionType || !scheduledAt || durationMinutes === undefined) {
        res.status(400).json({ message: 'batchId, title, youtubeVideoId, sessionType, scheduledAt and durationMinutes are required' });
        return;
      }

      if (!isLiveSessionType(sessionType)) {
        res.status(400).json({ message: 'sessionType must be live or recorded' });
        return;
      }

      const parsedBatchId = Number(batchId);
      const parsedDuration = Number(durationMinutes);
      if (!Number.isInteger(parsedBatchId) || parsedBatchId <= 0 || !Number.isInteger(parsedDuration) || parsedDuration <= 0) {
        res.status(400).json({ message: 'batchId and durationMinutes must be positive integers' });
        return;
      }

      const date = new Date(scheduledAt);
      if (Number.isNaN(date.getTime())) {
        res.status(400).json({ message: 'scheduledAt must be a valid date' });
        return;
      }

      const liveSession = await liveSessionService.createLiveSession(req.user!, {
        batchId: parsedBatchId,
        title,
        youtubeVideoId,
        sessionType,
        scheduledAt,
        durationMinutes: parsedDuration,
        isActive,
      });

      res.status(201).json(liveSession);
    } catch (error: any) {
      console.error('[LiveSessions] createLiveSession error:', error.message);
      handleError(res, error);
    }
  },

  getByBatch: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = parseId(req.params.batchId);
      if (!batchId) { res.status(400).json({ error: 'Invalid batch id' }); return; }

      const liveSessions = await liveSessionService.getByBatch(req.user!, batchId);
      res.json(liveSessions);
    } catch (error: any) {
      console.error('[LiveSessions] getByBatch error:', error.message);
      handleError(res, error);
    }
  },

  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseId(req.params.id);
      if (!id) { res.status(400).json({ error: 'Invalid live session id' }); return; }

      const liveSession = await liveSessionService.getById(req.user!, id);
      res.json(liveSession);
    } catch (error: any) {
      console.error('[LiveSessions] getById error:', error.message);
      handleError(res, error);
    }
  },

  getStudentSessions: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const sessions = await liveSessionService.getStudentSessions(req.user!);
      res.json(sessions);
    } catch (error: any) {
      console.error('[LiveSessions] getStudentSessions error:', error.message);
      handleError(res, error);
    }
  },
};
