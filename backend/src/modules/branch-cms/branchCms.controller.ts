import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { branchCmsService } from './branchCms.service';

const ERROR_MAP: Record<string, [number, string]> = {
  BRANCH_ID_REQUIRED: [400, 'branchId query param required for Head Office / Global users'],
  NO_BRANCH:          [403, 'User has no branch assigned'],
  ACCESS_DENIED:      [403, 'Access denied'],
};

function handleError(res: Response, err: unknown): void {
  const msg = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[msg] ?? [500, 'Internal server error'];
  console.error(`[BranchCmsController] ${msg}`);
  res.status(status).json({ error: text });
}

export const branchCmsController = {

  // GET /api/v1/branch-cms
  getSettings: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const queryBranchId = req.query.branchId ? parseInt(req.query.branchId as string, 10) : undefined;
      const data = await branchCmsService.getSettings(req.user!, queryBranchId);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // PATCH /api/v1/branch-cms
  updateSettings: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const queryBranchId = req.query.branchId ? parseInt(req.query.branchId as string, 10) : undefined;
      const data = await branchCmsService.updateSettings(req.user!, req.body, queryBranchId);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },
};
