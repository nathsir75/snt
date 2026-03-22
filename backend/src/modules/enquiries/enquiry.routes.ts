import { Router } from 'express';
import { enquiryController } from './enquiry.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

const allowCRM   = requireRole('super_admin', 'branch_admin', 'counselor');
const allowWrite = requireRole('super_admin', 'branch_admin', 'counselor');

// ── Public route — no auth, branch website contact form ──────────────────────
router.post('/public', enquiryController.createPublicEnquiry as any);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.post(  '/',            authMiddleware, allowWrite, branchScope, enquiryController.createEnquiry as any);
router.get(   '/',            authMiddleware, allowCRM,   branchScope, enquiryController.getAllEnquiries as any);
router.get(   '/:id',         authMiddleware, allowCRM,   branchScope, enquiryController.getEnquiryById as any);
router.patch( '/:id/status',  authMiddleware, allowCRM,   branchScope, enquiryController.updateStatus as any);

export default router;
