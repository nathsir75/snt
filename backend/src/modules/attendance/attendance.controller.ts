import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { attendanceService } from './attendance.service';

const ERROR_MAP: Record<string, [number, string]> = {
  BATCH_NOT_FOUND:           [404, 'Batch not found'],
  STUDENT_NOT_FOUND:         [404, 'Student not found'],
  STUDENT_RECORD_NOT_FOUND:  [404, 'Student record not found for this account'],
  ACCESS_DENIED:             [403, 'Access denied. This batch does not belong to your branch'],
  ENTRIES_REQUIRED:          [400, 'entries array cannot be empty'],
  INVALID_STATUS:            [400, 'status must be one of: present, absent, leave'],
  STUDENT_NOT_IN_BATCH:      [400, 'One or more students are not assigned to this batch'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const attendanceController = {
  markAttendance: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { batchId, attendanceDate, entries } = req.body;
      if (!batchId || !attendanceDate || !entries) {
        res.status(400).json({ error: 'batchId, attendanceDate and entries are required' });
        return;
      }
      const summary = await attendanceService.markAttendance(req.user!, { batchId, attendanceDate, entries });
      res.status(201).json(summary);
    } catch (error: any) {
      console.error('[Attendance] markAttendance error:', error.message);
      handleError(res, error);
    }
  },

  getByBatch: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = parseInt(req.params.batchId);
      if (isNaN(batchId)) { res.status(400).json({ error: 'Invalid batch id' }); return; }
      const date = req.query.date as string | undefined;
      const records = await attendanceService.getByBatch(batchId, req.user!, date);
      res.json(records);
    } catch (error: any) {
      console.error('[Attendance] getByBatch error:', error.message);
      handleError(res, error);
    }
  },

  getByStudent: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (isNaN(studentId)) { res.status(400).json({ error: 'Invalid student id' }); return; }
      const result = await attendanceService.getByStudent(studentId, req.user!);
      res.json(result);
    } catch (error: any) {
      console.error('[Attendance] getByStudent error:', error.message);
      handleError(res, error);
    }
  },

  getBatchSummary: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = parseInt(req.params.batchId);
      if (isNaN(batchId)) { res.status(400).json({ error: 'Invalid batch id' }); return; }
      const summary = await attendanceService.getBatchSummary(batchId, req.user!);
      res.json(summary);
    } catch (error: any) {
      console.error('[Attendance] getBatchSummary error:', error.message);
      handleError(res, error);
    }
  },

  getMyAttendance: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await attendanceService.getMyAttendance(req.user!);
      res.json(result);
    } catch (error: any) {
      console.error('[Attendance] getMyAttendance error:', error.message);
      handleError(res, error);
    }
  },
};
