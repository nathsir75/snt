import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { studentService } from './student.service';

const ERROR_MAP: Record<string, [number, string]> = {
  ENQUIRY_NOT_FOUND:    [404, 'Enquiry not found'],
  STUDENT_NOT_FOUND:    [404, 'Student not found'],
  BRANCH_NOT_FOUND:     [404, 'Branch not found'],
  ACCESS_DENIED:        [403, 'Access denied. This record does not belong to your branch'],
  ALREADY_CONVERTED:    [409, 'This enquiry has already been converted to a student'],
  INVALID_FEES:         [400, 'totalFees must be greater than 0'],
  INVALID_DISCOUNT:     [400, 'discount cannot be negative'],
  DISCOUNT_EXCEEDS_FEES:[400, 'discount cannot exceed totalFees'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const studentController = {
  convertFromEnquiry: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const enquiryId = parseInt(req.params.enquiryId);
      if (isNaN(enquiryId)) { res.status(400).json({ error: 'Invalid enquiry id' }); return; }

      const { course, totalFees, discount = 0, userId } = req.body;
      if (!course || totalFees === undefined) {
        res.status(400).json({ error: 'course and totalFees are required' });
        return;
      }

      const student = await studentService.convertFromEnquiry(enquiryId, req.user!, { course, totalFees, discount, userId });
      res.status(201).json(student);
    } catch (error: any) {
      console.error('[Students] convertFromEnquiry error:', error.message);
      handleError(res, error);
    }
  },

  createManual: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fullName, mobile, email, city, course, totalFees, discount = 0, branchId, userId } = req.body;

      if (!fullName || !mobile || !city || !course || totalFees === undefined || !branchId) {
        res.status(400).json({ error: 'fullName, mobile, city, course, totalFees and branchId are required' });
        return;
      }

      const student = await studentService.createManual({ fullName, mobile, email, city, course, totalFees, discount, branchId, userId });
      res.status(201).json(student);
    } catch (error: any) {
      console.error('[Students] createManual error:', error.message);
      handleError(res, error);
    }
  },

  getAllStudents: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log(`[Students] GET /api/v1/students — role: ${req.user!.role}`);
      const students = await studentService.getAllStudents(req.user!);
      res.json(students);
    } catch (error: any) {
      console.error('[Students] getAllStudents error:', error.message);
      handleError(res, error);
    }
  },

  getStudentById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid student id' }); return; }

      const student = await studentService.getStudentById(id, req.user!);
      res.json(student);
    } catch (error: any) {
      console.error('[Students] getStudentById error:', error.message);
      handleError(res, error);
    }
  },

  getBranchSummary: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const branchId = req.user!.branchId!;
      const summary = await studentService.getBranchSummary(branchId);
      res.json(summary);
    } catch (error: any) {
      console.error('[Students] getBranchSummary error:', error.message);
      handleError(res, error);
    }
  },
};
