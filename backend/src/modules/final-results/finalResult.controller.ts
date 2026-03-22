import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { finalResultService } from './finalResult.service';

const ERROR_MAP: Record<string, [number, string]> = {
  REGISTRATION_NOT_FOUND: [404, 'Final exam registration not found'],
  RESULT_NOT_FOUND:       [404, 'Final exam result not found'],
  ACCESS_DENIED:          [403, 'Access denied — resource belongs to a different branch'],
  DUPLICATE_RESULT:       [409, 'A result has already been published for this registration'],
  INVALID_MARKS:          [400, 'marksObtained must be >= 0'],
  INVALID_MAX_MARKS:      [400, 'maxMarks must be > 0'],
  MARKS_EXCEED_MAX:       [400, 'marksObtained cannot exceed maxMarks'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[FinalResultController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const finalResultController = {
  publish: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { registrationId, marksObtained, maxMarks, remarks } = req.body;
      if (registrationId === undefined || marksObtained === undefined || maxMarks === undefined) {
        res.status(400).json({ error: 'registrationId, marksObtained and maxMarks are required' });
        return;
      }
      const data = await finalResultService.publish(req.user!, {
        registrationId: Number(registrationId),
        marksObtained:  Number(marksObtained),
        maxMarks:       Number(maxMarks),
        remarks,
      });
      res.status(201).json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { resultStatus, branchId } = req.query as Record<string, string | undefined>;
      const data = await finalResultService.list(req.user!, {
        resultStatus,
        branchId: branchId ? Number(branchId) : undefined,
      });
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await finalResultService.getById(id, req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getSummary: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await finalResultService.getSummary(req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },
};
