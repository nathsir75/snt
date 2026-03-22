import { Request, Response } from 'express';
import { siteCollectionsService } from './siteCollections.service';

export const siteCollectionsController = {
  listPublic: async (req: Request, res: Response) => {
    try { res.json(await siteCollectionsService.listPublic(req.params.type)); }
    catch (err) { res.status(500).json({ error: 'Failed to load collections' }); }
  },

  list: async (req: Request, res: Response) => {
    try { res.json(await siteCollectionsService.list(req.query.type as string)); }
    catch (err) { res.status(500).json({ error: 'Failed to list collections' }); }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const item = await siteCollectionsService.getById(Number(req.params.id));
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    } catch (err) { res.status(500).json({ error: 'Failed to get item' }); }
  },

  create: async (req: Request, res: Response) => {
    try { res.status(201).json(await siteCollectionsService.create(req.body)); }
    catch (err: any) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
      res.status(500).json({ error: 'Failed to create item' });
    }
  },

  update: async (req: Request, res: Response) => {
    try { res.json(await siteCollectionsService.update(Number(req.params.id), req.body)); }
    catch (err) { res.status(500).json({ error: 'Failed to update item' }); }
  },

  delete: async (req: Request, res: Response) => {
    try { await siteCollectionsService.delete(Number(req.params.id)); res.json({ ok: true }); }
    catch (err) { res.status(500).json({ error: 'Failed to delete item' }); }
  },

  togglePublish: async (req: Request, res: Response) => {
    try { res.json(await siteCollectionsService.togglePublish(Number(req.params.id))); }
    catch (err) { res.status(500).json({ error: 'Failed to toggle publish' }); }
  },
};
