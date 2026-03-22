import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { alertService } from './alert.service';

const ERROR_MAP: Record<string, [number, string]> = {
  ALERT_NOT_FOUND:    [404, 'Alert not found'],
  ACCESS_DENIED:      [403, 'Access denied — alert does not belong to your branch or user'],
  INVALID_ALERT_TYPE: [400, 'type must be one of: followup_due, discount_decision, fee_due, system'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[AlertController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const alertController = {
  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { isRead, type, branchId } = req.query as Record<string, string | undefined>;
      const data = await alertService.list(req.user!, {
        isRead:   isRead !== undefined ? isRead === 'true' : undefined,
        type,
        branchId: branchId ? Number(branchId) : undefined,
      });
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getUnreadCount: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await alertService.getUnreadCount(req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  markRead: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid alert id' }); return; }
      const data = await alertService.markRead(id, req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getSummary: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await alertService.getSummary(req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  generateFollowUpDueAlerts: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await alertService.generateDueFollowUpAlerts();
      console.log(`[AlertController] Follow-up due alerts generated:`, result);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  },

  generateFeeDueAlerts: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await alertService.generateFeeDueAlerts();
      console.log(`[AlertController] Fee due alerts generated:`, result);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
};
