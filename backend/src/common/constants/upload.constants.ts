// ─── Upload category → MediaAsset.mediaType mapping ──────────────────────────

export const UPLOAD_CATEGORIES = ['image', 'pdf', 'ppt', 'document', 'video'] as const;
export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

// Maps uploadCategory (form field) to MediaAsset.mediaType (DB value)
// They are identical here but kept separate so future divergence is easy
export const CATEGORY_TO_MEDIA_TYPE: Record<UploadCategory, string> = {
  image:    'image',
  pdf:      'pdf',
  ppt:      'ppt',
  document: 'document',
  video:    'video',
};

// ─── Allowed extensions per category ─────────────────────────────────────────

export const ALLOWED_EXTENSIONS: Record<UploadCategory, string[]> = {
  image:    ['.jpg', '.jpeg', '.png', '.webp'],
  pdf:      ['.pdf'],
  ppt:      ['.ppt', '.pptx'],
  document: ['.doc', '.docx', '.txt', '.xls', '.xlsx', '.zip'],
  video:    ['.mp4', '.webm', '.mov'],
};

// ─── Allowed MIME types per category ─────────────────────────────────────────

export const ALLOWED_MIMES: Record<UploadCategory, string[]> = {
  image: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  pdf: [
    'application/pdf',
  ],
  ppt: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  document: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ],
};
