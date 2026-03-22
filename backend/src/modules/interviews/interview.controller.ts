import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { interviewService } from './interview.service';

const ERROR_MAP: Record<string, [number, string]> = {
  JOB_OPENING_NOT_FOUND:  [404, 'Job opening not found'],
  JOB_OPENING_CLOSED:     [400, 'Cannot schedule interview for a closed job opening'],
  INTERVIEW_NOT_FOUND:    [404, 'Interview not found'],
  INVALID_INTERVIEW_MODE: [400, 'mode must be online or offline'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[InterviewController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const interviewController = {
  schedule: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { jobOpeningId, interviewDate, mode, location, branchId } = req.body;
      if (!jobOpeningId || !interviewDate || !mode) {
        res.status(400).json({ error: 'jobOpeningId, interviewDate and mode are required' }); return;
      }
      const data = await interviewService.schedule({ jobOpeningId: Number(jobOpeningId), interviewDate, mode, location, branchId });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { jobOpeningId, branchId } = req.query as Record<string, string | undefined>;
      const data = await interviewService.list({
        jobOpeningId: jobOpeningId ? Number(jobOpeningId) : undefined,
        branchId:     branchId    ? Number(branchId)     : undefined,
      });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await interviewService.getById(id);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },
};
