import { Router } from 'express';
import { batchStudentController } from './batchStudent.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// Read students in a batch — teacher allowed (scoped to assigned batches in service)
router.get('/batch/:batchId',     authMiddleware, branchScope, requireRole('super_admin', 'branch_admin', 'counselor', 'teacher'), batchStudentController.getStudentsByBatch as any);

// Admin-only operations
router.post( '/assign',           authMiddleware, branchScope, requireRole('super_admin', 'branch_admin'), batchStudentController.assignStudent as any);
router.get(  '/student/:studentId', authMiddleware, branchScope, requireRole('super_admin', 'branch_admin', 'counselor'), batchStudentController.getBatchesByStudent as any);
router.patch('/:id/status',       authMiddleware, branchScope, requireRole('super_admin', 'branch_admin'), batchStudentController.updateStatus as any);

export default router;
