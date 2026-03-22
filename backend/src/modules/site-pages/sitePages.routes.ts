import { Router } from 'express';
import { sitePagesController } from './sitePages.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();
const superAdmin = requireRole('super_admin');

// Public
router.get('/public/:slug', sitePagesController.getPublicBySlug as any);
router.get('/public',       sitePagesController.getPublicBySlug as any); // home fallback

// Admin
router.get('/',    authMiddleware, superAdmin, sitePagesController.list as any);
router.post('/',   authMiddleware, superAdmin, sitePagesController.create as any);
router.get('/:id', authMiddleware, superAdmin, sitePagesController.getById as any);
router.put('/:id', authMiddleware, superAdmin, sitePagesController.update as any);
router.patch('/:id', authMiddleware, superAdmin, sitePagesController.update as any);
router.delete('/:id', authMiddleware, superAdmin, sitePagesController.delete as any);

// Sections
router.post('/:id/sections',                    authMiddleware, superAdmin, sitePagesController.addSection as any);
router.patch('/:id/sections/:sectionId',        authMiddleware, superAdmin, sitePagesController.updateSection as any);
router.delete('/:id/sections/:sectionId',       authMiddleware, superAdmin, sitePagesController.deleteSection as any);
router.post('/:id/sections/reorder',            authMiddleware, superAdmin, sitePagesController.reorderSections as any);

export default router;
