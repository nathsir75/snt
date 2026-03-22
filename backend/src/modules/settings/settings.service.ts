import prisma from '../../db/prisma';

// Global app settings are stored as BranchSettings with branchId = null workaround.
// Since BranchSettings requires a branchId FK, we store global settings in a
// dedicated singleton row keyed to the first branch (id=1) with a special marker,
// OR we use a simple in-memory/file store. For simplicity we use a Prisma-backed
// approach: super_admin settings are stored as BranchSettings for their own branch
// (branchId from JWT), and branch_admin settings are stored for their branch.

export interface SettingsData {
  appName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  publicTitle: string | null;
  tagline: string | null;
  footerText: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  timezone: string;
  currency: string;
  updatedAt?: string;
}

const DEFAULTS: SettingsData = {
  appName:      'SNT Education',
  logoUrl:      null,
  faviconUrl:   null,
  primaryColor: '#6366f1',
  accentColor:  '#8b5cf6',
  publicTitle:  null,
  tagline:      null,
  footerText:   null,
  supportEmail: null,
  supportPhone: null,
  timezone:     'Asia/Kolkata',
  currency:     'INR',
};

function parseTheme(theme: unknown): Record<string, unknown> {
  if (!theme) return {};
  if (typeof theme === 'object') return theme as Record<string, unknown>;
  try { return JSON.parse(theme as string); } catch { return {}; }
}

export const settingsService = {
  get: async (branchId: number | null): Promise<SettingsData> => {
    if (!branchId) return { ...DEFAULTS };

    const row = await prisma.branchSettings.findUnique({ where: { branchId } });
    if (!row) return { ...DEFAULTS };

    const theme = parseTheme(row.theme);
    return {
      appName:      (theme['appName']      as string)  ?? DEFAULTS.appName,
      logoUrl:      row.logoUrl                        ?? null,
      faviconUrl:   (theme['faviconUrl']   as string)  ?? null,
      primaryColor: (theme['primaryColor'] as string)  ?? DEFAULTS.primaryColor,
      accentColor:  (theme['accentColor']  as string)  ?? DEFAULTS.accentColor,
      publicTitle:  (theme['websiteTitle'] as string)  ?? null,
      tagline:      row.tagline                        ?? null,
      footerText:   (theme['footerText']   as string)  ?? null,
      supportEmail: (theme['supportEmail'] as string)  ?? null,
      supportPhone: (theme['supportPhone'] as string)  ?? null,
      timezone:     (theme['timezone']     as string)  ?? DEFAULTS.timezone,
      currency:     (theme['currency']     as string)  ?? DEFAULTS.currency,
      updatedAt:    row.updatedAt.toISOString(),
    };
  },

  update: async (branchId: number | null, data: Partial<SettingsData>): Promise<SettingsData> => {
    if (!branchId) {
      // super_admin with no branch — return merged defaults (no persistence needed)
      return { ...DEFAULTS, ...data };
    }

    const existing = await prisma.branchSettings.findUnique({ where: { branchId } });
    const currentTheme = parseTheme(existing?.theme);

    const newTheme = {
      ...currentTheme,
      ...(data.appName      !== undefined && { appName:      data.appName }),
      ...(data.faviconUrl   !== undefined && { faviconUrl:   data.faviconUrl }),
      ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
      ...(data.accentColor  !== undefined && { accentColor:  data.accentColor }),
      ...(data.publicTitle  !== undefined && { websiteTitle: data.publicTitle }),
      ...(data.footerText   !== undefined && { footerText:   data.footerText }),
      ...(data.supportEmail !== undefined && { supportEmail: data.supportEmail }),
      ...(data.supportPhone !== undefined && { supportPhone: data.supportPhone }),
      ...(data.timezone     !== undefined && { timezone:     data.timezone }),
      ...(data.currency     !== undefined && { currency:     data.currency }),
    };

    const row = await prisma.branchSettings.upsert({
      where:  { branchId },
      create: {
        branchId,
        logoUrl: data.logoUrl ?? null,
        tagline: data.tagline ?? null,
        theme:   newTheme,
      },
      update: {
        ...(data.logoUrl  !== undefined && { logoUrl: data.logoUrl }),
        ...(data.tagline  !== undefined && { tagline: data.tagline }),
        theme: newTheme,
      },
    });

    const theme = parseTheme(row.theme);
    return {
      appName:      (theme['appName']      as string) ?? DEFAULTS.appName,
      logoUrl:      row.logoUrl                       ?? null,
      faviconUrl:   (theme['faviconUrl']   as string) ?? null,
      primaryColor: (theme['primaryColor'] as string) ?? DEFAULTS.primaryColor,
      accentColor:  (theme['accentColor']  as string) ?? DEFAULTS.accentColor,
      publicTitle:  (theme['websiteTitle'] as string) ?? null,
      tagline:      row.tagline                       ?? null,
      footerText:   (theme['footerText']   as string) ?? null,
      supportEmail: (theme['supportEmail'] as string) ?? null,
      supportPhone: (theme['supportPhone'] as string) ?? null,
      timezone:     (theme['timezone']     as string) ?? DEFAULTS.timezone,
      currency:     (theme['currency']     as string) ?? DEFAULTS.currency,
      updatedAt:    row.updatedAt.toISOString(),
    };
  },
};
