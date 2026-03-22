import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const ADMIN_ROLES  = ['super_admin', 'branch_admin'] as const;
const ACCESS_ROLES = ['super_admin', 'branch_admin', 'teacher'] as const;

const router = Router();

// Mark attendance — branch_admin + teacher (teacher scoped to assigned batches in service)
router.post('/mark',                   authMiddleware, branchScope, requireRole(...ACCESS_ROLES), attendanceController.markAttendance as any);

// Read — branch_admin + teacher (teacher scoped in service)
router.get( '/summary/batch/:batchId', authMiddleware, branchScope, requireRole(...ACCESS_ROLES), attendanceController.getBatchSummary as any);
router.get( '/batch/:batchId',         authMiddleware, branchScope, requireRole(...ACCESS_ROLES), attendanceController.getByBatch as any);

// Student attendance — admin only (teacher doesn't need cross-student view)
router.get( '/student/:studentId',     authMiddleware, branchScope, requireRole(...ADMIN_ROLES),  attendanceController.getByStudent as any);

// Student reads their own attendance — no studentId param, identity from JWT
router.get( '/my',                     authMiddleware, branchScope, requireRole('student'),        attendanceController.getMyAttendance as any);

export default router;
