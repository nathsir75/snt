import prisma from '../../db/prisma';

// ── Defaults ──────────────────────────────────────────────────────────────────

const SITE_SETTINGS_DEFAULTS = {
  id:              0,
  siteName:        'SNT Education',
  tagline:         'Empowering Careers',
  logoText:        'SNT',
  logoUrl:         null,
  supportEmail:    'mnath.snt@gmail.com',
  supportPhone:    '+91 98765 43210',
  whatsapp:        '+91 98765 43210',
  address:         'F-177/4, Flat No. 1, UG/F, Maa Saraswati Apartment, Mehrauli, New Delhi – 110030',
  mapLink:         null,
  workingHours:    'Mon–Sat: 9 AM – 7 PM',
  footerDesc:      "India's growing IT training & software consultancy network.",
  footerCopyright: '© 2024 SNT Super Net Technologies Pvt. Ltd. All rights reserved.',
  primaryColor:    '#6366f1',
  socialLinks:     [],
  navItems:        [],
  announcementBar: { visible: false, text: '', bgColor: '#6366f1' },
  seoDefaults:     {},
  chatbotJson:     {},
  displayControlJson: {},
  updatedAt:       new Date(),
  updatedBy:       null,
};

export const DISPLAY_CONTROL_DEFAULTS = {
  homeHero: {
    visible:   true,
    badgeText: "🏆 India's #1 IT Training Franchise Network",
    title:     'Launch Your Career in IT & Technology',
    subtitle:  'Industry-aligned courses, guaranteed placement support, and a technology platform built for the modern learner.',
    cta1Label: 'Explore Courses →',
    cta1Link:  '/courses',
    cta2Label: 'Open a Franchise',
    cta2Link:  '/become-a-partner',
    heroImage: { fileUrl: '', mediaAssetId: null, mediaAssetTitle: '' },
    bgImage:   { fileUrl: '', mediaAssetId: null, mediaAssetTitle: '' },
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
    heroImage: { fileUrl: '', mediaAssetId: null, mediaAssetTitle: '' },
  },
  contactHero: {
    visible:   true,
    title:     "We'd Love to Hear From You",
    subtitle:  "Whether you're a student, corporate client, or franchise aspirant — our team is ready to help.",
    heroImage: { fileUrl: '', mediaAssetId: null, mediaAssetTitle: '' },
  },
  franchiseHero: {
    visible:   true,
    title:     'Own a Profitable IT Training Centre',
    subtitle:  "Join SNT's franchise network and build a sustainable education business with our proven model.",
    heroImage: { fileUrl: '', mediaAssetId: null, mediaAssetTitle: '' },
    bgImage:   { fileUrl: '', mediaAssetId: null, mediaAssetTitle: '' },
  },
  placementsHero: {
    visible:   true,
    title:     'Our Placement Success Stories',
    subtitle:  '10,000+ students placed in top IT companies across India.',
    heroImage: { fileUrl: '', mediaAssetId: null, mediaAssetTitle: '' },
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
    defaultOgImage: { fileUrl: '', mediaAssetId: null, mediaAssetTitle: '' },
    logoImage:      { fileUrl: '', mediaAssetId: null, mediaAssetTitle: '' },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Deep-merge: for each top-level group key, merge stored value over defaults.
// This ensures new fields added to defaults are never lost when old data is stored.
function parseDisplayControl(raw: unknown): typeof DISPLAY_CONTROL_DEFAULTS {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DISPLAY_CONTROL_DEFAULTS;
  const stored = raw as Record<string, unknown>;
  const result = { ...DISPLAY_CONTROL_DEFAULTS } as Record<string, unknown>;
  for (const key of Object.keys(DISPLAY_CONTROL_DEFAULTS) as (keyof typeof DISPLAY_CONTROL_DEFAULTS)[]) {
    if (key in stored && stored[key] !== null && typeof stored[key] === 'object' && !Array.isArray(stored[key])) {
      result[key] = { ...(DISPLAY_CONTROL_DEFAULTS[key] as object), ...(stored[key] as object) };
    } else if (key in stored) {
      result[key] = stored[key];
    }
  }
  return result as typeof DISPLAY_CONTROL_DEFAULTS;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const siteSettingsService = {
  get: async () => {
    try {
      let settings = await prisma.siteSettings.findFirst();
      if (!settings) {
        console.log('[SiteSettings] No row found — auto-creating defaults');
        try {
          settings = await prisma.siteSettings.create({
            data: {
              siteName:        'SNT Education',
              tagline:         'Empowering Careers',
              logoText:        'SNT',
              supportEmail:    'mnath.snt@gmail.com',
              supportPhone:    '+91 98765 43210',
              whatsapp:        '+91 98765 43210',
              address:         'F-177/4, Flat No. 1, UG/F, Maa Saraswati Apartment, Mehrauli, New Delhi – 110030',
              footerDesc:      "India's growing IT training & software consultancy network.",
              footerCopyright: '© 2024 SNT Super Net Technologies Pvt. Ltd. All rights reserved.',
              socialLinks:     [],
              navItems:        [],
              announcementBar: { visible: false, text: '', bgColor: '#6366f1' },
              seoDefaults:     {},
              chatbotJson:     {},
              displayControlJson: DISPLAY_CONTROL_DEFAULTS,
            },
          });
        } catch (createErr) {
          console.error('[SiteSettings] Auto-create failed — returning in-memory defaults:', createErr);
          return SITE_SETTINGS_DEFAULTS;
        }
      }
      return settings;
    } catch (err) {
      console.error('[SiteSettings] get() DB error — returning in-memory defaults. Stack:', err);
      return SITE_SETTINGS_DEFAULTS;
    }
  },

  update: async (data: Record<string, unknown>, updatedBy: string) => {
    const existing = await prisma.siteSettings.findFirst();
    if (existing) {
      return prisma.siteSettings.update({
        where: { id: existing.id },
        data: { ...data, updatedBy } as any,
      });
    }
    return prisma.siteSettings.create({ data: { ...data, updatedBy } as any });
  },

  // ── Display Control ────────────────────────────────────────────────────────

  getDisplayControl: async () => {
    try {
      const settings = await prisma.siteSettings.findFirst({
        select: { displayControlJson: true, updatedAt: true, updatedBy: true },
      });
      return {
        data:      parseDisplayControl(settings?.displayControlJson),
        updatedAt: settings?.updatedAt ?? null,
        updatedBy: settings?.updatedBy ?? null,
      };
    } catch (err) {
      console.error('[SiteSettings] getDisplayControl error:', err);
      return { data: DISPLAY_CONTROL_DEFAULTS, updatedAt: null, updatedBy: null };
    }
  },

  updateDisplayControl: async (patch: Record<string, unknown>, updatedBy: string) => {
    const existing = await prisma.siteSettings.findFirst();
    const current  = parseDisplayControl(existing?.displayControlJson);
    const merged   = { ...current, ...patch };

    if (existing) {
      const updated = await prisma.siteSettings.update({
        where:  { id: existing.id },
        data:   { displayControlJson: merged as any, updatedBy },
        select: { displayControlJson: true, updatedAt: true, updatedBy: true },
      });
      return {
        data:      parseDisplayControl(updated.displayControlJson),
        updatedAt: updated.updatedAt,
        updatedBy: updated.updatedBy,
      };
    }

    const created = await prisma.siteSettings.create({
      data:   { displayControlJson: merged as any, updatedBy } as any,
      select: { displayControlJson: true, updatedAt: true, updatedBy: true },
    });
    return {
      data:      parseDisplayControl(created.displayControlJson),
      updatedAt: created.updatedAt,
      updatedBy: created.updatedBy,
    };
  },
};
