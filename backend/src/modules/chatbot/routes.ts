import { Router } from 'express';
import { chatbotController } from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

const superAdminOnly = requireRole('super_admin');

// Public — no auth required, called by the website widget
router.get('/health',             chatbotController.health           as any);
router.post('/message',           chatbotController.message          as any);
router.post('/lead',              chatbotController.submitLead       as any);
router.post('/quick-reply-click', chatbotController.trackQuickReply  as any);
router.get('/settings',           chatbotController.getSettings      as any);

// Admin only — requires valid JWT
router.get('/analytics',  authMiddleware as any, chatbotController.getAnalytics   as any);
router.patch('/settings', authMiddleware as any, superAdminOnly as any, chatbotController.updateSettings as any);

export default router;
