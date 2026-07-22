// ── Content types ─────────────────────────────────────────────────────────────
export type ContentItemType = 'pdf' | 'ppt' | 'video' | 'lab';

export const CONTENT_TYPE_LABELS: Record<ContentItemType, string> = {
  pdf:   'PDF',
  ppt:   'Presentation',
  video: 'Video',
  lab:   'Lab / Exercise',
};

export const CONTENT_TYPE_ICONS: Record<ContentItemType, string> = {
  pdf:   '📄',
  ppt:   '📊',
  video: '▶️',
  lab:   '🧪',
};

// ── Core models ───────────────────────────────────────────────────────────────
export interface ContentItem {
  id: number;
  type: ContentItemType;
  title: string;
  fileUrl: string;
  convertedPdfUrl: string | null;
  thumbnailUrl: string | null;
  isPreview: boolean;
  createdAt: string;
  updatedAt: string;
  sessionId: number;
}

export interface Session {
  id: number;
  title: string;
  order: number;
  durationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  courseContentId: number;
  contentItems: ContentItem[];
}

export interface CourseContentMeta {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  course: { id: number; name: string; code: string };
}

// Full nested response from GET /lms/course-content/:courseId
export interface CourseContentResponse {
  courseContent: CourseContentMeta;
  sessions: Session[];
}

// ── Request payloads ──────────────────────────────────────────────────────────
export interface CreateCourseContentPayload {
  courseId: number;
  title: string;
  description?: string;
}

export interface AddSessionPayload {
  courseContentId: number;
  title: string;
  order: number;
  durationMinutes?: number;
}

export interface AddContentItemPayload {
  sessionId: number;
  type: ContentItemType;
  title: string;
  fileUrl: string;
  convertedPdfUrl?: string | null;
  thumbnailUrl?: string;
  isPreview?: boolean;
}

export interface UpdateContentItemPayload {
  type?: ContentItemType;
  title?: string;
  fileUrl?: string;
  convertedPdfUrl?: string | null;
  isPreview?: boolean;
}
