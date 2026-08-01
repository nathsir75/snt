import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, hasGlobalScope } from '../../common/utils/scope.util';

const VALID_PAYMENT_MODES = ['cash', 'upi', 'card', 'bank_transfer'] as const;

const PAYMENT_SELECT = {
  id: true,
  amount: true,
  paymentDate: true,
  paymentMode: true,
  referenceNo: true,
  remarks: true,
  createdAt: true,
  student: { select: { id: true, fullName: true, mobile: true, course: true, finalFees: true } },
  branch:  { select: { id: true, name: true, city: true } },
  collectedBy: { select: { id: true, name: true } },
};

const STUDENT_FEE_SELECT = {
  id: true,
  fullName: true,
  mobile: true,
  course: true,
  totalFees: true,
  discount: true,
  finalFees: true,
  branch: { select: { id: true, name: true } },
};

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!hasGlobalScope(user) && branchId !== user.branchId) {
    console.warn(`[FeeService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

async function computeLedger(studentId: number) {
  const result = await prisma.feePayment.aggregate({
    where: { studentId },
    _sum: { amount: true },
    _count: { id: true },
  });
  return {
    totalPaid: result._sum.amount ?? 0,
    totalTransactions: result._count.id,
  };
}

export const feeService = {
  collectPayment: async (
    user: AuthPayload,
    data: {
      studentId: number;
      amount: number;
      paymentMode: string;
      referenceNo?: string;
      remarks?: string;
    },
  ) => {
    if (data.amount <= 0) throw new Error('INVALID_AMOUNT');
    if (!VALID_PAYMENT_MODES.includes(data.paymentMode as any)) throw new Error('INVALID_PAYMENT_MODE');

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: STUDENT_FEE_SELECT,
    });
    if (!student) throw new Error('STUDENT_NOT_FOUND');

    assertBranchAccess(user, student.branch.id);

    const { totalPaid } = await computeLedger(data.studentId);
    const remainingDue = student.finalFees - totalPaid;

    if (data.amount > remainingDue) {
      console.warn(`[FeeService] Overpayment attempt — studentId=${data.studentId}, amount=${data.amount}, remainingDue=${remainingDue}`);
      throw new Error('AMOUNT_EXCEEDS_DUE');
    }

    const payment = await prisma.feePayment.create({
      data: {
        studentId:         data.studentId,
        branchId:          student.branch.id,
        amount:            data.amount,
        paymentMode:       data.paymentMode,
        referenceNo:       data.referenceNo ?? null,
        remarks:           data.remarks ?? null,
        collectedByUserId: user.userId,
      },
      select: PAYMENT_SELECT,
    });

    const newTotalPaid    = totalPaid + data.amount;
    const newRemainingDue = student.finalFees - newTotalPaid;

    console.log(`[FeeService] Payment collected — studentId=${data.studentId}, amount=${data.amount}, remainingDue=${newRemainingDue}`);

    return { payment, totalPaid: newTotalPaid, remainingDue: newRemainingDue };
  },

  getAllPayments: async (user: AuthPayload) => {
    const filter = getBranchFilter(user);
    console.log(`[FeeService] Fetching payments with filter:`, filter);
    return prisma.feePayment.findMany({
      where: filter,
      orderBy: { paymentDate: 'desc' },
      select: PAYMENT_SELECT,
    });
  },

  getStudentLedger: async (studentId: number, user: AuthPayload) => {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: STUDENT_FEE_SELECT,
    });
    if (!student) throw new Error('STUDENT_NOT_FOUND');

    assertBranchAccess(user, student.branch.id);

    const payments = await prisma.feePayment.findMany({
      where: { studentId },
      orderBy: { paymentDate: 'asc' },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        paymentMode: true,
        referenceNo: true,
        remarks: true,
        collectedBy: { select: { id: true, name: true } },
      },
    });

    const totalPaid    = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingDue = student.finalFees - totalPaid;

    return { student, payments, totalFees: student.finalFees, totalPaid, remainingDue };
  },

  getBranchSummary: async (branchId?: number) => {
    const where = branchId ? { branchId } : {};
    const result = await prisma.feePayment.aggregate({
      where,
      _sum:   { amount: true },
      _count: { id: true },
    });

    const totalStudentsWithPayments = await prisma.feePayment.groupBy({
      by: ['studentId'],
      where,
    });

    console.log(`[FeeService] Fee summary for branchId=${branchId ?? 'all'}`);
    return {
      branchId,
      totalCollected:             result._sum.amount ?? 0,
      totalStudentsWithPayments:  totalStudentsWithPayments.length,
      totalTransactions:          result._count.id,
    };
  },

  getOverallSummary: async () => {
    const overall = await prisma.feePayment.aggregate({
      _sum:   { amount: true },
      _count: { id: true },
    });

    const branchGroups = await prisma.feePayment.groupBy({
      by: ['branchId'],
      _sum:   { amount: true },
      _count: { id: true },
    });

    const branches = await prisma.branch.findMany({
      where: { id: { in: branchGroups.map((b) => b.branchId) } },
      select: { id: true, name: true, city: true },
    });

    const branchWiseCollection = branchGroups.map((g) => ({
      branch:       branches.find((b) => b.id === g.branchId),
      totalCollected:   g._sum.amount ?? 0,
      totalTransactions: g._count.id,
    }));

    console.log(`[FeeService] Overall summary fetched`);
    return {
      totalCollected:      overall._sum.amount ?? 0,
      totalTransactions:   overall._count.id,
      branchWiseCollection,
    };
  },
};

