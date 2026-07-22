import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { lmsService } from './courseContent.service';

const ERROR_MAP: Record<string, [number, string]> = {
  COURSE_NOT_FOUND:          [404, 'Course not found'],
  COURSE_CONTENT_NOT_FOUND:  [404, 'Course content not found or not yet published'],
  SESSION_NOT_FOUND:         [404, 'Session not found'],
  CONTENT_ITEM_NOT_FOUND:    [404, 'Content item not found'],
  SESSION_ORDER_CONFLICT:    [409, 'A session with this order already exists for this course content'],
  INVALID_CONTENT_TYPE:      [400, 'Invalid content type — must be one of: pdf, ppt, video, lab'],
  ALREADY_PUBLISHED:         [409, 'Course content is already published'],
  ACCESS_DENIED:             [403, 'Access denied'],
  STUDENT_RECORD_NOT_FOUND:  [404, 'Student record not found for this account'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[LmsController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const lmsController = {

  createCourseContent: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { courseId, title, description } = req.body as {
        courseId: number; title: string; description?: string;
      };
      if (!courseId || !title) { res.status(400).json({ error: 'courseId and title are required' }); return; }
      const data = await lmsService.createCourseContent({ courseId, title, description });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  addSession: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { courseContentId, title, order, durationMinutes } = req.body as {
        courseContentId: number; title: string; order: number; durationMinutes?: number;
      };
      if (!courseContentId || !title || order === undefined) {
        res.status(400).json({ error: 'courseContentId, title and order are required' }); return;
      }
      const data = await lmsService.addSession({ courseContentId, title, order, durationMinutes });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  addContentItem: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { sessionId, type, title, fileUrl, convertedPdfUrl, thumbnailUrl, isPreview } = req.body as {
        sessionId: number; type: string; title: string; fileUrl: string;
        convertedPdfUrl?: string; thumbnailUrl?: string; isPreview?: boolean;
      };
      if (!sessionId || !type || !title || !fileUrl) {
        res.status(400).json({ error: 'sessionId, type, title and fileUrl are required' }); return;
      }
      const data = await lmsService.addContentItem({ sessionId, type, title, fileUrl, convertedPdfUrl, thumbnailUrl, isPreview });
      res.status(201).json(data);
    } catch (err) { handleError(res, err); }
  },

  publishCourseContent: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await lmsService.publishCourseContent(id);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  getCourseContent: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const courseId = parseInt(req.params.courseId, 10);
      if (isNaN(courseId)) { res.status(400).json({ error: 'Invalid courseId' }); return; }
      const data = await lmsService.getCourseContent(courseId, req.user!.role, req.user!);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  getSession: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await lmsService.getSession(id, req.user!.role, req.user!);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  updateContentItem: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await lmsService.updateContentItem(id, req.body);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  deleteContentItem: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await lmsService.deleteContentItem(id);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },

  getSecureContentItemView: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const data = await lmsService.getSecureContentItemView(id, req.user!.role, req.user!);
      res.json(data);
    } catch (err) { handleError(res, err); }
  },
};
