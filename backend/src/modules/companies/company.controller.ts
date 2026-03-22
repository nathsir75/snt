import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { companyService } from './company.service';

const ERROR_MAP: Record<string, [number, string]> = {
  COMPANY_NOT_FOUND: [404, 'Company not found'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[CompanyController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const companyController = {
  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, industry, contactPerson, contactEmail, contactPhone, location } = req.body;
      if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }
      const data = await companyService.create({ name, industry, contactPerson, contactEmail, contactPhone, location });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const data = await companyService.list(activeOnly);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await companyService.getById(id);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },
};
