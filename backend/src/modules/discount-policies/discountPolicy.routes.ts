import { Router } from 'express';
import { discountPolicyController } from './discountPolicy.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.post( '/',                  authMiddleware, requireRole('super_admin'),                 discountPolicyController.createPolicy);
router.get(  '/',                  authMiddleware, requireRole('super_admin', 'branch_admin'),  discountPolicyController.getAllPolicies as any);
router.get(  '/course/:courseId',  authMiddleware, requireRole('super_admin', 'branch_admin'),  discountPolicyController.getPoliciesByCourse as any);
router.patch('/:id',               authMiddleware, requireRole('super_admin'),                 discountPolicyController.updatePolicy);

export default router;
