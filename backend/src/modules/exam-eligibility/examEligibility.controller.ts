import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { examEligibilityService } from './examEligibility.service';

const ERROR_MAP: Record<string, [number, string]> = {
  STUDENT_NOT_FOUND:        [404, 'Student not found'],
  REQUEST_NOT_FOUND:        [404, 'Eligibility request not found'],
  ACCESS_DENIED:            [403, 'Access denied — resource belongs to a different branch'],
  DUPLICATE_PENDING_REQUEST:[409, 'A pending eligibility request already exists for this student'],
  INVALID_DECISION_STATUS:  [400, 'status must be approved or rejected'],
  ALREADY_DECIDED:          [409, 'This request has already been decided'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[ExamEligibilityController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const examEligibilityController = {
  createRequest: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, internalRemarks } = req.body;
      if (!studentId) { res.status(400).json({ error: 'studentId is required' }); return; }
      const data = await examEligibilityService.createRequest(req.user!, {
        studentId: Number(studentId),
        internalRemarks,
      });
      res.status(201).json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status, studentId } = req.query as Record<string, string | undefined>;
      const data = await examEligibilityService.list(req.user!, {
        status,
        studentId: studentId ? Number(studentId) : undefined,
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
      const data = await examEligibilityService.getById(id, req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  decide: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const { status, decisionRemarks } = req.body;
      if (!status) { res.status(400).json({ error: 'status is required' }); return; }
      const data = await examEligibilityService.decide(id, req.user!, { status, decisionRemarks });
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },
};
