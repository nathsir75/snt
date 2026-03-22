import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';

export interface NavBadgeCounts {
  unreadAlerts:     number;
  newEnquiries:     number;
  pendingDiscounts: number;
  draftPages:       number;
}

export const navBadgesService = {
  getCounts: async (user: AuthPayload): Promise<NavBadgeCounts> => {
    const isSA       = isSuperAdmin(user.role);
    const branchId   = user.branchId;

    const alertScope  = isSA ? {} : { OR: [{ branchId }, { userId: user.userId }] };
    const branchScope = isSA ? {} : { branchId: branchId as number };

    const [unreadAlerts, newEnquiries, pendingDiscounts, draftPages] = await Promise.all([
      prisma.alert.count({ where: { ...alertScope, isRead: false } }),
      prisma.enquiry.count({ where: { ...branchScope, status: 'new' } }),
      prisma.discountRequest.count({ where: { ...branchScope, status: 'pending' } }),
      prisma.page.count({ where: { ...branchScope, isPublished: false } }),
    ]);

    return { unreadAlerts, newEnquiries, pendingDiscounts, draftPages };
  },
};
