import { Router } from 'express';
import { siteSettingsController } from './siteSettings.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// Public — website shell reads settings
router.get('/public', siteSettingsController.get as any);

// Public — display control values read by the public website
router.get('/display-control/public', siteSettingsController.getDisplayControl as any);

// Admin — super_admin only
router.get('/',    authMiddleware, requireRole('super_admin'), siteSettingsController.get as any);
router.put('/',    authMiddleware, requireRole('super_admin'), siteSettingsController.update as any);
router.patch('/',  authMiddleware, requireRole('super_admin'), siteSettingsController.update as any);

// Display Control — super_admin only
router.get('/display-control',   authMiddleware, requireRole('super_admin'), siteSettingsController.getDisplayControl as any);
router.patch('/display-control', authMiddleware, requireRole('super_admin'), siteSettingsController.updateDisplayControl as any);

export default router;
