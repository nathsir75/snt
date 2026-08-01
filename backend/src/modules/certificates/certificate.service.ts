import { randomBytes } from 'crypto';
import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, hasGlobalScope } from '../../common/utils/scope.util';
import { createBranchAlert } from '../alerts/alert.service';

const CERT_SELECT = {
  id:               true,
  certificateNo:    true,
  verificationCode: true,
  issueDate:        true,
  status:           true,
  pdfPath:          true,
  createdAt:        true,
  updatedAt:        true,
  student:  { select: { id: true, fullName: true, mobile: true, course: true } },
  branch:   { select: { id: true, name: true, city: true } },
  issuedBy: { select: { id: true, name: true } },
  result:   { select: { id: true, marksObtained: true, maxMarks: true, resultStatus: true, publishedAt: true } },
};

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!hasGlobalScope(user) && branchId !== user.branchId) {
    console.warn(`[CertificateService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

async function generateCertificateNo(): Promise<string> {
  const year  = new Date().getFullYear();
  const count = await prisma.certificateIssue.count();
  const seq   = String(count + 1).padStart(4, '0');
  return `SNT-CERT-${year}-${seq}`;
}

function generateVerificationCode(): string {
  return randomBytes(12).toString('hex').toUpperCase();
}

export const certificateService = {
  // ─── 1. Issue certificate ───────────────────────────────────────────────────
  issue: async (user: AuthPayload, data: { resultId: number }) => {
    const result = await prisma.finalExamResult.findUnique({
      where:  { id: data.resultId },
      select: { id: true, resultStatus: true, studentId: true, branchId: true },
    });
    if (!result) throw new Error('RESULT_NOT_FOUND');
    if (result.resultStatus !== 'pass') throw new Error('NOT_ELIGIBLE_FOR_CERTIFICATE');

    const existing = await prisma.certificateIssue.findUnique({
      where: { resultId: data.resultId },
    });
    if (existing) throw new Error('DUPLICATE_CERTIFICATE');

    const [certificateNo, verificationCode] = await Promise.all([
      generateCertificateNo(),
      Promise.resolve(generateVerificationCode()),
    ]);

    const certificate = await prisma.certificateIssue.create({
      data: {
        studentId:        result.studentId,
        branchId:         result.branchId,
        resultId:         data.resultId,
        certificateNo,
        verificationCode,
        issuedByUserId:   user.userId,
      },
      select: CERT_SELECT,
    });

    createBranchAlert({
      type:       'system',
      title:      'Certificate issued',
      message:    `Certificate ${certificateNo} issued for ${certificate.student.fullName}`,
      branchId:   result.branchId,
      entityType: 'certificate',
      entityId:   certificate.id,
      metadata:   { certificateNo, verificationCode },
    }).catch((err) =>
      console.error(`[CertificateService] Alert failed for certificate id=${certificate.id}:`, err),
    );

    console.log(`[CertificateService] Certificate issued — id=${certificate.id}, no=${certificateNo}`);
    return certificate;
  },

  // ─── 2. List certificates ───────────────────────────────────────────────────
  list: async (user: AuthPayload, filters: { status?: string; branchId?: number }) => {
    if (!hasGlobalScope(user) && filters.branchId && filters.branchId !== user.branchId) {
      throw new Error('ACCESS_DENIED');
    }

    const branchFilter = getBranchFilter(user);
    const where: Record<string, unknown> = { ...branchFilter };
    if (filters.status) where['status'] = filters.status;
    if (hasGlobalScope(user) && filters.branchId) where['branchId'] = filters.branchId;

    return prisma.certificateIssue.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      select:  CERT_SELECT,
    });
  },

  // ─── 3. Get by id ───────────────────────────────────────────────────────────
  getById: async (id: number, user: AuthPayload) => {
    const cert = await prisma.certificateIssue.findUnique({
      where:  { id },
      select: CERT_SELECT,
    });
    if (!cert) throw new Error('CERTIFICATE_NOT_FOUND');
    assertBranchAccess(user, cert.branch.id);
    return cert;
  },

  // ─── 4. Revoke certificate ──────────────────────────────────────────────────
  revoke: async (id: number, user: AuthPayload, reason: string) => {
    const cert = await prisma.certificateIssue.findUnique({
      where:  { id },
      select: { id: true, status: true, branchId: true, certificateNo: true, student: { select: { fullName: true } } },
    });
    if (!cert) throw new Error('CERTIFICATE_NOT_FOUND');
    if (cert.status === 'revoked') throw new Error('ALREADY_REVOKED');

    const updated = await prisma.certificateIssue.update({
      where: { id },
      data:  { status: 'revoked' },
      select: CERT_SELECT,
    });

    createBranchAlert({
      type:       'system',
      title:      'Certificate revoked',
      message:    `Certificate ${cert.certificateNo} for ${cert.student.fullName} has been revoked`,
      branchId:   cert.branchId,
      entityType: 'certificate',
      entityId:   id,
      metadata:   { reason },
    }).catch((err) =>
      console.error(`[CertificateService] Revoke alert failed for certificate id=${id}:`, err),
    );

    console.log(`[CertificateService] Certificate id=${id} revoked by userId=${user.userId}, reason=${reason}`);
    return updated;
  },

  // ─── 5. Public verification lookup ─────────────────────────────────────────
  verify: async (verificationCode: string) => {
    const cert = await prisma.certificateIssue.findUnique({
      where:  { verificationCode },
      select: {
        certificateNo: true,
        issueDate:     true,
        status:        true,
        student: { select: { fullName: true, course: true } },
      },
    });
    if (!cert) throw new Error('CERTIFICATE_NOT_FOUND');

    console.log(`[CertificateService] Verification lookup — code=${verificationCode}, status=${cert.status}`);

    return {
      certificateNo: cert.certificateNo,
      studentName:   cert.student.fullName,
      course:        cert.student.course,
      issueDate:     cert.issueDate,
      status:        cert.status,
    };
  },
};

