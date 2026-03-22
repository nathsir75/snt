import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { finalExamRegistrationService } from './finalExamRegistration.service';

const ERROR_MAP: Record<string, [number, string]> = {
  REGISTRATION_NOT_FOUND:     [404, 'Final exam registration not found'],
  ACCESS_DENIED:              [403, 'Access denied — registration belongs to a different branch'],
  INVALID_REGISTRATION_STATUS:[400, 'status must be one of: registered, scheduled, completed, absent'],
  HALL_TICKET_DUPLICATE:      [409, 'hallTicketNo is already assigned to another registration'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[FinalExamRegController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const finalExamRegistrationController = {
  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status, branchId } = req.query as Record<string, string | undefined>;
      const data = await finalExamRegistrationService.list(req.user!, {
        status,
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
      const data = await finalExamRegistrationService.getById(id, req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  schedule: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const { examDate, hallTicketNo, status } = req.body;
      const data = await finalExamRegistrationService.schedule(id, { examDate, hallTicketNo, status });
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  getSummary: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = await finalExamRegistrationService.getSummary(req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },
};
