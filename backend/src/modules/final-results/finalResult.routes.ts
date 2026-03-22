import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { finalResultController } from './finalResult.controller';

const router = Router();
const allowBoth = requireRole('super_admin', 'branch_admin');

router.use(authMiddleware, branchScope);

// static routes first
router.get( '/summary',  allowBoth,                  finalResultController.getSummary);
router.post('/publish',  requireRole('super_admin'),  finalResultController.publish);

// collection
router.get('/',          allowBoth,                  finalResultController.list);

// dynamic last
router.get('/:id',       allowBoth,                  finalResultController.getById);

export default router;
