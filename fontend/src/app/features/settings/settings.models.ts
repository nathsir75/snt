export interface AppSettings {
  id?: number;
  branchId?: number | null;
  // Branding
  appName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  // Public website
  publicTitle: string | null;
  tagline: string | null;
  footerText: string | null;
  // Support / contact
  supportEmail: string | null;
  supportPhone: string | null;
  // Operational
  timezone: string;
  currency: string;
  updatedAt?: string;
}

export type UpdateSettingsPayload = Partial<Omit<AppSettings, 'id' | 'branchId' | 'updatedAt'>>;
