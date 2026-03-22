import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

const allowAdmin = requireRole('super_admin', 'branch_admin');

router.get( '/', authMiddleware, allowAdmin, settingsController.get    as any);
router.patch('/', authMiddleware, allowAdmin, settingsController.update as any);

export default router;
