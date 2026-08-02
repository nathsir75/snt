import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { batchMaterialService } from './batchMaterial.service';

const ERROR_MAP: Record<string, [number, string]> = {
  ACCESS_DENIED:             [403, 'Access denied'],
  BATCH_NOT_FOUND:           [404, 'Batch not found'],
  INVALID_INPUT:             [400, 'Please provide a valid title, type and material details'],
  INVALID_CONTENT_CATEGORY:  [400, 'Please choose a valid content category'],
  INVALID_LECTURE_DATE:      [400, 'Please provide a valid lecture date'],
  INVALID_FEEDBACK:          [400, 'Please provide a 1-5 rating and valid feedback status'],
  INVALID_PROGRESS_EVENT:    [400, 'Please provide a valid lecture progress event'],
  INVALID_YOUTUBE_URL:       [400, 'Please provide a valid YouTube URL'],
  LECTURE_NOT_FOUND:         [404, 'Lecture not found'],
  LECTURE_DATE_REQUIRED:     [400, 'Lecture date is required for recorded lectures'],
  MATERIAL_NOT_FOUND:        [404, 'Material not found'],
  MATERIAL_TARGET_REQUIRED:  [400, 'Upload a file or provide a material link'],
  MEDIA_ASSET_NOT_FOUND:     [404, 'Uploaded media asset not found'],
  STUDENT_RECORD_NOT_FOUND:  [404, 'Student record not found for this account'],
  TEACHER_NOT_ASSIGNED:      [403, 'Teacher is not assigned to this batch'],
};

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const [status, text] = ERROR_MAP[message] ?? [500, 'Internal server error'];
  console.error(`[BatchMaterialController] Error: ${message}`);
  res.status(status).json({ error: text });
}

export const batchMaterialController = {
  listByBatch: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const batchId = parseInt(req.params.batchId, 10);
      if (isNaN(batchId)) { res.status(400).json({ error: 'Invalid batchId' }); return; }
      res.json(await batchMaterialService.listForBatch(req.user!, batchId));
    } catch (err) { handleError(res, err); }
  },

  listMine: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await batchMaterialService.listMine(req.user!));
    } catch (err) { handleError(res, err); }
  },

  create: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { batchId, title, description, materialType, mediaAssetId, externalUrl, isPublished, contentCategory, lectureDate } = req.body as {
        batchId: number; title: string; description?: string; materialType: string;
        mediaAssetId?: number | null; externalUrl?: string | null; isPublished?: boolean;
        contentCategory?: string; lectureDate?: string | null;
      };
      if (!batchId || !title || !materialType) {
        res.status(400).json({ error: 'batchId, title and materialType are required' });
        return;
      }
      const material = await batchMaterialService.create(req.user!, {
        batchId: Number(batchId),
        title,
        description,
        materialType,
        mediaAssetId: mediaAssetId ? Number(mediaAssetId) : null,
        externalUrl,
        isPublished,
        contentCategory,
        lectureDate,
      });
      res.status(201).json(material);
    } catch (err) { handleError(res, err); }
  },

  update: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid material id' }); return; }
      const { title, description, materialType, mediaAssetId, externalUrl, isPublished, contentCategory, lectureDate } = req.body as {
        title?: string; description?: string | null; materialType?: string;
        mediaAssetId?: number | null; externalUrl?: string | null; isPublished?: boolean;
        contentCategory?: string; lectureDate?: string | null;
      };
      res.json(await batchMaterialService.update(req.user!, id, {
        title,
        description,
        materialType,
        mediaAssetId: mediaAssetId === undefined ? undefined : mediaAssetId ? Number(mediaAssetId) : null,
        externalUrl,
        isPublished,
        contentCategory,
        lectureDate,
      }));
    } catch (err) { handleError(res, err); }
  },

  setPublished: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid material id' }); return; }
      const isPublished = req.body?.isPublished === undefined ? true : Boolean(req.body.isPublished);
      res.json(await batchMaterialService.setPublished(req.user!, id, isPublished));
    } catch (err) { handleError(res, err); }
  },

  archive: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid material id' }); return; }
      res.json(await batchMaterialService.archive(req.user!, id));
    } catch (err) { handleError(res, err); }
  },

  getStudentLecture: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid material id' }); return; }
      res.json(await batchMaterialService.getStudentLecture(req.user!, id));
    } catch (err) { handleError(res, err); }
  },

  recordProgress: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid material id' }); return; }
      res.status(201).json(await batchMaterialService.recordLectureProgress(req.user!, id, req.body ?? {}));
    } catch (err) { handleError(res, err); }
  },

  submitFeedback: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid material id' }); return; }
      res.json(await batchMaterialService.submitLectureFeedback(req.user!, id, req.body ?? {}));
    } catch (err) { handleError(res, err); }
  },

  teacherFeedback: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid material id' }); return; }
      res.json(await batchMaterialService.getTeacherLectureFeedback(req.user!, id));
    } catch (err) { handleError(res, err); }
  },
};
