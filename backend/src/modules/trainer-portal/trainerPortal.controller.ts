import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { trainerPortalService } from './trainerPortal.service';

const ERROR_MAP: Record<string, [number, string]> = {
  ACCESS_DENIED: [403, 'Trainer portal access is restricted to trainer accounts'],
  USER_NOT_FOUND: [404, 'User account not found'],
  TRAINER_PROFILE_REQUIRED: [403, 'No linked trainer profile found for this account'],
  TRAINER_INACTIVE: [403, 'This trainer profile is inactive'],
  GLOBAL_TRAINER_REQUIRED: [403, 'Global Trainer Dashboard is available only to global trainers'],
  TEACHER_NOT_ASSIGNED: [403, 'Access denied. This batch is not assigned to this trainer'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const trainerPortalController = {
  getSummary: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const summary = await trainerPortalService.getSummary(req.user!);
      res.json(summary);
    } catch (error: any) {
      console.error('[TrainerPortal] getSummary error:', error.message);
      handleError(res, error);
    }
  },

  getStudentsByBatch: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = parseInt(req.params.batchId);
      if (isNaN(batchId)) {
        res.status(400).json({ error: 'Invalid batch id' });
        return;
      }

      const students = await trainerPortalService.getStudentsByBatch(req.user!, batchId);
      res.json(students);
    } catch (error: any) {
      console.error('[TrainerPortal] getStudentsByBatch error:', error.message);
      handleError(res, error);
    }
  },
};
