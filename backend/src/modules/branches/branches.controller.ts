import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { branchesService } from './branches.service';
import { hasGlobalScope } from '../../common/utils/scope.util';

export const branchesController = {
  getMyBranch: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      if (hasGlobalScope(user) && !user.branchId) {
        res.json({ message: 'Head Office / Global user is not tied to a branch' });
        return;
      }
      const branch = await branchesService.getBranchById(user.branchId as number);
      if (!branch) { res.status(404).json({ error: 'Branch not found' }); return; }
      res.json(branch);
    } catch (error) {
      console.error('[Branches] Error fetching branch:', error);
      res.status(500).json({ error: 'Failed to fetch branch' });
    }
  },

  listAll: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const branches = await branchesService.listAll();
      res.json(branches);
    } catch (error) {
      console.error('[Branches] Error listing branches:', error);
      res.status(500).json({ error: 'Failed to list branches' });
    }
  },

  // GET /api/v1/branches/public — no auth, HO website branch-locations page
  listPublic: async (req: Request, res: Response): Promise<void> => {
    try {
      const branches = await branchesService.listPublic();
      res.json(branches);
    } catch (error) {
      console.error('[Branches] Error listing public branches:', error);
      res.status(500).json({ error: 'Failed to list branches' });
    }
  },

  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid branch id' }); return; }
      const branch = await branchesService.getBranchById(id);
      if (!branch) { res.status(404).json({ error: 'Branch not found' }); return; }
      res.json(branch);
    } catch (error) {
      console.error('[Branches] Error fetching branch:', error);
      res.status(500).json({ error: 'Failed to fetch branch' });
    }
  },

  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, code, city, state } = req.body;
      console.log('[Branches] CREATE REQUEST PAYLOAD:', req.body);
      if (!name || !code || !city) {
        res.status(400).json({ message: 'name, code, and city are required' });
        return;
      }
      const branch = await branchesService.createBranch({ name, code, city, state });
      console.log(`[Branches] Branch created: id=${branch.id}, code=${branch.code}`);
      res.status(201).json(branch);
    } catch (error: any) {
      if (error.message === 'BRANCH_CODE_EXISTS') {
        res.status(409).json({ message: 'Branch code already exists. Please choose a different code.' });
        return;
      }
      console.error('[Branches] Error creating branch:', error);
      res.status(500).json({ message: 'Failed to create branch' });
    }
  },

  update: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid branch id' }); return; }
      const branch = await branchesService.updateBranch(id, req.body);
      console.log(`[Branches] Branch updated: id=${id}`);
      res.json(branch);
    } catch (error: any) {
      if (error.message === 'BRANCH_NOT_FOUND') {
        res.status(404).json({ error: 'Branch not found' });
        return;
      }
      console.error('[Branches] Error updating branch:', error);
      res.status(500).json({ error: 'Failed to update branch' });
    }
  },

  // PATCH /api/v1/branches/:id/public-settings — super_admin only
  updatePublicSettings: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid branch id' }); return; }
      const {
        isPublic, websiteEnabled, publicPriority,
        publicPhone, publicEmail, publicMapLink, shortDescription,
      } = req.body;
      const branch = await branchesService.updatePublicSettings(id, {
        isPublic, websiteEnabled, publicPriority,
        publicPhone, publicEmail, publicMapLink, shortDescription,
      });
      console.log(`[Branches] Public settings updated: id=${id}`);
      res.json(branch);
    } catch (error: any) {
      if (error.message === 'BRANCH_NOT_FOUND') {
        res.status(404).json({ error: 'Branch not found' });
        return;
      }
      console.error('[Branches] Error updating public settings:', error);
      res.status(500).json({ error: 'Failed to update public settings' });
    }
  },

  // GET /api/v1/branches/:branchId/public — no auth, used by public site shell
  getPublicMeta: async (req: Request, res: Response): Promise<void> => {
    try {
      const branchId = parseInt(req.params.branchId, 10);
      if (isNaN(branchId)) { res.status(400).json({ error: 'Invalid branchId' }); return; }
      const data = await branchesService.getPublicMeta(branchId);
      if (!data) { res.status(404).json({ error: 'Branch not found' }); return; }
      res.json(data);
    } catch (error) {
      console.error('[Branches] Error fetching public meta:', error);
      res.status(500).json({ error: 'Failed to fetch branch meta' });
    }
  },

  // GET /api/v1/branches/by-code/:code — no auth, resolves branchCode → id
  getByCode: async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const branch = await branchesService.getByCode(code);
      if (!branch) { res.status(404).json({ error: 'Branch not found' }); return; }
      res.json(branch);
    } catch (error) {
      console.error('[Branches] Error fetching branch by code:', error);
      res.status(500).json({ error: 'Failed to fetch branch' });
    }
  },

  // GET /api/v1/branches/by-code/:code/public — no auth, full public meta by code
  getPublicMetaByCode: async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const data = await branchesService.getPublicMetaByCode(code);
      if (!data) { res.status(404).json({ error: 'Branch not found' }); return; }
      res.json(data);
    } catch (error) {
      console.error('[Branches] Error fetching public meta by code:', error);
      res.status(500).json({ error: 'Failed to fetch branch meta' });
    }
  },
};
