import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { jobOpeningService } from './jobOpening.service';

const ERROR_MAP: Record<string, [number, string]> = {
  COMPANY_NOT_FOUND:    [404, 'Company not found'],
  JOB_OPENING_NOT_FOUND:[404, 'Job opening not found'],
  INVALID_JOB_STATUS:   [400, 'status must be open or closed'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[JobOpeningController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const jobOpeningController = {
  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { companyId, title, description, requiredSkills, salaryPackage, location } = req.body;
      if (!companyId || !title?.trim()) { res.status(400).json({ error: 'companyId and title are required' }); return; }
      const data = await jobOpeningService.create({ companyId: Number(companyId), title, description, requiredSkills, salaryPackage, location });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { companyId, status } = req.query as Record<string, string | undefined>;
      const data = await jobOpeningService.list({ companyId: companyId ? Number(companyId) : undefined, status });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await jobOpeningService.getById(id);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  updateStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const { status } = req.body;
      if (!status) { res.status(400).json({ error: 'status is required' }); return; }
      const data = await jobOpeningService.updateStatus(id, status);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },
};
