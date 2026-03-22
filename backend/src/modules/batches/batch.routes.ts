import { Router } from 'express';
import { batchController } from './batch.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// Teacher summary — assigned batches with student/schedule counts
router.get('/teacher-summary', authMiddleware, branchScope, requireRole('teacher'), batchController.getTeacherSummary as any);

// Read — branch_admin, counselor, teacher (teacher sees only assigned, enforced in service)
router.get( '/',    authMiddleware, branchScope, requireRole('super_admin', 'branch_admin', 'counselor', 'teacher'), batchController.getAllBatches as any);
router.get( '/:id', authMiddleware, branchScope, requireRole('super_admin', 'branch_admin', 'counselor', 'teacher'), batchController.getBatchById as any);

// Write — branch_admin only
router.post( '/',    authMiddleware, branchScope, requireRole('super_admin', 'branch_admin'), batchController.createBatch as any);
router.patch('/:id', authMiddleware, branchScope, requireRole('super_admin', 'branch_admin'), batchController.updateBatch as any);

export default router;
