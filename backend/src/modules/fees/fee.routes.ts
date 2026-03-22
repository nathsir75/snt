import { Router } from 'express';
import { feeController } from './fee.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

const allowAdmin = requireRole('super_admin', 'branch_admin');

// Static routes first — must come before dynamic segments
router.post('/collect',             authMiddleware, branchScope, allowAdmin,                    feeController.collectPayment as any);
router.get( '/payments',            authMiddleware, branchScope, allowAdmin,                    feeController.getAllPayments as any);
router.get( '/branch-summary',      authMiddleware, requireRole('super_admin', 'branch_admin'), feeController.getBranchSummary as any);
router.get( '/overall-summary',     authMiddleware, requireRole('super_admin'),                 feeController.getOverallSummary);
router.get( '/student/:studentId',  authMiddleware, branchScope, allowAdmin,                   feeController.getStudentLedger as any);

export default router;
