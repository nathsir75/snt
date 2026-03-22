import prisma from '../../db/prisma';

function parseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val as T;
  try { return JSON.parse(val as string) as T; } catch { return fallback; }
}

const BRANCH_LIST_SELECT = {
  id:               true,
  name:             true,
  code:             true,
  city:             true,
  state:            true,
  status:           true,
  isPublic:         true,
  websiteEnabled:   true,
  publicPriority:   true,
  publicPhone:      true,
  publicEmail:      true,
  publicMapLink:    true,
  shortDescription: true,
  createdAt:        true,
};

export const branchesService = {
  getBranchById: async (branchId: number) => {
    return prisma.branch.findUnique({
      where: { id: branchId },
      select: BRANCH_LIST_SELECT,
    });
  },

  listAll: async () => {
    return prisma.branch.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
      select: BRANCH_LIST_SELECT,
    });
  },

  /**
   * Public branch list for the HO website /branch-locations page.
   * Only branches that are active AND isPublic=true.
   * Ordered by publicPriority DESC, then state ASC, then name ASC.
   * Uses dedicated public* fields; falls back to BranchSettings.theme for
   * phone/mapLink if the new fields are empty (backward-compat).
   */
  listPublic: async () => {
    const rows = await prisma.branch.findMany({
      where: { status: 'active', isPublic: true },
      orderBy: [{ publicPriority: 'desc' }, { state: 'asc' }, { name: 'asc' }],
      select: {
        id:               true,
        name:             true,
        code:             true,
        city:             true,
        state:            true,
        websiteEnabled:   true,
        publicPriority:   true,
        publicPhone:      true,
        publicEmail:      true,
        publicMapLink:    true,
        shortDescription: true,
        settings: {
          select: { mapLink: true, theme: true },
        },
      },
    });

    return rows.map((b) => {
      const theme = (b.settings?.theme ?? {}) as Record<string, unknown>;
      // Prefer dedicated public fields; fall back to BranchSettings for legacy data
      const phone   = b.publicPhone   || (theme['phone']   as string | undefined) || null;
      const mapLink = b.publicMapLink || b.settings?.mapLink || null;
      return {
        id:               b.id,
        name:             b.name,
        code:             b.code,
        city:             b.city,
        state:            b.state,
        websiteEnabled:   b.websiteEnabled,
        publicPriority:   b.publicPriority,
        phone,
        email:            b.publicEmail      || null,
        mapLink,
        shortDescription: b.shortDescription || null,
      };
    });
  },

  /**
   * Public meta for a branch website — includes BranchSettings fields.
   * Called by the frontend PublicBranchService (no auth required).
   */
  getPublicMeta: async (branchId: number) => {
    const branch = await prisma.branch.findUnique({
      where:  { id: branchId },
      select: {
        id:             true,
        name:           true,
        code:           true,
        city:           true,
        status:         true,
        websiteEnabled: true,
        settings: {
          select: {
            logoUrl:     true,
            tagline:     true,
            mapLink:     true,
            socialLinks: true,
            navItems:    true,
            theme:       true,
          },
        },
      },
    });
    if (!branch || branch.status !== 'active') return null;

    const theme    = (branch.settings?.theme ?? {}) as Record<string, unknown>;
    const navItems = parseJson<{ label: string; slug: string; order: number; visible: boolean }[]>(
      branch.settings?.navItems, []
    );

    return {
      id:             branch.id,
      name:           branch.name,
      code:           branch.code,
      city:           branch.city,
      websiteEnabled: branch.websiteEnabled,
      logoUrl:        branch.settings?.logoUrl      ?? null,
      tagline:        branch.settings?.tagline      ?? null,
      primaryColor:   (theme['primaryColor'] as string | undefined) ?? null,
      websiteTitle:   (theme['websiteTitle'] as string | undefined) ?? null,
      footerText:     (theme['footerText']   as string | undefined) ?? null,
      phone:          (theme['phone']        as string | undefined) ?? null,
      whatsapp:       (theme['whatsapp']     as string | undefined) ?? null,
      email:          (theme['email']        as string | undefined) ?? null,
      address:        (theme['address']      as string | undefined) ?? null,
      mapLink:        branch.settings?.mapLink      ?? null,
      socialLinks:    parseJson<{ platform: string; url: string }[]>(branch.settings?.socialLinks, []),
      navItems,
    };
  },

  createBranch: async (data: {
    name: string;
    code: string;
    city: string;
    state?: string;
  }) => {
    const existing = await prisma.branch.findUnique({ where: { code: data.code.toLowerCase() } });
    if (existing) throw new Error('BRANCH_CODE_EXISTS');

    return prisma.branch.create({
      data: {
        name:   data.name,
        code:   data.code.toLowerCase(),
        city:   data.city,
        state:  data.state ?? '',
        status: 'active',
      },
      select: BRANCH_LIST_SELECT,
    });
  },

  updateBranch: async (id: number, data: {
    name?: string;
    city?: string;
    state?: string;
    status?: string;
  }) => {
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new Error('BRANCH_NOT_FOUND');

    return prisma.branch.update({
      where: { id },
      data: {
        ...(data.name   !== undefined && { name:   data.name }),
        ...(data.city   !== undefined && { city:   data.city }),
        ...(data.state  !== undefined && { state:  data.state }),
        ...(data.status !== undefined && { status: data.status }),
      },
      select: BRANCH_LIST_SELECT,
    });
  },

  /** Update only the public-website control fields — super_admin only. */
  updatePublicSettings: async (id: number, data: {
    isPublic?:         boolean;
    websiteEnabled?:   boolean;
    publicPriority?:   number;
    publicPhone?:      string | null;
    publicEmail?:      string | null;
    publicMapLink?:    string | null;
    shortDescription?: string | null;
  }) => {
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new Error('BRANCH_NOT_FOUND');

    return prisma.branch.update({
      where: { id },
      data: {
        ...(data.isPublic         !== undefined && { isPublic:         data.isPublic }),
        ...(data.websiteEnabled   !== undefined && { websiteEnabled:   data.websiteEnabled }),
        ...(data.publicPriority   !== undefined && { publicPriority:   data.publicPriority }),
        ...(data.publicPhone      !== undefined && { publicPhone:      data.publicPhone }),
        ...(data.publicEmail      !== undefined && { publicEmail:      data.publicEmail }),
        ...(data.publicMapLink    !== undefined && { publicMapLink:    data.publicMapLink }),
        ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription }),
      },
      select: BRANCH_LIST_SELECT,
    });
  },

  /**
   * Resolve a branch by its code (public, no auth).
   */
  getByCode: async (code: string) => {
    return prisma.branch.findUnique({
      where:  { code: code.toLowerCase() },
      select: BRANCH_LIST_SELECT,
    });
  },

  /**
   * Public meta by branchCode — single query, no extra round-trip.
   * Used by the frontend PublicBranchService.getBranchMetaByCode().
   */
  getPublicMetaByCode: async (code: string) => {
    const branch = await prisma.branch.findUnique({
      where:  { code: code.toLowerCase() },
      select: {
        id:             true,
        name:           true,
        code:           true,
        city:           true,
        status:         true,
        websiteEnabled: true,
        settings: {
          select: {
            logoUrl:     true,
            tagline:     true,
            mapLink:     true,
            socialLinks: true,
            navItems:    true,
            theme:       true,
          },
        },
      },
    });
    if (!branch || branch.status !== 'active') return null;

    const theme    = (branch.settings?.theme ?? {}) as Record<string, unknown>;
    const navItems = parseJson<{ label: string; slug: string; order: number; visible: boolean }[]>(
      branch.settings?.navItems, []
    );

    return {
      id:             branch.id,
      name:           branch.name,
      code:           branch.code,
      city:           branch.city,
      websiteEnabled: branch.websiteEnabled,
      logoUrl:        branch.settings?.logoUrl      ?? null,
      tagline:        branch.settings?.tagline      ?? null,
      primaryColor:   (theme['primaryColor'] as string | undefined) ?? null,
      websiteTitle:   (theme['websiteTitle'] as string | undefined) ?? null,
      footerText:     (theme['footerText']   as string | undefined) ?? null,
      phone:          (theme['phone']        as string | undefined) ?? null,
      whatsapp:       (theme['whatsapp']     as string | undefined) ?? null,
      email:          (theme['email']        as string | undefined) ?? null,
      address:        (theme['address']      as string | undefined) ?? null,
      workingHours:   (theme['workingHours'] as string | undefined) ?? null,
      mapLink:        branch.settings?.mapLink      ?? null,
      socialLinks:    parseJson<{ platform: string; url: string }[]>(branch.settings?.socialLinks, []),
      navItems,
    };
  },
};
