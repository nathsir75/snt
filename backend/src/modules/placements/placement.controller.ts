import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { placementService } from './placement.service';

const ERROR_MAP: Record<string, [number, string]> = {
  STUDENT_NOT_FOUND:       [404, 'Student not found'],
  COMPANY_NOT_FOUND:       [404, 'Company not found'],
  JOB_OPENING_NOT_FOUND:   [404, 'Job opening not found'],
  PLACEMENT_NOT_FOUND:     [404, 'Placement not found'],
  ACCESS_DENIED:           [403, 'Access denied — placement belongs to a different branch'],
  INVALID_PLACEMENT_STATUS:[400, 'status must be one of: offered, joined, rejected'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[PlacementController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const placementController = {
  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, companyId, jobOpeningId, salaryPackage, joiningDate, status } = req.body;
      if (!studentId || !companyId) { res.status(400).json({ error: 'studentId and companyId are required' }); return; }
      const data = await placementService.create(req.user!, { studentId: Number(studentId), companyId: Number(companyId), jobOpeningId, salaryPackage, joiningDate, status });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status, branchId } = req.query as Record<string, string | undefined>;
      const data = await placementService.list(req.user!, { status, branchId: branchId ? Number(branchId) : undefined });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await placementService.getById(id, req.user!);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  updateStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const { status } = req.body;
      if (!status) { res.status(400).json({ error: 'status is required' }); return; }
      const data = await placementService.updateStatus(id, req.user!, { status });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  getSummary: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await placementService.getSummary(req.user!);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  getPublicSummary: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await placementService.getPublicSummary();
      res.json(data);
    } catch (err) { handleError(res, err); }
  },
};
