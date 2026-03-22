import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { enquiryFollowUpService } from './enquiryFollowUp.service';

const ERROR_MAP: Record<string, [number, string]> = {
  ENQUIRY_NOT_FOUND:        [404, 'Enquiry not found'],
  ACCESS_DENIED:            [403, 'Access denied — enquiry belongs to a different branch'],
  INVALID_ACTION_TYPE:      [400, 'actionType must be one of: call, whatsapp, email, visit, note'],
  INVALID_STATUS_AFTER_ACTION: [400, 'statusAfterAction must be one of: contacted, follow_up, converted, lost'],
  INVALID_DATE_RANGE:       [400, 'Invalid date range — ensure fromDate <= toDate and dates are valid'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[FollowUpController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const enquiryFollowUpController = {
  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { enquiryId, actionType, remarks, nextFollowUpDate, statusAfterAction } = req.body;
      if (!enquiryId || !actionType || !remarks) {
        res.status(400).json({ error: 'enquiryId, actionType and remarks are required' });
        return;
      }
      const followUp = await enquiryFollowUpService.create(req.user!, {
        enquiryId: Number(enquiryId),
        actionType,
        remarks,
        nextFollowUpDate,
        statusAfterAction,
      });
      res.status(201).json(followUp);
    } catch (err) {
      handleError(res, err);
    }
  },

  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { enquiryId, fromDate, toDate } = req.query as Record<string, string | undefined>;
      const data = await enquiryFollowUpService.list(req.user!, {
        enquiryId: enquiryId ? Number(enquiryId) : undefined,
        fromDate,
        toDate,
      });
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getByEnquiry: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const enquiryId = parseInt(req.params.enquiryId, 10);
      if (isNaN(enquiryId)) { res.status(400).json({ error: 'Invalid enquiryId' }); return; }
      const data = await enquiryFollowUpService.getByEnquiry(enquiryId, req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getDue: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await enquiryFollowUpService.getDue(req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getSummary: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await enquiryFollowUpService.getSummary(req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },
};
