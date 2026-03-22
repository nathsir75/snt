import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { pageService } from './page.service';

const ERROR_MAP: Record<string, [number, string]> = {
  BRANCH_NOT_FOUND:       [404, 'Branch not found'],
  PAGE_NOT_FOUND:         [404, 'Page not found or not published'],
  SECTION_NOT_FOUND:      [404, 'Page section not found'],
  DUPLICATE_SLUG:         [409, 'A page with this slug already exists for this branch'],
  SECTION_ORDER_CONFLICT: [409, 'A section with this order already exists on this page'],
  INVALID_PAGE_TYPE:      [400, 'Invalid pageType — must be one of: home, about, courses, gallery, contact, custom'],
  INVALID_SECTION_TYPE:   [400, 'Invalid sectionType — must be one of: hero, text, gallery, cta, testimonials, stats, courses, contact, banner'],
  ACCESS_DENIED:          [403, 'Access denied to this branch resource'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[PageController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const pageController = {

  // POST /api/v1/pages
  createPage: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { branchId, title, slug, pageType } = req.body as {
        branchId: number; title: string; slug: string; pageType?: string;
      };
      if (!branchId || !title || !slug) {
        res.status(400).json({ error: 'branchId, title and slug are required' }); return;
      }
      const data = await pageService.createPage(req.user!, { branchId, title, slug, pageType });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/pages
  listPages: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string, 10) : undefined;
      const data = await pageService.listPages(req.user!, branchId);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/pages/:id
  getPageById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await pageService.getPageById(id, req.user!);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // PATCH /api/v1/pages/:id
  updatePage: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const { title, slug, pageType, isPublished } = req.body as Partial<{
        title: string; slug: string; pageType: string; isPublished: boolean;
      }>;
      const data = await pageService.updatePage(id, req.user!, { title, slug, pageType, isPublished });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // POST /api/v1/pages/:pageId/sections
  addSection: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pageId = parseInt(req.params.pageId, 10);
      if (isNaN(pageId)) { res.status(400).json({ error: 'Invalid pageId' }); return; }
      const { sectionType, title, order, configJson, isVisible } = req.body as {
        sectionType: string; title?: string; order: number;
        configJson: Record<string, unknown>; isVisible?: boolean;
      };
      if (!sectionType || order === undefined || !configJson) {
        res.status(400).json({ error: 'sectionType, order and configJson are required' }); return;
      }
      const data = await pageService.addSection(pageId, req.user!, { sectionType, title, order, configJson, isVisible });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  // PATCH /api/v1/pages/sections/:id
  updateSection: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const { title, order, configJson, isVisible } = req.body as Partial<{
        title: string; order: number; configJson: Record<string, unknown>; isVisible: boolean;
      }>;
      const data = await pageService.updateSection(id, req.user!, { title, order, configJson, isVisible });
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // DELETE /api/v1/pages/sections/:id
  deleteSection: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await pageService.deleteSection(id, req.user!);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/public/pages/:branchId/:slug  (no auth)
  getPublicPage: async (req: Request, res: Response): Promise<void> => {
    try {
      const branchId = parseInt(req.params.branchId, 10);
      const { slug }  = req.params;
      if (isNaN(branchId)) { res.status(400).json({ error: 'Invalid branchId' }); return; }
      const data = await pageService.getPublicPage(branchId, slug);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/pages/public/:branchId/home  (no auth)
  getPublicHome: async (req: Request, res: Response): Promise<void> => {
    try {
      const branchId = parseInt(req.params.branchId, 10);
      if (isNaN(branchId)) { res.status(400).json({ error: 'Invalid branchId' }); return; }
      const data = await pageService.getPublicHome(branchId);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/pages/public/by-code/:branchCode  (no auth) — resolve branch
  resolveBranchByCode: async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchCode } = req.params;
      const data = await pageService.resolveBranchByCode(branchCode);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  // GET /api/v1/pages/public/by-code/:branchCode/:slug  (no auth)
  getPublicPageByCode: async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchCode, slug } = req.params;
      const result = await pageService.getPublicPageByCode(branchCode, slug ?? '');
      // Always 200 — frontend reads result.status to decide what to render
      res.json(result);
    } catch (err) { handleError(res, err); }
  },
};
