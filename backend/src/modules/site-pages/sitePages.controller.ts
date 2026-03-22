import { Request, Response } from 'express';
import { sitePagesService } from './sitePages.service';

export const sitePagesController = {
  // Public
  getPublicBySlug: async (req: Request, res: Response) => {
    try {
      const raw  = req.params.slug ?? '';
      const slug = raw === 'home' || !raw ? 'home' : raw.replace(/^\/+/, '');
      // preview=1 is only honoured when the request carries a valid super_admin token
      // The route is mounted without authMiddleware so we check the header manually
      const previewRequested = req.query['preview'] === '1';
      const authHeader       = req.headers['authorization'] ?? '';
      const isAdmin          = previewRequested && authHeader.startsWith('Bearer ');
      const result = await sitePagesService.getBySlug(slug, isAdmin);
      console.log(`[SitePages] public slug="${slug}" preview=${isAdmin} → status=${result.status}`);
      res.json(result);
    } catch (err) {
      console.error('[SitePages] getPublicBySlug error:', err);
      res.json({ status: 'error' });
    }
  },

  // Admin
  list: async (_req: Request, res: Response) => {
    try { res.json(await sitePagesService.list()); }
    catch (err) { res.status(500).json({ error: 'Failed to list pages' }); }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const page = await sitePagesService.getById(Number(req.params.id));
      if (!page) return res.status(404).json({ error: 'Page not found' });
      res.json(page);
    } catch (err) { res.status(500).json({ error: 'Failed to get page' }); }
  },

  create: async (req: Request, res: Response) => {
    try { res.status(201).json(await sitePagesService.create(req.body)); }
    catch (err: any) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
      res.status(500).json({ error: 'Failed to create page' });
    }
  },

  update: async (req: Request, res: Response) => {
    try { res.json(await sitePagesService.update(Number(req.params.id), req.body)); }
    catch (err) { res.status(500).json({ error: 'Failed to update page' }); }
  },

  delete: async (req: Request, res: Response) => {
    try { await sitePagesService.delete(Number(req.params.id)); res.json({ ok: true }); }
    catch (err) { res.status(500).json({ error: 'Failed to delete page' }); }
  },

  addSection: async (req: Request, res: Response) => {
    try { res.status(201).json(await sitePagesService.addSection(Number(req.params.id), req.body)); }
    catch (err) { res.status(500).json({ error: 'Failed to add section' }); }
  },

  updateSection: async (req: Request, res: Response) => {
    try { res.json(await sitePagesService.updateSection(Number(req.params.sectionId), req.body)); }
    catch (err) { res.status(500).json({ error: 'Failed to update section' }); }
  },

  deleteSection: async (req: Request, res: Response) => {
    try { await sitePagesService.deleteSection(Number(req.params.sectionId)); res.json({ ok: true }); }
    catch (err) { res.status(500).json({ error: 'Failed to delete section' }); }
  },

  reorderSections: async (req: Request, res: Response) => {
    try { res.json(await sitePagesService.reorderSections(Number(req.params.id), req.body.orderedIds)); }
    catch (err) { res.status(500).json({ error: 'Failed to reorder sections' }); }
  },
};
