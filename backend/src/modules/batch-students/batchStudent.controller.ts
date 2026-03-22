import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { batchStudentService } from './batchStudent.service';

const ERROR_MAP: Record<string, [number, string]> = {
  BATCH_NOT_FOUND:      [404, 'Batch not found'],
  STUDENT_NOT_FOUND:    [404, 'Student not found'],
  ASSIGNMENT_NOT_FOUND: [404, 'Batch assignment not found'],
  ACCESS_DENIED:        [403, 'Access denied. This batch does not belong to your branch'],
  BRANCH_MISMATCH:      [400, 'Student and batch must belong to the same branch'],
  ALREADY_ASSIGNED:     [409, 'Student is already assigned to this batch'],
  CAPACITY_EXCEEDED:    [400, 'Batch has reached its maximum capacity'],
  INVALID_STATUS:       [400, 'status must be one of: active, completed, dropped'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const batchStudentController = {
  assignStudent: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { batchId, studentId } = req.body;
      if (!batchId || !studentId) {
        res.status(400).json({ error: 'batchId and studentId are required' });
        return;
      }
      const assignment = await batchStudentService.assignStudent(req.user!, { batchId, studentId });
      res.status(201).json(assignment);
    } catch (error: any) {
      console.error('[BatchStudents] assignStudent error:', error.message);
      handleError(res, error);
    }
  },

  getStudentsByBatch: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = parseInt(req.params.batchId);
      if (isNaN(batchId)) { res.status(400).json({ error: 'Invalid batch id' }); return; }
      const students = await batchStudentService.getStudentsByBatch(batchId, req.user!);
      res.json(students);
    } catch (error: any) {
      console.error('[BatchStudents] getStudentsByBatch error:', error.message);
      handleError(res, error);
    }
  },

  getBatchesByStudent: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (isNaN(studentId)) { res.status(400).json({ error: 'Invalid student id' }); return; }
      const batches = await batchStudentService.getBatchesByStudent(studentId, req.user!);
      res.json(batches);
    } catch (error: any) {
      console.error('[BatchStudents] getBatchesByStudent error:', error.message);
      handleError(res, error);
    }
  },

  updateStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid assignment id' }); return; }
      const { status } = req.body;
      if (!status) { res.status(400).json({ error: 'status is required' }); return; }
      const updated = await batchStudentService.updateStatus(id, req.user!, status);
      res.json(updated);
    } catch (error: any) {
      console.error('[BatchStudents] updateStatus error:', error.message);
      handleError(res, error);
    }
  },
};
