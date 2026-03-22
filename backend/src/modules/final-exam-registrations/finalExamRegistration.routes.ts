import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { finalExamRegistrationController } from './finalExamRegistration.controller';

const router = Router();
const allowBoth = requireRole('super_admin', 'branch_admin');

router.use(authMiddleware, branchScope);

// static routes first
router.get('/summary',        allowBoth,                  finalExamRegistrationController.getSummary);

// collection
router.get('/',               allowBoth,                  finalExamRegistrationController.list);

// dynamic routes last
router.get('/:id',            allowBoth,                  finalExamRegistrationController.getById);
router.patch('/:id/schedule', requireRole('super_admin'), finalExamRegistrationController.schedule);

export default router;
