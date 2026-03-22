import { Router } from 'express';
import { scheduleController } from './schedule.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// Read — counselor + teacher allowed (teacher scoped to assigned batches in service)
router.get('/batch/:batchId', authMiddleware, branchScope, requireRole('super_admin', 'branch_admin', 'counselor', 'teacher'), scheduleController.getSchedulesByBatch as any);

// Write — branch_admin only
router.post(  '/',    authMiddleware, branchScope, requireRole('super_admin', 'branch_admin'), scheduleController.createSchedule as any);
router.patch( '/:id', authMiddleware, branchScope, requireRole('super_admin', 'branch_admin'), scheduleController.updateSchedule as any);
router.delete('/:id', authMiddleware, branchScope, requireRole('super_admin', 'branch_admin'), scheduleController.deleteSchedule as any);

export default router;
