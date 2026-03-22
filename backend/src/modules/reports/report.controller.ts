import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { reportService } from './report.service';

const ERROR_MAP: Record<string, [number, string]> = {
  ACCESS_DENIED:      [403, 'Access denied to this branch resource'],
  BATCH_NOT_FOUND:    [404, 'Batch not found'],
  INVALID_DATE_RANGE: [400, 'Invalid date range — ensure fromDate <= toDate and dates are valid'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[ReportController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const reportController = {
  getBranchDashboard: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await reportService.getBranchDashboard(req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getOverallDashboard: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await reportService.getOverallDashboard();
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getStudentLifecycle: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await reportService.getStudentLifecycle();
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getAttendanceReport: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = parseInt(req.params.batchId, 10);
      if (isNaN(batchId)) { res.status(400).json({ error: 'Invalid batchId' }); return; }
      const data = await reportService.getAttendanceReport(batchId, req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getFeeCollectionReport: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
      const data = await reportService.getFeeCollectionReport(req.user!, fromDate, toDate);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getEnquiryFunnel: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await reportService.getEnquiryFunnel();
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },
};
