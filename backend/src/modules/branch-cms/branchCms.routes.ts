import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { branchCmsController } from './branchCms.controller';

const router = Router();

router.use(authMiddleware, requireRole('super_admin', 'branch_admin'));

router.get('/',  branchCmsController.getSettings);
router.patch('/', branchCmsController.updateSettings);

export default router;
