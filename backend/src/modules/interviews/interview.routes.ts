import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { interviewController } from './interview.controller';

const router = Router();
const allowBoth = requireRole('super_admin', 'branch_admin');

router.use(authMiddleware, branchScope);

router.post('/',    requireRole('super_admin'), interviewController.schedule);
router.get('/',     allowBoth,                  interviewController.list);
router.get('/:id',  allowBoth,                  interviewController.getById);

export default router;
