import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { kpiDashboardService } from './kpiDashboard.service';

const ERROR_MAP: Record<string, [number, string]> = {
  BRANCH_NOT_FOUND:   [404, 'Branch not found'],
  ACCESS_DENIED:      [403, 'Access denied'],
  INVALID_MONTHS:     [400, 'Invalid months parameter — must be a number between 1 and 24'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[KpiDashboardController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const kpiDashboardController = {

  getSuperAdminDashboard: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await kpiDashboardService.getSuperAdminDashboard();
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getBranchHealth: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const branchId = req.user!.branchId;
      if (!branchId) {
        res.status(403).json({ error: 'No branch assigned to this user' });
        return;
      }
      const data = await kpiDashboardService.getBranchHealth(branchId);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getBranchRanking: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await kpiDashboardService.getBranchRanking();
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getBranchDetail: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const branchId = parseInt(req.params.branchId, 10);
      if (isNaN(branchId)) { res.status(400).json({ error: 'Invalid branchId' }); return; }
      // branch_admin and counselor may only query their own branch
      const user = req.user!;
      if (user.role !== 'super_admin' && user.branchId !== branchId) {
        res.status(403).json({ error: 'Access denied' }); return;
      }
      const data = await kpiDashboardService.getBranchDetail(branchId);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getSaasControl: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await kpiDashboardService.getSaasControl();
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getMonthlyTrends: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const raw    = req.query.months;
      const months = raw === undefined ? 6 : parseInt(raw as string, 10);
      if (isNaN(months) || months < 1 || months > 24) {
        throw new Error('INVALID_MONTHS');
      }
      const data = await kpiDashboardService.getMonthlyTrends(months);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },
};
