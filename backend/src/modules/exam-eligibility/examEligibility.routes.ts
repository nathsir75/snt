import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { examEligibilityController } from './examEligibility.controller';

const router = Router();
const allowBoth = requireRole('super_admin', 'branch_admin');

router.use(authMiddleware, branchScope);

router.post('/',                allowBoth,                   examEligibilityController.createRequest);
router.get('/',                 allowBoth,                   examEligibilityController.list);
router.get('/:id',              allowBoth,                   examEligibilityController.getById);
router.patch('/:id/decision',   requireRole('super_admin'),  examEligibilityController.decide);

export default router;
