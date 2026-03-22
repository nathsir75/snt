export interface PublicBranchMeta {
  id: number;
  name: string;
  code: string;
  city: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  websiteTitle: string | null;
  footerText: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  workingHours: string | null;
  mapLink: string | null;
  socialLinks: { platform: string; url: string }[];
  navItems: { label: string; slug: string; order: number; visible: boolean }[];
}
