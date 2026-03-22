import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { mediaLibraryController } from './mediaLibrary.controller';

const router = Router();

// ── Public route — no auth required ──────────────────────────────────────────
// Must be declared BEFORE /:id to avoid being matched as id="public"
router.get('/public/branch/:branchId/images', mediaLibraryController.getPublicBranchImages);

// ── Auth middleware applied to all routes below ───────────────────────────────
router.use(authMiddleware, branchScope);

// ── Static routes before dynamic /:id ────────────────────────────────────────
router.post('/',   requireRole('super_admin', 'branch_admin'), mediaLibraryController.create);
router.get('/',    requireRole('super_admin', 'branch_admin'), mediaLibraryController.list);

// ── Dynamic routes ────────────────────────────────────────────────────────────
// /deactivate must come before plain /:id PATCH to avoid conflict
router.patch('/:id/deactivate', requireRole('super_admin', 'branch_admin'), mediaLibraryController.deactivate);
router.get('/:id',              requireRole('super_admin', 'branch_admin'), mediaLibraryController.getById);
router.patch('/:id',            requireRole('super_admin', 'branch_admin'), mediaLibraryController.update);

export default router;
