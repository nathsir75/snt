import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { interviewApplicationService } from './interviewApplication.service';

const ERROR_MAP: Record<string, [number, string]> = {
  STUDENT_NOT_FOUND:          [404, 'Student not found'],
  INTERVIEW_NOT_FOUND:        [404, 'Interview not found'],
  APPLICATION_NOT_FOUND:      [404, 'Application not found'],
  ACCESS_DENIED:              [403, 'Access denied — student belongs to a different branch'],
  DUPLICATE_APPLICATION:      [409, 'Student has already applied to this interview'],
  INVALID_APPLICATION_STATUS: [400, 'status must be one of: applied, shortlisted, rejected, selected'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[InterviewAppController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const interviewApplicationController = {
  apply: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { interviewId, studentId, remarks } = req.body;
      if (!interviewId || !studentId) { res.status(400).json({ error: 'interviewId and studentId are required' }); return; }
      const data = await interviewApplicationService.apply(req.user!, { interviewId: Number(interviewId), studentId: Number(studentId), remarks });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { interviewId, status } = req.query as Record<string, string | undefined>;
      const data = await interviewApplicationService.list(req.user!, {
        interviewId: interviewId ? Number(interviewId) : undefined,
        status,
      });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  updateStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const { status, remarks } = req.body;
      if (!status) { res.status(400).json({ error: 'status is required' }); return; }
      const data = await interviewApplicationService.updateStatus(id, { status, remarks });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },
};
