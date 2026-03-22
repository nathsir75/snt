import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { uploadGatewayController, upload } from './uploadGateway.controller';

const router = Router();

router.use(authMiddleware, branchScope);

// Static routes before dynamic /:mediaAssetId
router.get('/my-files', requireRole('super_admin', 'branch_admin'), uploadGatewayController.listMyFiles);

// File upload — multer middleware applied inline
router.post(
  '/file',
  requireRole('super_admin', 'branch_admin'),
  upload.single('file'),
  uploadGatewayController.uploadFile,
);

// Dynamic routes
router.delete(
  '/file/:mediaAssetId',
  requireRole('super_admin', 'branch_admin'),
  uploadGatewayController.deleteFile,
);

router.patch(
  '/file/:mediaAssetId/replace',
  requireRole('super_admin', 'branch_admin'),
  upload.single('file'),
  uploadGatewayController.replaceFile,
);

export default router;
