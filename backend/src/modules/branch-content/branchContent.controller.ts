import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { branchContentService, CollectionType } from './branchContent.service';

const VALID_TYPES: CollectionType[] = ['project', 'activity', 'news', 'gallery', 'award', 'client'];

const ERROR_MAP: Record<string, [number, string]> = {
  ITEM_NOT_FOUND:  [404, 'Content item not found'],
  ACCESS_DENIED:   [403, 'Access denied'],
  BRANCH_REQUIRED: [400, 'branchId is required for super_admin'],
  NO_BRANCH:       [403, 'No branch assigned'],
  BRANCH_NOT_FOUND:[404, 'Branch not found'],
};

function handleError(res: Response, err: unknown): void {
  const msg = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[msg] ?? [500, 'Internal server error'];
  console.error(`[BranchContentController] ${msg}`);
  res.status(status).json({ error: text });
}

export const branchContentController = {

  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const type = req.query.type as CollectionType | undefined;
      if (type && !VALID_TYPES.includes(type)) {
        res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }); return;
      }
      const items = await branchContentService.list(req.user!, type);
      res.json(items);
    } catch (err) { handleError(res, err); }
  },

  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const item = await branchContentService.getById(id, req.user!);
      res.json(item);
    } catch (err) { handleError(res, err); }
  },

  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { collectionType, title, slug, summary, content, imageUrl, metaJson, displayOrder, branchId } = req.body;
      if (!collectionType || !title) {
        res.status(400).json({ error: 'collectionType and title are required' }); return;
      }
      if (!VALID_TYPES.includes(collectionType)) {
        res.status(400).json({ error: `Invalid collectionType. Must be one of: ${VALID_TYPES.join(', ')}` }); return;
      }
      const item = await branchContentService.create(req.user!, {
        collectionType, title, slug, summary, content, imageUrl, metaJson, displayOrder, branchId,
      });
      res.status(201).json(item);
    } catch (err) { handleError(res, err); }
  },

  update: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const item = await branchContentService.update(id, req.user!, req.body);
      res.json(item);
    } catch (err) { handleError(res, err); }
  },

  delete: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const result = await branchContentService.delete(id, req.user!);
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/branch-content/public/:branchCode/:type — no auth
  listPublic: async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchCode, type } = req.params;
      if (!VALID_TYPES.includes(type as CollectionType)) {
        res.status(400).json({ error: `Invalid type` }); return;
      }
      const items = await branchContentService.listPublic(branchCode, type as CollectionType);
      res.json(items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'BRANCH_NOT_FOUND') { res.status(404).json({ error: 'Branch not found' }); return; }
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
