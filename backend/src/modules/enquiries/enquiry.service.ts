import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, isSuperAdmin } from '../../common/utils/scope.util';

const VALID_STATUSES = ['new', 'contacted', 'follow_up', 'converted', 'lost'] as const;

const ENQUIRY_SELECT = {
  id: true,
  fullName: true,
  mobile: true,
  email: true,
  city: true,
  state: true,
  courseInterest: true,
  source: true,
  status: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true, city: true } },
};

export const enquiryService = {
  createEnquiry: async (data: {
    fullName: string;
    mobile: string;
    email?: string;
    city: string;
    state?: string;
    courseInterest: string;
    source?: string;
    branchId: number;
    remarks?: string;
  }) => {
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) throw new Error('BRANCH_NOT_FOUND');

    const enquiry = await prisma.enquiry.create({
      data: {
        fullName: data.fullName,
        mobile: data.mobile,
        email: data.email ?? null,
        city: data.city,
        state: data.state ?? null,
        courseInterest: data.courseInterest,
        source: data.source ?? null,
        remarks: data.remarks ?? null,
        branchId: data.branchId,
      },
      select: ENQUIRY_SELECT,
    });

    console.log(`[EnquiryService] Enquiry created: id=${enquiry.id}, branch=${branch.name}`);
    return enquiry;
  },

  getAllEnquiries: async (user: AuthPayload) => {
    const filter = getBranchFilter(user);
    console.log(`[EnquiryService] Fetching enquiries with filter:`, filter);
    return prisma.enquiry.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      select: ENQUIRY_SELECT,
    });
  },

  getEnquiryById: async (id: number, user: AuthPayload) => {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      select: ENQUIRY_SELECT,
    });

    if (!enquiry) throw new Error('ENQUIRY_NOT_FOUND');

    if (!isSuperAdmin(user.role) && enquiry.branch.id !== user.branchId) {
      console.warn(`[EnquiryService] Access denied — userId branch mismatch on enquiry id=${id}`);
      throw new Error('ACCESS_DENIED');
    }

    return enquiry;
  },

  updateStatus: async (
    id: number,
    user: AuthPayload,
    data: { status: string; remarks?: string },
  ) => {
    if (!VALID_STATUSES.includes(data.status as any)) {
      throw new Error('INVALID_STATUS');
    }

    const enquiry = await prisma.enquiry.findUnique({ where: { id } });
    if (!enquiry) throw new Error('ENQUIRY_NOT_FOUND');

    if (!isSuperAdmin(user.role) && enquiry.branchId !== user.branchId) {
      console.warn(`[EnquiryService] Update denied — branch mismatch on enquiry id=${id}`);
      throw new Error('ACCESS_DENIED');
    }

    const updated = await prisma.enquiry.update({
      where: { id },
      data: {
        status: data.status,
        remarks: data.remarks ?? enquiry.remarks,
      },
      select: ENQUIRY_SELECT,
    });

    console.log(`[EnquiryService] Enquiry id=${id} status updated to "${data.status}" by userId=${user.userId}`);
    return updated;
  },
};
