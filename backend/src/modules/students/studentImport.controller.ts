import multer from 'multer';
import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { studentImportService } from './studentImport.service';

export const studentImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, /\.(xlsx|xls)$/i.test(file.originalname)),
});

function batchIdFrom(req: AuthRequest): number | null {
  const value = Number(req.body.batchId);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function handleError(res: Response, error: any): void {
  const message = error?.message ?? 'IMPORT_FAILED';
  const status = message === 'ACCESS_DENIED' ? 403 : message === 'BATCH_NOT_FOUND' ? 404 : 400;
  res.status(status).json({ error: message });
}

export const studentImportController = {
  preview: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = batchIdFrom(req);
      if (!batchId || !req.file) { res.status(400).json({ error: 'batchId and Excel file are required' }); return; }
      res.json(await studentImportService.preview(req.user!, batchId, req.file));
    } catch (error) { handleError(res, error); }
  },
  commit: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = batchIdFrom(req);
      if (!batchId || !req.file) { res.status(400).json({ error: 'batchId and Excel file are required' }); return; }
      res.json(await studentImportService.commit(req.user!, batchId, req.file));
    } catch (error) { handleError(res, error); }
  },
};
