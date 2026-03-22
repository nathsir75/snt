import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { Prisma } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveBranchId(user: AuthPayload, queryBranchId?: number): number {
  if (isSuperAdmin(user.role)) {
    if (!queryBranchId) throw new Error('BRANCH_ID_REQUIRED');
    return queryBranchId;
  }
  if (!user.branchId) throw new Error('NO_BRANCH');
  return user.branchId;
}

function parseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val as T;
  try { return JSON.parse(val as string) as T; } catch { return fallback; }
}

// ── Service ───────────────────────────────────────────────────────────────────

export const branchCmsService = {

  getSettings: async (user: AuthPayload, queryBranchId?: number): Promise<BranchCmsSettings> => {
    const branchId = resolveBranchId(user, queryBranchId);

    const s = await prisma.branchSettings.findUnique({
      where:  { branchId },
      select: { logoUrl: true, tagline: true, mapLink: true, socialLinks: true, navItems: true, theme: true, branch: { select: { code: true } } },
    });

    const theme       = parseJson<Record<string, unknown>>(s?.theme, {});
    const socialLinks = parseJson<SocialLink[]>(s?.socialLinks, []);
    const navItems    = parseJson<NavItem[]>(s?.navItems, []);
    const seo         = parseJson<Record<string, PageSeo>>(theme['seo'], {});

    console.log(`[BranchCMS] getSettings — branchId=${branchId}`);
    return {
      branchCode:   s?.branch?.code  ?? null,
      logoUrl:      s?.logoUrl      ?? null,
      tagline:      s?.tagline      ?? null,
      phone:        (theme['phone']        as string | undefined) ?? null,
      whatsapp:     (theme['whatsapp']      as string | undefined) ?? null,
      email:        (theme['email']        as string | undefined) ?? null,
      address:      (theme['address']      as string | undefined) ?? null,
      workingHours: (theme['workingHours'] as string | undefined) ?? null,
      mapLink:      s?.mapLink      ?? null,
      socialLinks,
      primaryColor: (theme['primaryColor'] as string | undefined) ?? null,
      websiteTitle: (theme['websiteTitle'] as string | undefined) ?? null,
      footerText:   (theme['footerText']   as string | undefined) ?? null,
      navItems,
      seo,
    };
  },

  updateSettings: async (
    user: AuthPayload,
    body: Partial<BranchCmsSettings>,
    queryBranchId?: number,
  ): Promise<BranchCmsSettings> => {
    const branchId = resolveBranchId(user, queryBranchId);

    const existing     = await prisma.branchSettings.findUnique({ where: { branchId }, select: { theme: true } });
    const existingTheme = parseJson<Record<string, unknown>>(existing?.theme, {});

    const updatedTheme: Record<string, unknown> = {
      ...existingTheme,
      ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
      ...(body.websiteTitle !== undefined && { websiteTitle: body.websiteTitle }),
      ...(body.footerText   !== undefined && { footerText:   body.footerText }),
      ...(body.phone        !== undefined && { phone:        body.phone }),
      ...(body.whatsapp     !== undefined && { whatsapp:     body.whatsapp }),
      ...(body.email        !== undefined && { email:        body.email }),
      ...(body.address      !== undefined && { address:      body.address }),
      ...(body.workingHours !== undefined && { workingHours: body.workingHours }),
      ...(body.seo          !== undefined && { seo:          body.seo }),
    };

    const updateData: Prisma.BranchSettingsUpdateInput = {
      ...(body.logoUrl     !== undefined && { logoUrl:     body.logoUrl }),
      ...(body.tagline     !== undefined && { tagline:     body.tagline }),
      ...(body.mapLink     !== undefined && { mapLink:     body.mapLink }),
      ...(body.socialLinks !== undefined && { socialLinks: body.socialLinks as unknown as Prisma.InputJsonValue }),
      ...(body.navItems    !== undefined && { navItems:    body.navItems    as unknown as Prisma.InputJsonValue }),
      theme: updatedTheme as Prisma.InputJsonValue,
    };

    const createData: Prisma.BranchSettingsUncheckedCreateInput = {
      branchId,
      logoUrl:     (body.logoUrl     !== undefined ? body.logoUrl     : undefined) ?? undefined,
      tagline:     (body.tagline     !== undefined ? body.tagline     : undefined) ?? undefined,
      mapLink:     (body.mapLink     !== undefined ? body.mapLink     : undefined) ?? undefined,
      socialLinks: body.socialLinks !== undefined ? (body.socialLinks as unknown as Prisma.InputJsonValue) : [],
      navItems:    body.navItems    !== undefined ? (body.navItems    as unknown as Prisma.InputJsonValue) : [],
      theme:       updatedTheme as Prisma.InputJsonValue,
    };

    await prisma.branchSettings.upsert({
      where:  { branchId },
      create: createData,
      update: updateData,
    });

    console.log(`[BranchCMS] updateSettings — branchId=${branchId}`);
    return branchCmsService.getSettings(user, queryBranchId);
  },
};
