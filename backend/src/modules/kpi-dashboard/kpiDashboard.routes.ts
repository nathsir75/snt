import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { kpiDashboardController } from './kpiDashboard.controller';

const router = Router();

router.use(authMiddleware, branchScope);

// super_admin only — static routes first
router.get('/super-admin',     requireRole('super_admin'), kpiDashboardController.getSuperAdminDashboard);
router.get('/branch-ranking',  requireRole('super_admin'), kpiDashboardController.getBranchRanking);
router.get('/saas-control',    requireRole('super_admin'), kpiDashboardController.getSaasControl);
router.get('/monthly-trends',  requireRole('super_admin'), kpiDashboardController.getMonthlyTrends);

// branch_admin + counselor — branch detail (scoped to own branchId in controller)
router.get('/branch/:branchId', requireRole('super_admin', 'branch_admin', 'counselor'), kpiDashboardController.getBranchDetail);

// branch_admin only — full health metrics
router.get('/branch-health',   requireRole('branch_admin'), kpiDashboardController.getBranchHealth);

export default router;
