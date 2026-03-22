import { Router } from 'express';
import { batchTrainerController } from './batchTrainer.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

const allowAdmin = requireRole('super_admin', 'branch_admin');
// Teacher can read trainers assigned to their batch (scoped in service)
const allowRead  = requireRole('super_admin', 'branch_admin', 'teacher');

router.post('/assign',               authMiddleware, branchScope, allowAdmin, batchTrainerController.assignTrainer as any);
router.get( '/batch/:batchId',       authMiddleware, branchScope, allowRead,  batchTrainerController.getTrainersByBatch as any);
router.get( '/trainer/:trainerId',   authMiddleware, branchScope, allowAdmin, batchTrainerController.getBatchesByTrainer as any);

export default router;
