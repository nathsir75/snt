// ── Shared primitives ─────────────────────────────────────────────────────────

export interface CtaButton {
  label: string;
  link: string;
  variant: 'primary' | 'outline' | 'white-outline';
}

export interface StatCard {
  icon: string;
  value: string;
  label: string;
}

export interface FeatureCard {
  icon: string;
  title: string;
  desc: string;
}

export interface TestimonialItem {
  name: string;
  role: string;
  company: string;
  text: string;
}

export interface HeroContent {
  badgeText: string;
  title: string;
  subtitle: string;
  cta1: CtaButton;
  cta2: CtaButton;
  imageUrl: string;
  imageAlign: 'left' | 'right';
  trustPoints: string[];
  stats: StatCard[];
  visible: boolean;
}

// ── Per-page content configs ──────────────────────────────────────────────────

export interface HomePageContent {
  hero: HeroContent;
  statsBar: { visible: boolean; items: StatCard[] };
  featuresSection: { visible: boolean; eyebrow: string; title: string; items: FeatureCard[] };
  franchiseCta: {
    visible: boolean; eyebrow: string; title: string; subtitle: string;
    points: string[]; cta1: CtaButton; cta2: CtaButton; stats: StatCard[];
  };
  testimonials: { visible: boolean; eyebrow: string; title: string; items: TestimonialItem[] };
  finalCta: { visible: boolean; title: string; subtitle: string; cta1: CtaButton; cta2: CtaButton };
}

export interface AboutPageContent {
  hero: HeroContent;
  missionVision: {
    visible: boolean;
    mission: { icon: string; title: string; text: string };
    vision:  { icon: string; title: string; text: string };
    values:  { icon: string; title: string; text: string };
  };
  story: {
    visible: boolean; eyebrow: string; title: string; paragraphs: string[];
    ctaLabel: string; ctaLink: string;
    milestones: { year: string; title: string; desc: string }[];
  };
  team: { visible: boolean; eyebrow: string; title: string; members: { name: string; role: string; bio: string }[] };
  cta: { visible: boolean; title: string; cta1: CtaButton; cta2: CtaButton };
}

export interface ContactPageContent {
  hero: HeroContent;
  contactItems: { icon: string; label: string; value: string }[];
  officeHours: { weekdays: string; sunday: string };
  formTitle: string;
  visible: boolean;
}

export interface BecomePartnerPageContent {
  hero: HeroContent;
  whyPoints: { icon: string; label: string }[];
  nextSteps: { num: string; title: string; desc: string }[];
  quickFacts: { icon: string; value: string; label: string }[];
  contactPhone: string;
  contactHours: string;
  visible: boolean;
}

export interface GlobalSiteContent {
  siteName: string;
  tagline: string;
  logoText: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
  whatsapp: string;
  address: string;
  mapLink: string;
  workingHours: string;
  footerDesc: string;
  footerCopyright: string;
  primaryColor: string;
  socialLinks: { platform: string; url: string }[];
  navItems: { label: string; path: string; order: number; visible: boolean; linkedPageId?: number | null }[];
  announcementBar: { visible: boolean; text: string; bgColor: string };
}

export interface PageSeoConfig {
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  indexed: boolean;
}

export interface SiteSeoConfig {
  home: PageSeoConfig;
  about: PageSeoConfig;
  contact: PageSeoConfig;
  becomePartner: PageSeoConfig;
  courses: PageSeoConfig;
  placements: PageSeoConfig;
  careers: PageSeoConfig;
  internships: PageSeoConfig;
  corporateTraining: PageSeoConfig;
  collegePartnerships: PageSeoConfig;
  hireTalent: PageSeoConfig;
  franchise: PageSeoConfig;
}

export interface WebsiteCmsConfig {
  global: GlobalSiteContent;
  seo: SiteSeoConfig;
  home: HomePageContent;
  about: AboutPageContent;
  contact: ContactPageContent;
  becomePartner: BecomePartnerPageContent;
  lastUpdated: string;
  updatedBy: string;
}

export type CmsPageKey =
  | 'global' | 'seo' | 'home' | 'about' | 'contact' | 'becomePartner'
  | 'navigation' | 'collections' | 'siteEnquiries';

