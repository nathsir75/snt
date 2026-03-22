import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { mediaLibraryService } from './mediaLibrary.service';

const ERROR_MAP: Record<string, [number, string]> = {
  ASSET_NOT_FOUND:            [404, 'Media asset not found'],
  BRANCH_NOT_FOUND:           [404, 'Branch not found'],
  ACCESS_DENIED:              [403, 'Access denied to this resource'],
  GLOBAL_ASSET_FORBIDDEN:     [403, 'branch_admin cannot create global assets'],
  FILE_URL_UPDATE_FORBIDDEN:  [403, 'Only super_admin can update fileUrl'],
  INVALID_MEDIA_TYPE:         [400, 'Invalid mediaType — must be one of: image, pdf, ppt, video, document'],
  INVALID_PROVIDER_TYPE:      [400, 'Invalid providerType — must be one of: local, external, youtube, vimeo, r2'],
  INVALID_OWNER_SCOPE:        [400, 'Invalid ownerScope — must be one of: global, branch'],
  INVALID_SCOPE_MAPPING:      [400, 'Global assets must not have a branchId'],
  BRANCH_REQUIRED_FOR_SCOPE:  [400, 'branchId is required when ownerScope is branch'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[MediaLibraryController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const mediaLibraryController = {

  // POST /api/v1/media-library
  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        title, description, mediaType, providerType, fileUrl,
        thumbnailUrl, mimeType, fileSizeKb, ownerScope, branchId, tagsJson,
      } = req.body as {
        title: string; description?: string; mediaType: string; providerType: string;
        fileUrl: string; thumbnailUrl?: string; mimeType?: string; fileSizeKb?: number;
        ownerScope: string; branchId?: number; tagsJson?: unknown;
      };

      if (!title || !mediaType || !providerType || !fileUrl || !ownerScope) {
        res.status(400).json({ error: 'title, mediaType, providerType, fileUrl and ownerScope are required' });
        return;
      }

      const data = await mediaLibraryService.create(req.user!, {
        title, description, mediaType, providerType, fileUrl,
        thumbnailUrl, mimeType, fileSizeKb, ownerScope, branchId, tagsJson,
      });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/media-library
  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { mediaType, providerType, ownerScope, branchId, isActive, search } = req.query as Record<string, string>;
      const data = await mediaLibraryService.list(req.user!, {
        mediaType,
        providerType,
        ownerScope,
        branchId:  branchId  ? parseInt(branchId, 10)  : undefined,
        isActive:  isActive  !== undefined ? isActive === 'true' : undefined,
        search,
      });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/media-library/:id
  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await mediaLibraryService.getById(id, req.user!);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // PATCH /api/v1/media-library/:id
  update: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const { title, description, thumbnailUrl, mimeType, fileSizeKb, tagsJson, isActive, fileUrl } = req.body as Partial<{
        title: string; description: string; thumbnailUrl: string; mimeType: string;
        fileSizeKb: number; tagsJson: unknown; isActive: boolean; fileUrl: string;
      }>;
      const data = await mediaLibraryService.update(id, req.user!, {
        title, description, thumbnailUrl, mimeType, fileSizeKb, tagsJson, isActive, fileUrl,
      });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // PATCH /api/v1/media-library/:id/deactivate
  deactivate: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await mediaLibraryService.deactivate(id, req.user!);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/media-library/public/branch/:branchId/images  (no auth)
  getPublicBranchImages: async (req: Request, res: Response): Promise<void> => {
    try {
      const branchId      = parseInt(req.params.branchId, 10);
      const includeGlobal = req.query.includeGlobal !== 'false'; // default true
      if (isNaN(branchId)) { res.status(400).json({ error: 'Invalid branchId' }); return; }
      const data = await mediaLibraryService.getPublicBranchImages(branchId, includeGlobal);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },
};
