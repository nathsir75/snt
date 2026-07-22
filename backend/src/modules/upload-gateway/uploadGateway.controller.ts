import { Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { AuthRequest } from '../../common/types';
import { uploadGatewayService } from './uploadGateway.service';
import { getMaxUploadBytes } from '../../common/utils/file.util';
import {
  UPLOAD_CATEGORIES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIMES,
  UploadCategory,
} from '../../common/constants/upload.constants';
import path from 'path';

// ─── Error map ────────────────────────────────────────────────────────────────

const ERROR_MAP: Record<string, [number, string]> = {
  ASSET_NOT_FOUND:            [404, 'Media asset not found'],
  BRANCH_NOT_FOUND:           [404, 'Branch not found'],
  ACCESS_DENIED:              [403, 'Access denied to this resource'],
  GLOBAL_UPLOAD_FORBIDDEN:    [403, 'branch_admin cannot upload global files'],
  INVALID_OWNER_SCOPE:        [400, 'Invalid ownerScope — must be global or branch'],
  INVALID_UPLOAD_CATEGORY:    [400, `Invalid uploadCategory — must be one of: ${UPLOAD_CATEGORIES.join(', ')}`],
  UNSUPPORTED_FILE_EXTENSION: [400, 'Unsupported file extension for the given category'],
  UNSUPPORTED_MIME_TYPE:      [400, 'Unsupported MIME type for the given category'],
  BRANCH_REQUIRED_FOR_SCOPE:  [400, 'branchId is required when ownerScope is branch'],
  NOT_LOCAL_ASSET:            [400, 'This operation is only available for locally stored assets'],
  PATH_TRAVERSAL_DETECTED:    [400, 'Invalid file path detected'],
  INVALID_OR_EXPIRED_TOKEN:   [401, 'Invalid or expired secure-view token'],
  CONTENT_ITEM_NOT_FOUND:     [404, 'Content item not found'],
  SECURE_VIEW_UNSUPPORTED_TYPE: [415, 'Secure view is available only for PDF/PPT files'],
  PPTX_CONVERSION_FAILED:     [500, 'Failed to convert PPTX to PDF'],
  FILE_TOO_LARGE:             [413, `File exceeds maximum allowed size`],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  // Multer size limit error
  if (message === 'LIMIT_FILE_SIZE' || (err as { code?: string })?.code === 'LIMIT_FILE_SIZE') {
    const mb = Math.round(getMaxUploadBytes() / 1024 / 1024);
    res.status(413).json({ error: `File exceeds maximum allowed size of ${mb}MB` });
    return;
  }
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[UploadGatewayController] Error: ${message}`);
  res.status(status).json({ error: text });
}

// ─── Multer configuration ─────────────────────────────────────────────────────
// Use memoryStorage — service writes to disk after scope/type validation

function buildFileFilter() {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Accept if extension is in ANY category's allowed list — full validation in service
    const allExts = (Object.values(ALLOWED_EXTENSIONS) as string[][]).flat();
    const allMimes = (Object.values(ALLOWED_MIMES) as string[][]).flat();

    if (!allExts.includes(ext) || !allMimes.includes(file.mimetype)) {
      cb(new Error('UNSUPPORTED_FILE_EXTENSION'));
      return;
    }
    cb(null, true);
  };
}

export const upload = multer({
  storage:    multer.memoryStorage(),
  limits:     { fileSize: getMaxUploadBytes() },
  fileFilter: buildFileFilter(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const uploadGatewayController = {

  // GET /api/v1/upload-gateway/secure-view?token=...
  secureView: async (req: Request, res: Response): Promise<void> => {
    try {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      if (!token) { res.status(400).json({ error: 'token is required' }); return; }

      const file = await uploadGatewayService.resolveSecureView(token);
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.filename.replace(/"/g, '')}"`);
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
      res.sendFile(file.absolutePath);
    } catch (err) { handleError(res, err); }
  },

  // POST /api/v1/upload-gateway/file
  uploadFile: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) { res.status(400).json({ error: 'No file provided' }); return; }

      const {
        title, description, uploadCategory, ownerScope, branchId, tagsJson,
      } = req.body as {
        title?: string; description?: string; uploadCategory: string;
        ownerScope: string; branchId?: string; tagsJson?: string;
      };

      if (!uploadCategory || !ownerScope) {
        res.status(400).json({ error: 'uploadCategory and ownerScope are required' }); return;
      }

      const result = await uploadGatewayService.uploadFile(req.user!, req.file, {
        title,
        description,
        uploadCategory,
        ownerScope,
        branchId: branchId ? parseInt(branchId, 10) : undefined,
        tagsJson,
      });

      res.status(201).json(result);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/upload-gateway/my-files
  listMyFiles: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { mediaType, ownerScope, search } = req.query as Record<string, string>;
      const data = await uploadGatewayService.listMyFiles(req.user!, { mediaType, ownerScope, search });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // DELETE /api/v1/upload-gateway/file/:mediaAssetId
  deleteFile: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.mediaAssetId, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid mediaAssetId' }); return; }
      const data = await uploadGatewayService.deleteFile(id, req.user!);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // PATCH /api/v1/upload-gateway/file/:mediaAssetId/replace
  replaceFile: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) { res.status(400).json({ error: 'No file provided' }); return; }
      const id = parseInt(req.params.mediaAssetId, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid mediaAssetId' }); return; }
      const { uploadCategory } = req.body as { uploadCategory: string };
      if (!uploadCategory) { res.status(400).json({ error: 'uploadCategory is required' }); return; }
      const data = await uploadGatewayService.replaceFile(id, req.user!, req.file, uploadCategory);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },
};
