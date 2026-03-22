import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { scheduleService } from './schedule.service';

const ERROR_MAP: Record<string, [number, string]> = {
  BATCH_NOT_FOUND:      [404, 'Batch not found'],
  SCHEDULE_NOT_FOUND:   [404, 'Schedule not found'],
  ACCESS_DENIED:        [403, 'Access denied. This batch does not belong to your branch'],
  INVALID_DAY_OF_WEEK:  [400, 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)'],
  INVALID_TIME_FORMAT:  [400, 'startTime and endTime must be in HH:MM format'],
  INVALID_TIME_RANGE:   [400, 'startTime must be before endTime'],
  DUPLICATE_SCHEDULE:   [409, 'A schedule slot already exists for this batch, day and start time'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const scheduleController = {
  createSchedule: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { batchId, dayOfWeek, startTime, endTime, room } = req.body;
      if (!batchId || dayOfWeek === undefined || !startTime || !endTime) {
        res.status(400).json({ error: 'batchId, dayOfWeek, startTime and endTime are required' });
        return;
      }
      const schedule = await scheduleService.createSchedule(req.user!, { batchId, dayOfWeek, startTime, endTime, room });
      res.status(201).json(schedule);
    } catch (error: any) {
      console.error('[Schedules] createSchedule error:', error.message);
      handleError(res, error);
    }
  },

  getSchedulesByBatch: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = parseInt(req.params.batchId);
      if (isNaN(batchId)) { res.status(400).json({ error: 'Invalid batch id' }); return; }
      const schedules = await scheduleService.getSchedulesByBatch(batchId, req.user!);
      res.json(schedules);
    } catch (error: any) {
      console.error('[Schedules] getSchedulesByBatch error:', error.message);
      handleError(res, error);
    }
  },

  updateSchedule: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid schedule id' }); return; }
      const { startTime, endTime, room } = req.body;
      const schedule = await scheduleService.updateSchedule(id, req.user!, { startTime, endTime, room });
      res.json(schedule);
    } catch (error: any) {
      console.error('[Schedules] updateSchedule error:', error.message);
      handleError(res, error);
    }
  },

  deleteSchedule: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid schedule id' }); return; }
      const result = await scheduleService.deleteSchedule(id, req.user!);
      res.json(result);
    } catch (error: any) {
      console.error('[Schedules] deleteSchedule error:', error.message);
      handleError(res, error);
    }
  },
};
