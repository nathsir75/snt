// ── Image reference — stored alongside every imageUrl ────────────────────────
// fileUrl is the canonical value consumed by the public renderer.
// mediaAssetId + mediaAssetTitle are stored for the admin UI only (preview, label).
export interface DcImageRef {
  fileUrl:         string;   // served URL — used by public site
  mediaAssetId:    number | null;
  mediaAssetTitle: string;
}

export const EMPTY_IMAGE_REF: DcImageRef = { fileUrl: '', mediaAssetId: null, mediaAssetTitle: '' };

// ── Group interfaces ──────────────────────────────────────────────────────────

export interface DcHomeHero {
  visible:    boolean;
  badgeText:  string;
  title:      string;
  subtitle:   string;
  cta1Label:  string;
  cta1Link:   string;
  cta2Label:  string;
  cta2Link:   string;
  heroImage:  DcImageRef;   // main illustration / photo beside text
  bgImage:    DcImageRef;   // optional full-bleed background
}

export interface DcStatItem {
  value: string;
  label: string;
}

export interface DcHomepageStats {
  visible: boolean;
  items:   DcStatItem[];
}

export interface DcHeroGroup {
  visible:   boolean;
  title:     string;
  subtitle:  string;
  heroImage: DcImageRef;
}

export interface DcFranchiseHero {
  visible:   boolean;
  title:     string;
  subtitle:  string;
  heroImage: DcImageRef;
  bgImage:   DcImageRef;
}

export interface DcAnnouncementBar {
  visible:   boolean;
  text:      string;
  bgColor:   string;
  textColor: string;
  linkLabel: string;
  linkUrl:   string;
}

export interface DcFooterLink   { label: string; url: string; }
export interface DcFooterColumn { heading: string; links: DcFooterLink[]; }

export interface DcFooterDisplay {
  tagline:         string;
  copyright:       string;
  showSocialLinks: boolean;
  showAddress:     boolean;
  showPhone:       boolean;
  showEmail:       boolean;
  columns:         DcFooterColumn[];
}

export interface DcOgImage {
  defaultOgImage: DcImageRef;   // fallback OG image for all pages
  logoImage:      DcImageRef;   // site logo used in header / emails
}

// ── Root data shape ───────────────────────────────────────────────────────────

export interface DisplayControlData {
  homeHero:            DcHomeHero;
  homepageStats:       DcHomepageStats;
  branchLocationsHero: DcHeroGroup;
  contactHero:         DcHeroGroup;
  franchiseHero:       DcFranchiseHero;
  placementsHero:      DcHeroGroup;
  announcementBar:     DcAnnouncementBar;
  footerDisplay:       DcFooterDisplay;
  ogImage:             DcOgImage;
}

