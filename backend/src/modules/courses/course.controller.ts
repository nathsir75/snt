import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { courseService } from './course.service';

const ERROR_MAP: Record<string, [number, string]> = {
  COURSE_NOT_FOUND: [404, 'Course not found'],
  DUPLICATE_NAME:   [409, 'A course with this name already exists'],
  DUPLICATE_CODE:   [409, 'A course with this code already exists'],
  INVALID_DURATION: [400, 'durationMonths must be greater than 0'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const courseController = {
  createCourse: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, code, description, durationMonths } = req.body;
      if (!name || !code || !durationMonths) {
        res.status(400).json({ error: 'name, code and durationMonths are required' });
        return;
      }
      const course = await courseService.createCourse({ name, code, description, durationMonths });
      res.status(201).json(course);
    } catch (error: any) {
      console.error('[Courses] createCourse error:', error.message);
      handleError(res, error);
    }
  },

  getAllCourses: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const courses = await courseService.getAllCourses(req.user!);
      res.json(courses);
    } catch (error: any) {
      console.error('[Courses] getAllCourses error:', error.message);
      handleError(res, error);
    }
  },

  getCourseById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid course id' }); return; }
      const course = await courseService.getCourseById(id, req.user!);
      res.json(course);
    } catch (error: any) {
      console.error('[Courses] getCourseById error:', error.message);
      handleError(res, error);
    }
  },

  updateCourse: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid course id' }); return; }
      const { name, code, description, durationMonths, isActive } = req.body;
      const course = await courseService.updateCourse(id, { name, code, description, durationMonths, isActive });
      res.json(course);
    } catch (error: any) {
      console.error('[Courses] updateCourse error:', error.message);
      handleError(res, error);
    }
  },
};
