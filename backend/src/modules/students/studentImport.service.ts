import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { ROLES } from '../../common/roles';

const REQUIRED_HEADERS = ['Email Address', 'Name of Student', 'Mobile Number (Whatsaap Number)'];
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

type ImportRow = { row: number; name: string; email: string; mobile: string; qualification: string; institution: string };
type RowIssue = { row: number; message: string };

function normalizeMobile(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

function makePassword(): string {
  const bytes = crypto.randomBytes(14);
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('');
}

function parseWorkbook(buffer: Buffer): { rows: ImportRow[]; issues: RowIssue[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('EMPTY_FILE');
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
  const headers = raw.length ? Object.keys(raw[0]) : [];
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`MISSING_HEADERS:${missing.join(', ')}`);

  const rows: ImportRow[] = [];
  const issues: RowIssue[] = [];
  const seen = new Set<string>();
  raw.forEach((source, index) => {
    const row = index + 2;
    const email = String(source['Email Address'] ?? '').trim().toLowerCase();
    const name = String(source['Name of Student'] ?? '').trim();
    const mobile = normalizeMobile(source['Mobile Number (Whatsaap Number)']);
    if (!name || !email || !mobile) {
      issues.push({ row, message: 'Name, email, and mobile number are required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push({ row, message: 'Email address is invalid' });
      return;
    }
    if (mobile.length !== 10) {
      issues.push({ row, message: 'Mobile number must contain 10 digits after normalisation' });
      return;
    }
    if (seen.has(email)) {
      issues.push({ row, message: 'Duplicate email in this file; only the first row will be considered' });
      return;
    }
    seen.add(email);
    rows.push({
      row, name, email, mobile,
      qualification: String(source['Education Qualification'] ?? '').trim(),
      institution: String(source['School/College/University Name'] ?? '').trim(),
    });
  });
  return { rows, issues };
}

async function assertCentralBatch(user: AuthPayload, batchId: number) {
  if (user.role !== ROLES.SUPER_ADMIN) throw new Error('ACCESS_DENIED');
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, name: true, branchId: true, isCentralProgramme: true, course: { select: { name: true } }, branch: { select: { city: true } } },
  });
  if (!batch) throw new Error('BATCH_NOT_FOUND');
  if (!batch.isCentralProgramme) throw new Error('CENTRAL_PROGRAMME_REQUIRED');
  return batch;
}

export const studentImportService = {
  preview: async (user: AuthPayload, batchId: number, file: Express.Multer.File) => {
    await assertCentralBatch(user, batchId);
    const { rows, issues } = parseWorkbook(file.buffer);
    const emails = rows.map((row) => row.email);
    const existing = emails.length ? await prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } }) : [];
    const existingEmails = new Set(existing.map((account) => account.email.toLowerCase()));
    return {
      sourceRows: rows.length + issues.length,
      readyToCreate: rows.filter((row) => !existingEmails.has(row.email)).length,
      existingAccounts: rows.filter((row) => existingEmails.has(row.email)).length,
      issues,
      sample: rows.slice(0, 10).map((row) => ({ ...row, status: existingEmails.has(row.email) ? 'existing-account' : 'ready' })),
    };
  },

  commit: async (user: AuthPayload, batchId: number, file: Express.Multer.File) => {
    const batch = await assertCentralBatch(user, batchId);
    const { rows, issues } = parseWorkbook(file.buffer);
    const studentRole = await prisma.role.findUnique({ where: { name: ROLES.STUDENT }, select: { id: true } });
    if (!studentRole) throw new Error('STUDENT_ROLE_NOT_FOUND');

    const credentials: Array<{ name: string; email: string; temporaryPassword: string }> = [];
    let enrolledExisting = 0;
    let skippedExisting = 0;

    for (const row of rows) {
      const result = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email: row.email },
          include: { studentProfile: true },
        });
        if (existingUser?.studentProfile) {
          const enrolled = await tx.batchStudent.findUnique({ where: { batchId_studentId: { batchId, studentId: existingUser.studentProfile.id } } });
          if (!enrolled) await tx.batchStudent.create({ data: { batchId, studentId: existingUser.studentProfile.id } });
          return { kind: 'existing' as const };
        }
        if (existingUser) return { kind: 'conflict' as const };

        const temporaryPassword = makePassword();
        const user = await tx.user.create({
          data: { name: row.name, email: row.email, password: await bcrypt.hash(temporaryPassword, 10), roleId: studentRole.id, branchId: batch.branchId },
        });
        const student = await tx.student.create({
          data: {
            fullName: row.name, mobile: row.mobile, email: row.email,
            city: batch.branch.city, course: batch.course.name,
            totalFees: 0, discount: 0, finalFees: 0, branchId: batch.branchId, userId: user.id,
          },
        });
        await tx.batchStudent.create({ data: { batchId, studentId: student.id } });
        return { kind: 'created' as const, temporaryPassword };
      });
      if (result.kind === 'created') credentials.push({ name: row.name, email: row.email, temporaryPassword: result.temporaryPassword });
      if (result.kind === 'existing') enrolledExisting += 1;
      if (result.kind === 'conflict') { skippedExisting += 1; issues.push({ row: row.row, message: 'Email belongs to a non-student account; skipped' }); }
    }
    return {
      batchName: batch.name,
      created: credentials.length,
      enrolledExisting,
      skippedExisting,
      issues,
      credentials,
    };
  },
};