export interface CmsPageMeta {
  key: CmsPageKey;
  label: string;
  icon: string;
  publicRoute: string;
  description: string;
}

export const CMS_PAGES: CmsPageMeta[] = [
  { key: 'global',        label: 'Global / Footer',    icon: '🌐', publicRoute: '/home',             description: 'Site name, logo, contact info, footer, social links, announcement bar' },
  { key: 'navigation',    label: 'Navigation',          icon: '🧭', publicRoute: '/home',             description: 'Manage main website navigation menu items' },
  { key: 'seo',           label: 'SEO Settings',        icon: '🔍', publicRoute: '/home',             description: 'Meta titles, descriptions, OG images per page' },
  { key: 'home',          label: 'Home Page',           icon: '🏠', publicRoute: '/home',             description: 'Hero, stats bar, features, franchise CTA, testimonials' },
  { key: 'about',         label: 'About Us',            icon: 'ℹ️', publicRoute: '/about',            description: 'Hero, mission/vision, story, team, CTA band' },
  { key: 'contact',       label: 'Contact Page',        icon: '📞', publicRoute: '/contact',          description: 'Hero, contact info, office hours, form title' },
  { key: 'becomePartner', label: 'Become a Partner',    icon: '🤝', publicRoute: '/become-a-partner', description: 'Hero, why points, next steps, quick facts' },
  { key: 'collections',   label: 'Content Collections', icon: '📦', publicRoute: '/courses',          description: 'Courses, placements, careers, internships, testimonials, FAQs, announcements' },
  { key: 'siteEnquiries', label: 'Site Enquiries',      icon: '📬', publicRoute: '/contact',          description: 'All HO website form submissions — contact, partner, internship, corporate, college' },
];

// ── Site Collection types ─────────────────────────────────────────────────────

export type SiteCollectionType =
  | 'course' | 'placement' | 'career' | 'internship' | 'corporate'
  | 'college' | 'testimonial' | 'faq' | 'announcement' | 'branch_location';

export interface SiteCollectionItem {
  id: number;
  collectionType: SiteCollectionType;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  imageUrl: string | null;
  metaJson: Record<string, unknown>;
  isPublished: boolean;
  isFeatured: boolean;
  displayOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteEnquiry {
  id: number;
  enquiryType: string;
  fullName: string;
  email: string | null;
  phone: string;
  subject: string | null;
  message: string | null;
  metaJson: Record<string, unknown>;
  status: string;
  notes: string | null;
  createdAt: string;
}

export const SITE_COLLECTION_DEFS: { type: SiteCollectionType; label: string; icon: string; publicRoute: string }[] = [
  { type: 'course',          label: 'Courses',              icon: '📚', publicRoute: '/courses' },
  { type: 'placement',       label: 'Placements / Stories', icon: '🏆', publicRoute: '/placements' },
  { type: 'career',          label: 'Career Openings',      icon: '💼', publicRoute: '/careers' },
  { type: 'internship',      label: 'Internships',          icon: '🎓', publicRoute: '/internships' },
  { type: 'corporate',       label: 'Corporate Training',   icon: '🏢', publicRoute: '/corporate-training' },
  { type: 'college',         label: 'College Programs',     icon: '🏫', publicRoute: '/college-partnerships' },
  { type: 'testimonial',     label: 'Testimonials',         icon: '💬', publicRoute: '/home' },
  { type: 'faq',             label: 'FAQs',                 icon: '❓', publicRoute: '/contact' },
  { type: 'announcement',    label: 'Announcements',        icon: '📢', publicRoute: '/home' },
  { type: 'branch_location', label: 'Branch Locations',     icon: '📍', publicRoute: '/branch-locations' },
];

export const SITE_ENQUIRY_TYPES: { type: string; label: string; icon: string }[] = [
  { type: 'contact',     label: 'Contact',              icon: '📞' },
  { type: 'partner',     label: 'Franchise / Partner',  icon: '🤝' },
  { type: 'internship',  label: 'Internship',           icon: '🎓' },
  { type: 'corporate',   label: 'Corporate Training',   icon: '🏢' },
  { type: 'college',     label: 'College Partnership',  icon: '🏫' },
  { type: 'career',      label: 'Career Application',   icon: '💼' },
  { type: 'hire_talent', label: 'Hire Talent',          icon: '🔍' },
];