export interface DisplayControlResponse {
  data:      DisplayControlData;
  updatedAt: string | null;
  updatedBy: string | null;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DC_DEFAULTS: DisplayControlData = {
  homeHero: {
    visible:   true,
    badgeText: "🏆 India's #1 IT Training Franchise Network",
    title:     'Launch Your Career in IT & Technology',
    subtitle:  'Industry-aligned courses, guaranteed placement support, and a technology platform built for the modern learner.',
    cta1Label: 'Explore Courses →',
    cta1Link:  '/courses',
    cta2Label: 'Open a Franchise',
    cta2Link:  '/become-a-partner',
    heroImage: { ...EMPTY_IMAGE_REF },
    bgImage:   { ...EMPTY_IMAGE_REF },
  },
  homepageStats: {
    visible: true,
    items: [
      { value: '10,000+', label: 'Students Placed' },
      { value: '50+',     label: 'Hiring Companies' },
      { value: '6.5 LPA', label: 'Average Package' },
      { value: '95%',     label: 'Placement Rate' },
    ],
  },
  branchLocationsHero: {
    visible:   true,
    title:     'Our Branch Network',
    subtitle:  'Find an SNT Education centre near you. 30+ branches across India.',
    heroImage: { ...EMPTY_IMAGE_REF },
  },
  contactHero: {
    visible:   true,
    title:     "We'd Love to Hear From You",
    subtitle:  "Whether you're a student, corporate client, or franchise aspirant — our team is ready to help.",
    heroImage: { ...EMPTY_IMAGE_REF },
  },
  franchiseHero: {
    visible:   true,
    title:     'Own a Profitable IT Training Centre',
    subtitle:  "Join SNT's franchise network and build a sustainable education business with our proven model.",
    heroImage: { ...EMPTY_IMAGE_REF },
    bgImage:   { ...EMPTY_IMAGE_REF },
  },
  placementsHero: {
    visible:   true,
    title:     'Our Placement Success Stories',
    subtitle:  '10,000+ students placed in top IT companies across India.',
    heroImage: { ...EMPTY_IMAGE_REF },
  },
  announcementBar: {
    visible:   false,
    text:      '🎉 New batch starting soon! Enroll now.',
    bgColor:   '#6366f1',
    textColor: '#ffffff',
    linkLabel: '',
    linkUrl:   '',
  },
  footerDisplay: {
    tagline:         "India's growing IT training & software consultancy network.",
    copyright:       '© 2024 SNT Super Net Technologies Pvt. Ltd. All rights reserved.',
    showSocialLinks: true,
    showAddress:     true,
    showPhone:       true,
    showEmail:       true,
    columns: [
      { heading: 'Quick Links',  links: [{ label: 'Home', url: '/home' }, { label: 'Courses', url: '/courses' }, { label: 'About Us', url: '/about' }, { label: 'Contact', url: '/contact' }] },
      { heading: 'For Business', links: [{ label: 'Franchise Model', url: '/franchise-model' }, { label: 'Corporate Training', url: '/corporate-training' }, { label: 'College Partnerships', url: '/college-partnerships' }] },
    ],
  },
  ogImage: {
    defaultOgImage: { ...EMPTY_IMAGE_REF },
    logoImage:      { ...EMPTY_IMAGE_REF },
  },
};

// ── Group metadata ────────────────────────────────────────────────────────────

export type DcGroupKey =
  | 'homeHero' | 'homepageStats' | 'branchLocationsHero' | 'contactHero'
  | 'franchiseHero' | 'placementsHero' | 'announcementBar' | 'footerDisplay' | 'ogImage';

export interface DcGroupMeta {
  key:         DcGroupKey;
  label:       string;
  icon:        string;
  description: string;
}

export const DC_GROUPS: DcGroupMeta[] = [
  { key: 'homeHero',            label: 'Home Hero',               icon: '🦸', description: 'Badge, title, subtitle, CTA buttons, hero image and background' },
  { key: 'homepageStats',       label: 'Homepage Stats Bar',      icon: '📊', description: 'Purple stats band — placement numbers, companies, packages' },
  { key: 'branchLocationsHero', label: 'Branch Locations Hero',   icon: '📍', description: 'Hero section on the /branch-locations page' },
  { key: 'contactHero',         label: 'Contact Page Hero',       icon: '📞', description: 'Hero section on the /contact page' },
  { key: 'franchiseHero',       label: 'Franchise / Partner Hero',icon: '🤝', description: 'Hero on /become-a-partner and /franchise-model pages' },
  { key: 'placementsHero',      label: 'Placements Hero',         icon: '🚀', description: 'Hero section on the /placements page' },
  { key: 'announcementBar',     label: 'Global Announcement Bar', icon: '📢', description: 'Sticky top banner on all public pages — toggle, text, colour' },
  { key: 'footerDisplay',       label: 'Footer Display',          icon: '🔻', description: 'Tagline, copyright, visibility toggles and link columns' },
  { key: 'ogImage',             label: 'OG / Logo Images',        icon: '🖼️', description: 'Default social share image and site logo' },
];
