import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { trainerService } from './trainer.service';

const ERROR_MAP: Record<string, [number, string]> = {
  BRANCH_NOT_FOUND: [404, 'Branch not found'],
  TRAINER_NOT_FOUND:[404, 'Trainer not found'],
  ACCESS_DENIED:    [403, 'Access denied. This trainer does not belong to your branch'],
  EMAIL_TAKEN:      [409, 'A trainer with this email already exists'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const trainerController = {
  createTrainer: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { fullName, email, mobile, specialization, branchId, trainerType } = req.body;
      if (!fullName || !branchId) {
        res.status(400).json({ error: 'fullName and branchId are required' });
        return;
      }
      const trainer = await trainerService.createTrainer(req.user!, { fullName, email, mobile, specialization, branchId, trainerType });
      res.status(201).json(trainer);
    } catch (error: any) {
      console.error('[Trainers] createTrainer error:', error.message);
      handleError(res, error);
    }
  },

  getAllTrainers: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const trainers = await trainerService.getAllTrainers(req.user!);
      res.json(trainers);
    } catch (error: any) {
      console.error('[Trainers] getAllTrainers error:', error.message);
      handleError(res, error);
    }
  },

  getTrainerById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid trainer id' }); return; }
      const trainer = await trainerService.getTrainerById(id, req.user!);
      res.json(trainer);
    } catch (error: any) {
      console.error('[Trainers] getTrainerById error:', error.message);
      handleError(res, error);
    }
  },

  updateTrainer: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid trainer id' }); return; }
      const { fullName, email, mobile, specialization, trainerType, isActive } = req.body;
      const trainer = await trainerService.updateTrainer(id, req.user!, { fullName, email, mobile, specialization, trainerType, isActive });
      res.json(trainer);
    } catch (error: any) {
      console.error('[Trainers] updateTrainer error:', error.message);
      handleError(res, error);
    }
  },
};
