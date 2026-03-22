export type PageType    = 'home' | 'about' | 'courses' | 'gallery' | 'contact' | 'projects' | 'activities' | 'news' | 'awards' | 'clients' | 'custom';
export type SectionType = 'hero' | 'text' | 'gallery' | 'cta' | 'testimonials' | 'stats' | 'courses' | 'contact' | 'banner' | 'features' | 'collection';

export interface PageBranch {
  id: number;
  name: string;
  code: string;
}

export interface Page {
  id: number;
  branchId: number;
  title: string;
  slug: string;
  pageType: PageType;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  branch: PageBranch;
}

export interface PageSection {
  id: number;
  sectionType: SectionType;
  title: string | null;
  order: number;
  configJson: Record<string, unknown>;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PageWithSections extends Page {
  sections: PageSection[];
}

// ── Request payloads ──────────────────────────────────────────────────────────
export interface CreatePagePayload {
  branchId: number;
  title: string;
  slug: string;
  pageType?: PageType;
}

export interface UpdatePagePayload {
  title?: string;
  slug?: string;
  pageType?: PageType;
  isPublished?: boolean;
}

export interface AddSectionPayload {
  sectionType: SectionType;
  title?: string;
  order: number;
  configJson: Record<string, unknown>;
  isVisible?: boolean;
}

export interface UpdateSectionPayload {
  title?: string;
  order?: number;
  configJson?: Record<string, unknown>;
  isVisible?: boolean;
}

// ── Section config shapes (typed for editor) ──────────────────────────────────
export interface HeroConfig {
  heading: string;
  subheading?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface TextConfig {
  content: string;
  alignment?: 'left' | 'center' | 'right';
}

export interface ImageConfig {
  imageUrl: string;
  caption?: string;
  altText?: string;
}

export interface GalleryConfig {
  images: { url: string; caption?: string }[];
}

export interface CtaConfig {
  heading: string;
  subheading?: string;
  buttonLabel: string;
  buttonUrl: string;
  variant?: 'primary' | 'secondary';
}

export interface BannerConfig {
  text: string;
  imageUrl?: string;
  backgroundColor?: string;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero:         'Hero Banner',
  text:         'Text Block',
  gallery:      'Gallery',
  cta:          'Call to Action',
  testimonials: 'Testimonials',
  stats:        'Stats',
  courses:      'Courses',
  contact:      'Contact',
  banner:       'Banner',
  features:     'Feature Cards',
  collection:   'Collection',
};

export const SECTION_TYPE_ICONS: Record<SectionType, string> = {
  hero:         '🦸',
  text:         '📝',
  gallery:      '🖼️',
  cta:          '📣',
  testimonials: '💬',
  stats:        '📊',
  courses:      '📚',
  contact:      '📬',
  banner:       '🎯',
  features:     '✨',
  collection:   '📦',
};

export const PAGE_TYPE_OPTIONS: { value: PageType; label: string }[] = [
  { value: 'home',       label: 'Home' },
  { value: 'about',      label: 'About' },
  { value: 'courses',    label: 'Courses' },
  { value: 'gallery',    label: 'Gallery' },
  { value: 'contact',    label: 'Contact' },
  { value: 'projects',   label: 'Projects' },
  { value: 'activities', label: 'Activities' },
  { value: 'news',       label: 'News' },
  { value: 'awards',     label: 'Awards' },
  { value: 'clients',    label: 'Clients' },
  { value: 'custom',     label: 'Custom' },
];
