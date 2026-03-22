import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { batchService } from './batch.service';

const ERROR_MAP: Record<string, [number, string]> = {
  COURSE_NOT_FOUND: [404, 'Course not found'],
  BRANCH_NOT_FOUND: [404, 'Branch not found'],
  BATCH_NOT_FOUND:  [404, 'Batch not found'],
  ACCESS_DENIED:    [403, 'Access denied. This batch does not belong to your branch'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ message });
}

export const batchController = {
  getTeacherSummary: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const summary = await batchService.getTeacherSummary(req.user!);
      res.json(summary);
    } catch (error: any) {
      console.error('[Batches] getTeacherSummary error:', error.message);
      handleError(res, error);
    }
  },

  createBatch: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, courseId, branchId, startDate, endDate, schedule, capacity } = req.body;
      console.log('[Batches] CREATE REQUEST PAYLOAD:', req.body);
      if (!name || !courseId || !branchId || !startDate) {
        res.status(400).json({ message: 'name, courseId, branchId and startDate are required' });
        return;
      }
      const batch = await batchService.createBatch(req.user!, { name, courseId, branchId, startDate, endDate, schedule, capacity });
      res.status(201).json(batch);
    } catch (error: any) {
      console.error('[Batches] createBatch error:', error.message);
      handleError(res, error);
    }
  },

  getAllBatches: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log(`[Batches] GET /api/v1/batches — role: ${req.user!.role}`);
      const batches = await batchService.getAllBatches(req.user!);
      res.json(batches);
    } catch (error: any) {
      console.error('[Batches] getAllBatches error:', error.message);
      handleError(res, error);
    }
  },

  getBatchById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid batch id' }); return; }
      const batch = await batchService.getBatchById(id, req.user!);
      res.json(batch);
    } catch (error: any) {
      console.error('[Batches] getBatchById error:', error.message);
      handleError(res, error);
    }
  },

  updateBatch: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid batch id' }); return; }
      const { name, schedule, capacity, endDate, isActive } = req.body;
      const batch = await batchService.updateBatch(id, req.user!, { name, schedule, capacity, endDate, isActive });
      res.json(batch);
    } catch (error: any) {
      console.error('[Batches] updateBatch error:', error.message);
      handleError(res, error);
    }
  },
};
