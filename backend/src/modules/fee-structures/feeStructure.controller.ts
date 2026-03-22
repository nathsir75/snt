import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { feeStructureService } from './feeStructure.service';

const ERROR_MAP: Record<string, [number, string]> = {
  COURSE_NOT_FOUND:         [404, 'Course not found'],
  FEE_STRUCTURE_NOT_FOUND:  [404, 'Fee structure not found'],
  INVALID_AMOUNT:           [400, 'amount must be greater than 0'],
  INVALID_REGISTRATION_FEE: [400, 'registrationFee cannot be negative'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const feeStructureController = {
  createFeeStructure: async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId, amount, registrationFee, effectiveFrom } = req.body;
      if (!courseId || amount === undefined) {
        res.status(400).json({ error: 'courseId and amount are required' });
        return;
      }
      const fs = await feeStructureService.createFeeStructure({ courseId, amount, registrationFee, effectiveFrom });
      res.status(201).json(fs);
    } catch (error: any) {
      console.error('[FeeStructures] createFeeStructure error:', error.message);
      handleError(res, error);
    }
  },

  getAllFeeStructures: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const list = await feeStructureService.getAllFeeStructures(req.user!);
      res.json(list);
    } catch (error: any) {
      console.error('[FeeStructures] getAllFeeStructures error:', error.message);
      handleError(res, error);
    }
  },

  getFeeStructuresByCourse: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const courseId = parseInt(req.params.courseId);
      if (isNaN(courseId)) { res.status(400).json({ error: 'Invalid course id' }); return; }
      const list = await feeStructureService.getFeeStructuresByCourse(courseId, req.user!);
      res.json(list);
    } catch (error: any) {
      console.error('[FeeStructures] getFeeStructuresByCourse error:', error.message);
      handleError(res, error);
    }
  },

  updateFeeStructure: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid fee structure id' }); return; }
      const { amount, registrationFee, isActive, effectiveFrom } = req.body;
      const fs = await feeStructureService.updateFeeStructure(id, { amount, registrationFee, isActive, effectiveFrom });
      res.json(fs);
    } catch (error: any) {
      console.error('[FeeStructures] updateFeeStructure error:', error.message);
      handleError(res, error);
    }
  },
};
