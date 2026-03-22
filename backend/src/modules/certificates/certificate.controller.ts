import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { certificateService } from './certificate.service';

const ERROR_MAP: Record<string, [number, string]> = {
  RESULT_NOT_FOUND:            [404, 'Final exam result not found'],
  CERTIFICATE_NOT_FOUND:       [404, 'Certificate not found'],
  ACCESS_DENIED:               [403, 'Access denied — certificate belongs to a different branch'],
  NOT_ELIGIBLE_FOR_CERTIFICATE:[400, 'Certificate can only be issued for passed results'],
  DUPLICATE_CERTIFICATE:       [409, 'A certificate has already been issued for this result'],
  ALREADY_REVOKED:             [409, 'This certificate has already been revoked'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[CertificateController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const certificateController = {
  issue: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { resultId } = req.body;
      if (!resultId) { res.status(400).json({ error: 'resultId is required' }); return; }
      const data = await certificateService.issue(req.user!, { resultId: Number(resultId) });
      res.status(201).json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status, branchId } = req.query as Record<string, string | undefined>;
      const data = await certificateService.list(req.user!, {
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
      const data = await certificateService.getById(id, req.user!);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  revoke: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const { reason } = req.body;
      if (!reason?.trim()) { res.status(400).json({ error: 'reason is required' }); return; }
      const data = await certificateService.revoke(id, req.user!, reason);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  // No auth — public verification endpoint
  verify: async (req: Request, res: Response): Promise<void> => {
    try {
      const { verificationCode } = req.params;
      const data = await certificateService.verify(verificationCode);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },
};
