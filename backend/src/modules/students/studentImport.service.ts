import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { ROLES } from '../../common/roles';

const REQUIRED_HEADERS = ['Email Address', 'Name of Student', 'Mobile Number (Whatsaap Number)'];
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

type ImportRow = {
  row: number;
  name: string;
  email: string;
  mobile: string;
  qualification: string;
  institution: string;
};

type RowIssue = { row: number; message: string };

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown): string {
  return clean(value).toLowerCase();
}

function normalizeMobile(value: unknown): string {
  const digits = clean(value).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function makePassword(): string {
  const bytes = crypto.randomBytes(14);
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('');
}

function parseWorkbook(file: Express.Multer.File): { rows: ImportRow[]; issues: RowIssue[] } {
  if (!/\.(xlsx|xls)$/i.test(file.originalname)) throw new Error('INVALID_FILE_TYPE');

  const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('EMPTY_FILE');

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
  if (!raw.length) throw new Error('EMPTY_FILE');

  const headers = Object.keys(raw[0] ?? {});
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing required headers: ${missing.join(', ')}`);

  const rows: ImportRow[] = [];
  const issues: RowIssue[] = [];
  const seenEmails = new Set<string>();

  raw.forEach((source, index) => {
    const row = index + 2;
    const email = normalizeEmail(source['Email Address']);
    const name = clean(source['Name of Student']);
    const mobile = normalizeMobile(source['Mobile Number (Whatsaap Number)']);

    if (!name || !email || !mobile) {
      issues.push({ row, message: 'Name, email, and mobile number are required' });
      return;
    }
    if (!isEmail(email)) {
      issues.push({ row, message: 'Email address is invalid' });
      return;
    }
    if (mobile.length !== 10) {
      issues.push({ row, message: 'Mobile number must contain 10 digits after normalisation' });
      return;
    }
    if (seenEmails.has(email)) {
      issues.push({ row, message: 'Duplicate email in this file; only the first row will be considered' });
      return;
    }

    seenEmails.add(email);
    rows.push({
      row,
      name,
      email,
      mobile,
      qualification: clean(source['Education Qualification']),
      institution: clean(source['School/College/University Name']),
    });
  });

  return { rows, issues };
}

async function assertCentralBatch(user: AuthPayload, batchId: number) {
  if (user.role !== ROLES.SUPER_ADMIN) throw new Error('ACCESS_DENIED');

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      name: true,
      branchId: true,
      isActive: true,
      isCentralProgramme: true,
      course: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true, city: true } },
    },
  });
  if (!batch) throw new Error('BATCH_NOT_FOUND');
  if (!batch.isActive || !batch.isCentralProgramme) throw new Error('CENTRAL_PROGRAMME_REQUIRED');
  return batch;
}

async function analyzeRows(rows: ImportRow[]) {
  const emails = rows.map((row) => row.email);
  const [users, students] = await Promise.all([
    emails.length ? prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, role: { select: { name: true } }, studentProfile: { select: { id: true } } },
    }) : [],
    emails.length ? prisma.student.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, userId: true },
    }) : [],
  ]);

  const usersByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  const studentsByEmail = new Map(students.filter((student) => student.email).map((student) => [student.email!.toLowerCase(), student]));

  return rows.map((row) => {
    const user = usersByEmail.get(row.email);
    const student = studentsByEmail.get(row.email);
    let status: 'ready' | 'existing-student' | 'link-existing-student' | 'blocked' = 'ready';
    let message = '';

    if (user?.studentProfile) {
      status = 'existing-student';
      message = 'Existing student login will be enrolled if needed';
    } else if (user) {
      status = 'blocked';
      message = 'Email belongs to a non-student user account';
    } else if (student) {
      status = 'link-existing-student';
      message = student.userId ? 'Existing student is already linked to another user' : 'Existing student record will receive a new login';
      if (student.userId) status = 'blocked';
    } else {
      message = 'New student login will be created';
    }

    return { row, user, student, status, message };
  });
}

export const studentImportService = {
  preview: async (user: AuthPayload, batchId: number, file: Express.Multer.File) => {
    const batch = await assertCentralBatch(user, batchId);
    const { rows, issues } = parseWorkbook(file);
    const analysis = await analyzeRows(rows);
    const blocked = analysis.filter((item) => item.status === 'blocked');
    const actionable = analysis.filter((item) => item.status !== 'blocked');

    return {
      batch: { id: batch.id, name: batch.name, course: batch.course.name, branch: batch.branch.name },
      sourceRows: rows.length + issues.length,
      readyToCreate: analysis.filter((item) => item.status === 'ready' || item.status === 'link-existing-student').length,
      existingAccounts: analysis.filter((item) => item.status === 'existing-student').length,
      blockedRows: blocked.length,
      actionableRows: actionable.length,
      issues: [
        ...issues,
        ...blocked.map((item) => ({ row: item.row.row, message: item.message })),
      ],
      sample: analysis.slice(0, 12).map((item) => ({
        row: item.row.row,
        name: item.row.name,
        email: item.row.email,
        mobile: item.row.mobile,
        status: item.status,
        message: item.message,
      })),
    };
  },

  commit: async (user: AuthPayload, batchId: number, file: Express.Multer.File) => {
    const batch = await assertCentralBatch(user, batchId);
    const { rows, issues } = parseWorkbook(file);
    const analysis = await analyzeRows(rows);
    const actionable = analysis.filter((item) => item.status !== 'blocked');
    if (!actionable.length) throw new Error('NO_VALID_ROWS');

    const studentRole = await prisma.role.findUnique({ where: { name: ROLES.STUDENT }, select: { id: true } });
    if (!studentRole) throw new Error('STUDENT_ROLE_NOT_FOUND');

    const credentials: Array<{ name: string; email: string; temporaryPassword: string }> = [];
    const importIssues: RowIssue[] = [
      ...issues,
      ...analysis.filter((item) => item.status === 'blocked').map((item) => ({ row: item.row.row, message: item.message })),
    ];

    let created = 0;
    let linkedExistingStudents = 0;
    let enrolledExisting = 0;
    let alreadyEnrolled = 0;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of actionable) {
        const existingStudentId = item.user?.studentProfile?.id ?? item.student?.id ?? null;
        let studentId = existingStudentId;

        if (!studentId) {
          const temporaryPassword = makePassword();
          const createdUser = await tx.user.create({
            data: {
              name: item.row.name,
              email: item.row.email,
              password: await bcrypt.hash(temporaryPassword, 10),
              roleId: studentRole.id,
              branchId: batch.branchId,
              scope: 'branch',
              mustChangePassword: true,
              isActive: true,
              status: 'active',
            },
          });

          const createdStudent = await tx.student.create({
            data: {
              fullName: item.row.name,
              mobile: item.row.mobile,
              email: item.row.email,
              city: batch.branch.city,
              course: batch.course.name,
              totalFees: 0,
              discount: 0,
              finalFees: 0,
              branchId: batch.branchId,
              userId: createdUser.id,
            },
          });

          studentId = createdStudent.id;
          created += 1;
          credentials.push({ name: item.row.name, email: item.row.email, temporaryPassword });
        } else if (!item.user && item.student && !item.student.userId) {
          const temporaryPassword = makePassword();
          const createdUser = await tx.user.create({
            data: {
              name: item.row.name,
              email: item.row.email,
              password: await bcrypt.hash(temporaryPassword, 10),
              roleId: studentRole.id,
              branchId: batch.branchId,
              scope: 'branch',
              mustChangePassword: true,
              isActive: true,
              status: 'active',
            },
          });
          await tx.student.update({
            where: { id: item.student.id },
            data: { userId: createdUser.id, email: item.row.email, mobile: item.row.mobile || undefined },
          });
          linkedExistingStudents += 1;
          credentials.push({ name: item.row.name, email: item.row.email, temporaryPassword });
        }

        if (!studentId) continue;
        const existingEnrollment = await tx.batchStudent.findUnique({
          where: { batchId_studentId: { batchId, studentId } },
          select: { id: true, status: true },
        });
        if (existingEnrollment) {
          alreadyEnrolled += 1;
          if (existingEnrollment.status !== 'active') {
            await tx.batchStudent.update({ where: { id: existingEnrollment.id }, data: { status: 'active' } });
          }
        } else {
          await tx.batchStudent.create({ data: { batchId, studentId, status: 'active' } });
          if (item.status === 'existing-student') enrolledExisting += 1;
        }
      }
    });

    return {
      batchName: batch.name,
      created,
      linkedExistingStudents,
      enrolledExisting,
      alreadyEnrolled,
      skipped: importIssues.length,
      issues: importIssues,
      credentials,
    };
  },
};
