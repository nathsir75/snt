import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { interviewApplicationController } from './interviewApplication.controller';

const router = Router();
const allowBoth = requireRole('super_admin', 'branch_admin');

router.use(authMiddleware, branchScope);

router.post('/',              allowBoth,                  interviewApplicationController.apply);
router.get('/',               allowBoth,                  interviewApplicationController.list);
router.patch('/:id/status',   requireRole('super_admin'), interviewApplicationController.updateStatus);

export default router;
