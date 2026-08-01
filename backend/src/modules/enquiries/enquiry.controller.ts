import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { enquiryService } from './enquiry.service';
import { hasGlobalScope } from '../../common/utils/scope.util';
import prisma from '../../db/prisma';

const ERROR_MAP: Record<string, [number, string]> = {
  BRANCH_NOT_FOUND:       [404, 'Branch not found'],
  ENQUIRY_NOT_FOUND:      [404, 'Enquiry not found'],
  ACCESS_DENIED:          [403, 'Access denied. This enquiry does not belong to your branch'],
  INVALID_STATUS:         [400, 'Invalid status. Allowed: new, contacted, follow_up, converted, lost'],
  BRANCH_REQUIRED:        [400, 'branchId is required for Head Office / Global users'],
  NO_BRANCH_ASSIGNED:     [403, 'No branch assigned to your account. Contact super admin.'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const enquiryController = {
  // POST /api/v1/enquiries/public — no auth, from branch website contact form
  createPublicEnquiry: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fullName, mobile, email, city, state, courseInterest, source, remarks, branchCode } = req.body;
      if (!fullName || !mobile || !city || !courseInterest || !branchCode) {
        res.status(400).json({ error: 'fullName, mobile, city, courseInterest and branchCode are required' });
        return;
      }
      const branch = await prisma.branch.findUnique({
        where: { code: branchCode.toLowerCase() },
        select: { id: true, status: true },
      });
      if (!branch || branch.status !== 'active') {
        res.status(404).json({ error: 'Branch not found' });
        return;
      }
      const enquiry = await enquiryService.createEnquiry({
        fullName, mobile, email, city, state, courseInterest,
        source: source ?? 'website',
        branchId: branch.id, remarks,
      });
      console.log(`[Enquiries] Public enquiry created — branchCode=${branchCode}, id=${enquiry.id}`);
      res.status(201).json({ success: true, id: enquiry.id });
    } catch (error: any) {
      console.error('[Enquiries] createPublicEnquiry error:', error.message);
      res.status(500).json({ error: 'Failed to submit enquiry. Please try again.' });
    }
  },

  createEnquiry: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { fullName, mobile, email, city, state, courseInterest, source, remarks } = req.body;

      if (!fullName || !mobile || !city || !courseInterest) {
        res.status(400).json({ error: 'fullName, mobile, city and courseInterest are required' });
        return;
      }

      let resolvedBranchId: number;

      if (hasGlobalScope(user)) {
        // Global users must explicitly provide branchId.
        const bodyBranchId = parseInt(req.body.branchId);
        if (!req.body.branchId || isNaN(bodyBranchId)) {
          res.status(400).json({ error: 'branchId is required for Head Office / Global users' });
          return;
        }
        resolvedBranchId = bodyBranchId;
        console.log(`[Enquiries] global user creating enquiry for branchId=${resolvedBranchId}`);
      } else {
        // branch_admin — derive branchId from token, never trust body
        if (!user.branchId) {
          res.status(403).json({ error: 'No branch assigned to your account. Contact super admin.' });
          return;
        }
        resolvedBranchId = user.branchId;
        console.log(`[Enquiries] branch_admin creating enquiry for own branchId=${resolvedBranchId}`);
      }

      const enquiry = await enquiryService.createEnquiry({
        fullName, mobile, email, city, state, courseInterest, source,
        branchId: resolvedBranchId, remarks,
      });
      res.status(201).json(enquiry);
    } catch (error: any) {
      console.error('[Enquiries] createEnquiry error:', error.message);
      handleError(res, error);
    }
  },

  getAllEnquiries: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log(`[Enquiries] GET /api/v1/enquiries — role: ${req.user!.role}`);
      const enquiries = await enquiryService.getAllEnquiries(req.user!);
      res.json(enquiries);
    } catch (error: any) {
      console.error('[Enquiries] getAllEnquiries error:', error.message);
      handleError(res, error);
    }
  },

  getEnquiryById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid enquiry id' }); return; }

      const enquiry = await enquiryService.getEnquiryById(id, req.user!);
      res.json(enquiry);
    } catch (error: any) {
      console.error('[Enquiries] getEnquiryById error:', error.message);
      handleError(res, error);
    }
  },

  updateStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid enquiry id' }); return; }

      const { status, remarks } = req.body;
      if (!status) { res.status(400).json({ error: 'status is required' }); return; }

      const enquiry = await enquiryService.updateStatus(id, req.user!, { status, remarks });
      res.json(enquiry);
    } catch (error: any) {
      console.error('[Enquiries] updateStatus error:', error.message);
      handleError(res, error);
    }
  },
};
