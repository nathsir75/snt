import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { discountPolicyService } from './discountPolicy.service';

const ERROR_MAP: Record<string, [number, string]> = {
  COURSE_NOT_FOUND:              [404, 'Course not found'],
  POLICY_NOT_FOUND:              [404, 'Discount policy not found'],
  INVALID_MAX_DISCOUNT_AMOUNT:   [400, 'maxDiscountAmount must be greater than 0'],
  INVALID_MAX_DISCOUNT_PERCENT:  [400, 'maxDiscountPercent cannot be negative'],
  INVALID_APPROVAL_THRESHOLD:    [400, 'requiresApprovalAboveAmount cannot be negative'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const discountPolicyController = {
  createPolicy: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, courseId, maxDiscountAmount, maxDiscountPercent, requiresApprovalAboveAmount } = req.body;
      if (!name || maxDiscountAmount === undefined) {
        res.status(400).json({ error: 'name and maxDiscountAmount are required' });
        return;
      }
      const policy = await discountPolicyService.createPolicy({
        name, description, courseId, maxDiscountAmount, maxDiscountPercent, requiresApprovalAboveAmount,
      });
      res.status(201).json(policy);
    } catch (error: any) {
      console.error('[DiscountPolicies] createPolicy error:', error.message);
      handleError(res, error);
    }
  },

  getAllPolicies: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const policies = await discountPolicyService.getAllPolicies(req.user!);
      res.json(policies);
    } catch (error: any) {
      console.error('[DiscountPolicies] getAllPolicies error:', error.message);
      handleError(res, error);
    }
  },

  getPoliciesByCourse: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const courseId = parseInt(req.params.courseId);
      if (isNaN(courseId)) { res.status(400).json({ error: 'Invalid course id' }); return; }
      const policies = await discountPolicyService.getPoliciesByCourse(courseId, req.user!);
      res.json(policies);
    } catch (error: any) {
      console.error('[DiscountPolicies] getPoliciesByCourse error:', error.message);
      handleError(res, error);
    }
  },

  updatePolicy: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid policy id' }); return; }
      const { name, description, maxDiscountAmount, maxDiscountPercent, requiresApprovalAboveAmount, isActive } = req.body;
      const policy = await discountPolicyService.updatePolicy(id, {
        name, description, maxDiscountAmount, maxDiscountPercent, requiresApprovalAboveAmount, isActive,
      });
      res.json(policy);
    } catch (error: any) {
      console.error('[DiscountPolicies] updatePolicy error:', error.message);
      handleError(res, error);
    }
  },
};
