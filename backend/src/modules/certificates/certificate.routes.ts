import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { certificateController } from './certificate.controller';

const router = Router();
const allowBoth = requireRole('super_admin', 'branch_admin');

// ── Public route — no auth ────────────────────────────────────────────────────
router.get('/verify/:verificationCode', certificateController.verify);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use(authMiddleware, branchScope);

// static routes first
router.post('/issue',        requireRole('super_admin'), certificateController.issue);

// collection
router.get('/',              allowBoth,                  certificateController.list);

// dynamic last
router.get('/:id',           allowBoth,                  certificateController.getById);
router.patch('/:id/revoke',  requireRole('super_admin'), certificateController.revoke);

export default router;
