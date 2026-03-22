import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, isSuperAdmin } from '../../common/utils/scope.util';

const STUDENT_SELECT = {
  id: true,
  fullName: true,
  mobile: true,
  email: true,
  city: true,
  course: true,
  admissionDate: true,
  totalFees: true,
  discount: true,
  finalFees: true,
  createdAt: true,
  branch: { select: { id: true, name: true, city: true } },
  enquiry: { select: { id: true, courseInterest: true, source: true, status: true } },
};

function validateFees(totalFees: number, discount: number): void {
  if (totalFees <= 0) throw new Error('INVALID_FEES');
  if (discount < 0)   throw new Error('INVALID_DISCOUNT');
  if (discount > totalFees) throw new Error('DISCOUNT_EXCEEDS_FEES');
}

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!isSuperAdmin(user.role) && branchId !== user.branchId) {
    console.warn(
      `[StudentService] Branch access denied — user.branchId=${user.branchId}, resource.branchId=${branchId}, role=${user.role}`
    );
    throw new Error('ACCESS_DENIED');
  }
}

export const studentService = {
  convertFromEnquiry: async (
    enquiryId: number,
    user: AuthPayload,
    data: { course: string; totalFees: number; discount: number; userId?: number },
  ) => {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      include: { student: true },
    });
    if (!enquiry) throw new Error('ENQUIRY_NOT_FOUND');

    assertBranchAccess(user, enquiry.branchId);

    if (enquiry.status === 'converted' || enquiry.student) {
      console.warn(`[StudentService] Enquiry id=${enquiryId} already converted`);
      throw new Error('ALREADY_CONVERTED');
    }

    validateFees(data.totalFees, data.discount);

    const finalFees = data.totalFees - data.discount;

    const student = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          fullName:  enquiry.fullName,
          mobile:    enquiry.mobile,
          email:     enquiry.email,
          city:      enquiry.city,
          course:    data.course,
          totalFees: data.totalFees,
          discount:  data.discount,
          finalFees,
          branchId:  enquiry.branchId,
          enquiryId: enquiry.id,
          userId:    data.userId ?? null,
        },
        select: STUDENT_SELECT,
      });

      await tx.enquiry.update({
        where: { id: enquiryId },
        data: { status: 'converted' },
      });

      return created;
    });

    console.log(`[StudentService] Enquiry id=${enquiryId} converted to student id=${student.id}`);
    return student;
  },

  createManual: async (
    data: {
      fullName: string;
      mobile: string;
      email?: string;
      city: string;
      course: string;
      totalFees: number;
      discount: number;
      branchId: number;
      userId?: number;
    },
  ) => {
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) throw new Error('BRANCH_NOT_FOUND');

    validateFees(data.totalFees, data.discount);

    const finalFees = data.totalFees - data.discount;

    const student = await prisma.student.create({
      data: {
        fullName:  data.fullName,
        mobile:    data.mobile,
        email:     data.email ?? null,
        city:      data.city,
        course:    data.course,
        totalFees: data.totalFees,
        discount:  data.discount,
        finalFees,
        branchId:  data.branchId,
        userId:    data.userId ?? null,
      },
      select: STUDENT_SELECT,
    });

    console.log(`[StudentService] Manual student created: id=${student.id}, branch=${branch.name}`);
    return student;
  },

  getAllStudents: async (user: AuthPayload) => {
    const filter = getBranchFilter(user);
    console.log(`[StudentService] Fetching students with filter:`, filter);
    return prisma.student.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      select: STUDENT_SELECT,
    });
  },

  getStudentById: async (id: number, user: AuthPayload) => {
    const student = await prisma.student.findUnique({
      where: { id },
      select: STUDENT_SELECT,
    });

    if (!student) throw new Error('STUDENT_NOT_FOUND');

    assertBranchAccess(user, student.branch.id);

    return student;
  },

  getBranchSummary: async (branchId: number) => {
    const [total, fromEnquiry] = await Promise.all([
      prisma.student.count({ where: { branchId } }),
      prisma.student.count({ where: { branchId, enquiryId: { not: null } } }),
    ]);

    console.log(`[StudentService] Branch summary for branchId=${branchId}: total=${total}, fromEnquiry=${fromEnquiry}`);
    return { branchId, totalStudents: total, convertedFromEnquiry: fromEnquiry };
  },
};
