import { Router } from 'express';
import { siteCollectionsController } from './siteCollections.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();
const superAdmin = requireRole('super_admin');

// Public
router.get('/public/:type', siteCollectionsController.listPublic as any);

// Admin
router.get('/',                         authMiddleware, superAdmin, siteCollectionsController.list as any);
router.post('/',                        authMiddleware, superAdmin, siteCollectionsController.create as any);
router.get('/:id',                      authMiddleware, superAdmin, siteCollectionsController.getById as any);
router.put('/:id',                      authMiddleware, superAdmin, siteCollectionsController.update as any);
router.patch('/:id',                    authMiddleware, superAdmin, siteCollectionsController.update as any);
router.delete('/:id',                   authMiddleware, superAdmin, siteCollectionsController.delete as any);
router.post('/:id/toggle-publish',      authMiddleware, superAdmin, siteCollectionsController.togglePublish as any);

export default router;
