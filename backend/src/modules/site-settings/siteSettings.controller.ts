import { Request, Response } from 'express';
import { siteSettingsService } from './siteSettings.service';

export const siteSettingsController = {
  get: async (_req: Request, res: Response) => {
    try {
      const settings = await siteSettingsService.get();
      res.json(settings);
    } catch (err) {
      console.error('[SiteSettings] get error stack:', err);
      res.status(500).json({ error: 'Failed to load site settings' });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const settings = await siteSettingsService.update(req.body, user?.email ?? 'super_admin');
      res.json(settings);
    } catch (err) {
      console.error('[SiteSettings] update error:', err);
      res.status(500).json({ error: 'Failed to update site settings' });
    }
  },

  // ── Display Control ────────────────────────────────────────────────────────

  getDisplayControl: async (_req: Request, res: Response) => {
    try {
      const result = await siteSettingsService.getDisplayControl();
      res.json(result);
    } catch (err) {
      console.error('[SiteSettings] getDisplayControl error:', err);
      res.status(500).json({ error: 'Failed to load display control settings' });
    }
  },

  updateDisplayControl: async (req: Request, res: Response) => {
    try {
      const user   = (req as any).user;
      const result = await siteSettingsService.updateDisplayControl(
        req.body as Record<string, unknown>,
        user?.email ?? 'super_admin',
      );
      res.json(result);
    } catch (err) {
      console.error('[SiteSettings] updateDisplayControl error:', err);
      res.status(500).json({ error: 'Failed to update display control settings' });
    }
  },
};
