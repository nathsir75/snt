import { Request, Response } from 'express';

export const rolesController = {
  placeholder: (_req: Request, res: Response) => {
    res.json({ module: 'roles' });
  },
};
