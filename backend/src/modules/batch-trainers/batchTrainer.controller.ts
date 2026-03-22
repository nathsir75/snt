import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { batchTrainerService } from './batchTrainer.service';

const ERROR_MAP: Record<string, [number, string]> = {
  BATCH_NOT_FOUND:   [404, 'Batch not found'],
  TRAINER_NOT_FOUND: [404, 'Trainer not found'],
  ACCESS_DENIED:     [403, 'Access denied. This batch does not belong to your branch'],
  BRANCH_MISMATCH:   [400, 'Trainer and batch must belong to the same branch'],
  TRAINER_INACTIVE:  [400, 'Cannot assign an inactive trainer'],
  ALREADY_ASSIGNED:  [409, 'Trainer is already assigned to this batch'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const batchTrainerController = {
  assignTrainer: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { batchId, trainerId, isPrimary } = req.body;
      if (!batchId || !trainerId) {
        res.status(400).json({ error: 'batchId and trainerId are required' });
        return;
      }
      const assignment = await batchTrainerService.assignTrainer(req.user!, { batchId, trainerId, isPrimary });
      res.status(201).json(assignment);
    } catch (error: any) {
      console.error('[BatchTrainers] assignTrainer error:', error.message);
      handleError(res, error);
    }
  },

  getTrainersByBatch: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = parseInt(req.params.batchId);
      if (isNaN(batchId)) { res.status(400).json({ error: 'Invalid batch id' }); return; }
      const trainers = await batchTrainerService.getTrainersByBatch(batchId, req.user!);
      res.json(trainers);
    } catch (error: any) {
      console.error('[BatchTrainers] getTrainersByBatch error:', error.message);
      handleError(res, error);
    }
  },

  getBatchesByTrainer: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const trainerId = parseInt(req.params.trainerId);
      if (isNaN(trainerId)) { res.status(400).json({ error: 'Invalid trainer id' }); return; }
      const batches = await batchTrainerService.getBatchesByTrainer(trainerId, req.user!);
      res.json(batches);
    } catch (error: any) {
      console.error('[BatchTrainers] getBatchesByTrainer error:', error.message);
      handleError(res, error);
    }
  },
};
