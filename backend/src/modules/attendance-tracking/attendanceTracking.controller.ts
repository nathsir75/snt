import { PlaybackState } from '@prisma/client';
import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { attendanceTrackingService } from './attendanceTracking.service';

const ERROR_MAP: Record<string, [number, string]> = {
  STUDENT_RECORD_NOT_FOUND:  [404, 'Student record not found for this account'],
  LIVE_SESSION_NOT_FOUND:    [404, 'Live session not found'],
  TEACHER_NOT_ASSIGNED:      [403, 'Access denied. Teacher is not assigned to this batch'],
  BATCH_MEMBERSHIP_REQUIRED: [403, 'Access denied. Student is not enrolled in this batch'],
  ACCESS_DENIED:             [403, 'Access denied'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ message });
}

function isPlaybackState(value: unknown): value is PlaybackState {
  return value === PlaybackState.playing || value === PlaybackState.paused;
}

export const attendanceTrackingController = {
  heartbeat: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { liveSessionId, playbackState } = req.body;
      const parsedLiveSessionId = Number(liveSessionId);

      if (!Number.isInteger(parsedLiveSessionId) || parsedLiveSessionId <= 0) {
        res.status(400).json({ message: 'liveSessionId must be a positive integer' });
        return;
      }

      if (!isPlaybackState(playbackState)) {
        res.status(400).json({ message: 'playbackState must be playing or paused' });
        return;
      }

      const heartbeat = await attendanceTrackingService.recordHeartbeat(req.user!, {
        liveSessionId: parsedLiveSessionId,
        playbackState,
      });

      res.status(201).json(heartbeat);
    } catch (error: any) {
      console.error('[AttendanceTracking] heartbeat error:', error.message);
      handleError(res, error);
    }
  },

  getSessionAttendance: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const liveSessionId = Number(req.params.liveSessionId);
      if (!Number.isInteger(liveSessionId) || liveSessionId <= 0) {
        res.status(400).json({ message: 'Invalid live session id' });
        return;
      }

      const result = await attendanceTrackingService.getSessionAttendance(req.user!, liveSessionId);
      res.json(result);
    } catch (error: any) {
      console.error('[AttendanceTracking] getSessionAttendance error:', error.message);
      handleError(res, error);
    }
  },

  getMySessionAttendance: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const liveSessionId = Number(req.params.liveSessionId);
      if (!Number.isInteger(liveSessionId) || liveSessionId <= 0) {
        res.status(400).json({ message: 'Invalid live session id' });
        return;
      }

      const result = await attendanceTrackingService.getMySessionAttendance(req.user!, liveSessionId);
      res.json(result);
    } catch (error: any) {
      console.error('[AttendanceTracking] getMySessionAttendance error:', error.message);
      handleError(res, error);
    }
  },
};
