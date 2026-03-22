import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { discountRequestService } from './discountRequest.service';

const ERROR_MAP: Record<string, [number, string]> = {
  ENQUIRY_NOT_FOUND:          [404, 'Enquiry not found'],
  STUDENT_NOT_FOUND:          [404, 'Student not found'],
  COURSE_NOT_FOUND:           [404, 'Course not found'],
  REQUEST_NOT_FOUND:          [404, 'Discount request not found'],
  ACCESS_DENIED:              [403, 'Access denied. This record does not belong to your branch'],
  INVALID_AMOUNT:             [400, 'requestedDiscountAmount must be greater than 0'],
  REASON_REQUIRED:            [400, 'reason is required'],
  ENQUIRY_OR_STUDENT_REQUIRED:[400, 'At least one of enquiryId or studentId is required'],
  BRANCH_CONTEXT_REQUIRED:    [400, 'Cannot determine branch context. Provide enquiryId or studentId'],
  INVALID_DECISION_STATUS:    [400, 'status must be approved or rejected'],
  ALREADY_DECIDED:            [409, 'This request has already been decided'],
};

function handleError(res: any, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const discountRequestController = {
  createRequest: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { enquiryId, studentId, courseId, requestedDiscountAmount, reason } = req.body;
      if (requestedDiscountAmount === undefined || !reason) {
        res.status(400).json({ error: 'requestedDiscountAmount and reason are required' });
        return;
      }
      const result = await discountRequestService.createRequest(req.user!, {
        enquiryId, studentId, courseId, requestedDiscountAmount, reason,
      });
      res.status(201).json(result);
    } catch (error: any) {
      console.error('[DiscountRequests] createRequest error:', error.message);
      handleError(res, error);
    }
  },

  getAllRequests: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log(`[DiscountRequests] GET /discount-requests — role: ${req.user!.role}`);
      const requests = await discountRequestService.getAllRequests(req.user!);
      res.json(requests);
    } catch (error: any) {
      console.error('[DiscountRequests] getAllRequests error:', error.message);
      handleError(res, error);
    }
  },

  getRequestById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid request id' }); return; }
      const request = await discountRequestService.getRequestById(id, req.user!);
      res.json(request);
    } catch (error: any) {
      console.error('[DiscountRequests] getRequestById error:', error.message);
      handleError(res, error);
    }
  },

  decideRequest: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid request id' }); return; }
      const { status, decisionRemarks } = req.body;
      if (!status) { res.status(400).json({ error: 'status is required' }); return; }
      const request = await discountRequestService.decideRequest(id, req.user!, { status, decisionRemarks });
      res.json(request);
    } catch (error: any) {
      console.error('[DiscountRequests] decideRequest error:', error.message);
      handleError(res, error);
    }
  },
};
