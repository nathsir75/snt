import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { jobOpeningController } from './jobOpening.controller';

const router = Router();
const allowBoth = requireRole('super_admin', 'branch_admin');

router.use(authMiddleware, branchScope);

router.post('/',              requireRole('super_admin'), jobOpeningController.create);
router.get('/',               allowBoth,                  jobOpeningController.list);
router.get('/:id',            allowBoth,                  jobOpeningController.getById);
router.patch('/:id/status',   requireRole('super_admin'), jobOpeningController.updateStatus);

export default router;
