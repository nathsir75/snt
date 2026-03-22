import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { settingsService } from './settings.service';

export const settingsController = {
  get: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const branchId = req.user!.branchId ?? null;
      console.log(`[Settings] GET — role: ${req.user!.role}, branchId: ${branchId}`);
      const settings = await settingsService.get(branchId);
      res.json(settings);
    } catch (error) {
      console.error('[Settings] Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  },

  update: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const branchId = req.user!.branchId ?? null;
      console.log(`[Settings] PATCH — role: ${req.user!.role}, branchId: ${branchId}`);
      console.log('[Settings] REQUEST PAYLOAD:', req.body);
      const settings = await settingsService.update(branchId, req.body);
      res.json(settings);
    } catch (error) {
      console.error('[Settings] Error updating settings:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  },
};
