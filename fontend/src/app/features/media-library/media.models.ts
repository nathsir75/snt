export type MediaType     = 'image' | 'pdf' | 'ppt' | 'video' | 'document';
export type ProviderType  = 'local' | 'external' | 'youtube' | 'vimeo' | 'r2';
export type OwnerScope    = 'global' | 'branch';
export type UploadCategory = 'image' | 'pdf' | 'ppt' | 'document' | 'video';

export interface MediaBranch {
  id: number;
  name: string;
  code: string;
}

export interface MediaCreatedBy {
  id: number;
  name: string;
}

export interface MediaAsset {
  id: number;
  title: string;
  description: string | null;
  mediaType: MediaType;
  providerType: ProviderType;
  fileUrl: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  fileSizeKb: number | null;
  ownerScope: OwnerScope;
  branchId: number | null;
  tagsJson: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch: MediaBranch | null;
  createdBy: MediaCreatedBy;
}

// Upload gateway response
export interface UploadResult {
  asset: MediaAsset;
  fileUrl: string;
}

export const MEDIA_TYPE_ICONS: Record<MediaType, string> = {
  image:    '🖼️',
  pdf:      '📄',
  ppt:      '📊',
  video:    '▶️',
  document: '📝',
};

export const UPLOAD_CATEGORY_OPTIONS: { value: UploadCategory; label: string }[] = [
  { value: 'image',    label: 'Image' },
  { value: 'pdf',      label: 'PDF' },
  { value: 'ppt',      label: 'Presentation' },
  { value: 'document', label: 'Document' },
  { value: 'video',    label: 'Video' },
];
