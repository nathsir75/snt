import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { pageController } from './page.controller';

const router = Router();

// ── Public routes — no auth required ─────────────────────────────────────────
// by-code MUST come before :branchId to avoid param collision
router.get('/public/by-code/:branchCode',      pageController.resolveBranchByCode);
router.get('/public/by-code/:branchCode/:slug', pageController.getPublicPageByCode);
// legacy branchId-based routes (kept for backward compat)
router.get('/public/:branchId/home',            pageController.getPublicHome);
router.get('/public/:branchId/:slug',           pageController.getPublicPage);

// ── Auth middleware applied to all routes below ───────────────────────────────
router.use(authMiddleware, branchScope);

// ── Static section routes — must come before /:id to avoid conflict ───────────
router.patch('/sections/:id',  requireRole('super_admin', 'branch_admin'), pageController.updateSection);
router.delete('/sections/:id', requireRole('super_admin', 'branch_admin'), pageController.deleteSection);

// ── Page CRUD ─────────────────────────────────────────────────────────────────
router.post('/',   requireRole('super_admin', 'branch_admin'), pageController.createPage);
router.get('/',    requireRole('super_admin', 'branch_admin'), pageController.listPages);
router.get('/:id', requireRole('super_admin', 'branch_admin'), pageController.getPageById);
router.patch('/:id', requireRole('super_admin', 'branch_admin'), pageController.updatePage);

// ── Section management (nested under page) ────────────────────────────────────
router.post('/:pageId/sections', requireRole('super_admin', 'branch_admin'), pageController.addSection);

export default router;
