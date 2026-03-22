import { Router } from 'express';
import { siteEnquiriesController } from './siteEnquiries.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();
const superAdmin = requireRole('super_admin');

// Public — all HO website forms post here
router.post('/public', siteEnquiriesController.submit as any);

// Admin
router.get('/',     authMiddleware, superAdmin, siteEnquiriesController.list as any);
router.get('/:id',  authMiddleware, superAdmin, siteEnquiriesController.getById as any);
router.patch('/:id',authMiddleware, superAdmin, siteEnquiriesController.update as any);

export default router;
