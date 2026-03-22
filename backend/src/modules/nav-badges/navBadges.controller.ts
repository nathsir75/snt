import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { navBadgesService } from './navBadges.service';

export const navBadgesController = {
  getCounts: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const counts = await navBadgesService.getCounts(req.user!);
      res.json(counts);
    } catch (err) {
      console.error('[NavBadges] Error fetching counts:', err);
      res.status(500).json({ error: 'Failed to fetch nav badge counts' });
    }
  },
};
