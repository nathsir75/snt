import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { studentService } from './student.service';

const ERROR_MAP: Record<string, [number, string]> = {
  USER_NOT_FOUND:           [404, 'User not found'],
  STUDENT_RECORD_NOT_FOUND: [404, 'Student record not found for this account'],
  ACCESS_DENIED:            [403, 'Access denied'],
  ALERT_NOT_FOUND:          [404, 'Alert not found'],
  INVALID_MOBILE:           [400, 'Mobile must be exactly 10 digits'],
  INVALID_CITY:             [400, 'City cannot be empty'],
  NO_UPDATABLE_FIELDS:      [400, 'No updatable fields provided'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[StudentController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const studentController = {

  getMyProfile: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await studentService.getMyProfile(req.user!);
      // getMyProfile returns { linked: false } when no student record exists
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  updateMyProfile: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { mobile, city } = req.body as { mobile?: string; city?: string };
      res.json(await studentService.updateMyProfile(req.user!, { mobile, city }));
    } catch (err) { handleError(res, err); }
  },

  getMyFees: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await studentService.getMyFees(req.user!));
    } catch (err) { handleError(res, err); }
  },

  getMyResults: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await studentService.getMyResults(req.user!));
    } catch (err) { handleError(res, err); }
  },

  getMyCertificates: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await studentService.getMyCertificates(req.user!));
    } catch (err) { handleError(res, err); }
  },

  getMyPlacements: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await studentService.getMyPlacements(req.user!));
    } catch (err) { handleError(res, err); }
  },

  getMySchedule: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await studentService.getMySchedule(req.user!));
    } catch (err) { handleError(res, err); }
  },

  getMyAlerts: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await studentService.getMyAlerts(req.user!));
    } catch (err) { handleError(res, err); }
  },

  markAlertRead: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid alert id' }); return; }
      res.json(await studentService.markAlertRead(req.user!, id));
    } catch (err) { handleError(res, err); }
  },
};
