export interface NavItem {
  label:   string;
  slug:    string;
  order:   number;
  visible: boolean;
}

export interface SocialLink {
  platform: string;
  url:      string;
}

export interface PageSeo {
  metaTitle:       string;
  metaDescription: string;
  ogImageUrl:      string;
  slug:            string;
}

export interface BranchCmsSettings {
  branchCode:   string | null;
  logoUrl:      string | null;
  tagline:      string | null;
  phone:        string | null;
  whatsapp:     string | null;
  email:        string | null;
  address:      string | null;
  workingHours: string | null;
  mapLink:      string | null;
  socialLinks:  SocialLink[];
  primaryColor: string | null;
  websiteTitle: string | null;
  footerText:   string | null;
  navItems:     NavItem[];
  seo:          Record<string, PageSeo>;
}

export const CMS_PAGE_SLUGS: { key: string; label: string; icon: string }[] = [
  { key: 'home',       label: 'Home',        icon: '🏠' },
  { key: 'about',      label: 'About',       icon: 'ℹ️' },
  { key: 'courses',    label: 'Courses',     icon: '📚' },
  { key: 'projects',   label: 'Projects',    icon: '🏗️' },
  { key: 'activities', label: 'Activities',  icon: '🎯' },
  { key: 'news',       label: 'News',        icon: '📰' },
  { key: 'gallery',    label: 'Gallery',     icon: '🖼️' },
  { key: 'awards',     label: 'Awards',      icon: '🏆' },
  { key: 'clients',    label: 'Clients',     icon: '🤝' },
  { key: 'contact',    label: 'Contact',     icon: '📞' },
];

export const DEFAULT_SEO: PageSeo = {
  metaTitle:       '',
  metaDescription: '',
  ogImageUrl:      '',
  slug:            '',
};

export type CmsTab = 'settings' | 'navigation' | 'pages' | 'collections' | 'seo' | 'preview';

export const CMS_TABS: { key: CmsTab; label: string; icon: string }[] = [
  { key: 'settings',    label: 'Website Settings', icon: '⚙️' },
  { key: 'navigation',  label: 'Navigation',        icon: '🧭' },
  { key: 'pages',       label: 'Page Content',      icon: '📄' },
  { key: 'collections', label: 'Collections',       icon: '📦' },
  { key: 'seo',         label: 'SEO',               icon: '🔍' },
  { key: 'preview',     label: 'Preview & Publish',  icon: '🚀' },
];

// ── Content Collections ───────────────────────────────────────────────────────

export type CollectionType = 'project' | 'activity' | 'news' | 'gallery' | 'award' | 'client';

export interface CollectionItem {
  id: number;
  branchId: number;
  collectionType: CollectionType;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  imageUrl: string | null;
  metaJson: Record<string, unknown>;
  isPublished: boolean;
  displayOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionItemPayload {
  collectionType: CollectionType;
  title: string;
  slug?: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  metaJson?: Record<string, unknown>;
  displayOrder?: number;
}

export interface UpdateCollectionItemPayload {
  title?: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  metaJson?: Record<string, unknown>;
  displayOrder?: number;
  isPublished?: boolean;
}

export const COLLECTION_DEFS: { type: CollectionType; label: string; icon: string; fields: string[] }[] = [
  { type: 'project',  label: 'Projects',   icon: '🏗️', fields: ['title','summary','content','imageUrl','tech','featured'] },
  { type: 'activity', label: 'Activities', icon: '🎯', fields: ['title','summary','content','imageUrl','eventDate'] },
  { type: 'news',     label: 'News',       icon: '📰', fields: ['title','summary','content','imageUrl','publishDate'] },
  { type: 'gallery',  label: 'Gallery',    icon: '🖼️', fields: ['title','imageUrl','category'] },
  { type: 'award',    label: 'Awards',     icon: '🏆', fields: ['title','summary','imageUrl','year'] },
  { type: 'client',   label: 'Clients',    icon: '🤝', fields: ['title','imageUrl','category','website'] },
];

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: 'Home',    slug: '',        order: 1, visible: true },
  { label: 'About',   slug: 'about',   order: 2, visible: true },
  { label: 'Courses', slug: 'courses', order: 3, visible: true },
  { label: 'Contact', slug: 'contact', order: 4, visible: true },
];
