import multer from 'multer';
import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { studentImportService } from './studentImport.service';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const EXCEL_EXT_RE = /\.(xlsx|xls)$/i;

export const studentImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMPORT_BYTES },
  fileFilter: (_req, file, callback) => {
    callback(null, EXCEL_EXT_RE.test(file.originalname));
  },
});

function batchIdFrom(req: AuthRequest): number | null {
  const value = Number(req.body.batchId);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function handleError(res: Response, error: any): void {
  const code = error?.message ?? 'IMPORT_FAILED';
  const [status, message] = ERROR_MAP[code] ?? [400, code];
  res.status(status).json({ error: message });
}

const ERROR_MAP: Record<string, [number, string]> = {
  ACCESS_DENIED: [403, 'Only Super Admin can import student credentials'],
  BATCH_NOT_FOUND: [404, 'Selected programme batch was not found'],
  CENTRAL_PROGRAMME_REQUIRED: [400, 'Select an active Head Office central programme batch'],
  EMPTY_FILE: [400, 'Excel file does not contain any rows'],
  INVALID_FILE_TYPE: [400, 'Upload a .xlsx or .xls Excel file'],
  STUDENT_ROLE_NOT_FOUND: [500, 'Student role is missing'],
  NO_VALID_ROWS: [400, 'No valid rows are available to import'],
};

export const studentImportController = {
  preview: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = batchIdFrom(req);
      if (!batchId) { res.status(400).json({ error: 'batchId is required' }); return; }
      if (!req.file) { res.status(400).json({ error: 'Upload a .xlsx or .xls Excel file' }); return; }
      res.json(await studentImportService.preview(req.user!, batchId, req.file));
    } catch (error) {
      handleError(res, error);
    }
  },

  commit: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = batchIdFrom(req);
      if (!batchId) { res.status(400).json({ error: 'batchId is required' }); return; }
      if (!req.file) { res.status(400).json({ error: 'Upload a .xlsx or .xls Excel file' }); return; }
      res.json(await studentImportService.commit(req.user!, batchId, req.file));
    } catch (error) {
      handleError(res, error);
    }
  },
};
