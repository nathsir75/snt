import 'dotenv/config';
import path from 'path';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import prisma from '../src/db/prisma';

const SALT_ROUNDS = 10;

type ImportRow = {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
};

type Args = {
  file?: string;
  branchId?: number;
  mobile?: string;
  city?: string;
  course?: string;
  totalFees: number;
  discount: number;
  help: boolean;
};

type Summary = {
  read: number;
  created: number;
  skippedExistingEmail: number;
  skippedInvalid: number;
  failed: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    totalFees: 0,
    discount: 0,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--file') {
      args.file = next;
      i += 1;
    } else if (arg === '--branchId') {
      args.branchId = Number(next);
      i += 1;
    } else if (arg === '--mobile') {
      args.mobile = next;
      i += 1;
    } else if (arg === '--city') {
      args.city = next;
      i += 1;
    } else if (arg === '--course') {
      args.course = next;
      i += 1;
    } else if (arg === '--totalFees') {
      args.totalFees = Number(next);
      i += 1;
    } else if (arg === '--discount') {
      args.discount = Number(next);
      i += 1;
    } else if (!args.file && !arg.startsWith('--')) {
      args.file = arg;
    }
  }

  return args;
}

function printUsage(): void {
  console.log(`
Usage:
  npx ts-node scripts/importStudentsFromExcel.ts --file ./students.xlsx --branchId 1

Required Excel columns:
  fullName, email, password

Optional flags:
  --mobile <value>      Default mobile for imported students. Defaults to empty string.
  --city <value>        Default city. Defaults to the branch city.
  --course <value>      Default course. Defaults to "Imported".
  --totalFees <number>  Defaults to 0.
  --discount <number>   Defaults to 0.
`);
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readRows(filePath: string): ImportRow[] {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error('Excel file does not contain any sheets.');

  const sheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '' });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  if (!args.file) throw new Error('Missing --file path.');
  if (!Number.isInteger(args.branchId) || Number(args.branchId) <= 0) {
    throw new Error('Missing or invalid --branchId.');
  }
  if (!Number.isFinite(args.totalFees) || args.totalFees < 0) {
    throw new Error('--totalFees must be a non-negative number.');
  }
  if (!Number.isFinite(args.discount) || args.discount < 0) {
    throw new Error('--discount must be a non-negative number.');
  }
  if (args.discount > args.totalFees) {
    throw new Error('--discount cannot be greater than --totalFees.');
  }

  const filePath = path.resolve(process.cwd(), args.file);
  const branch = await prisma.branch.findUnique({ where: { id: args.branchId } });
  if (!branch) throw new Error(`Branch not found for branchId=${args.branchId}.`);

  const studentRole = await prisma.role.findUnique({ where: { name: 'student' } });
  if (!studentRole) throw new Error('Student role not found. Run the role seed first.');

  const rows = readRows(filePath);
  const summary: Summary = {
    read: rows.length,
    created: 0,
    skippedExistingEmail: 0,
    skippedInvalid: 0,
    failed: 0,
  };

  const seenEmails = new Set<string>();
  const city = args.city ?? branch.city;
  const course = args.course ?? 'Imported';
  const mobile = args.mobile ?? '';
  const finalFees = args.totalFees - args.discount;

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const fullName = asString(row.fullName);
    const email = asString(row.email).toLowerCase();
    const password = asString(row.password);

    if (!fullName || !isEmail(email) || !password) {
      summary.skippedInvalid += 1;
      console.warn(`[ImportStudents] Row ${rowNumber} skipped: fullName, valid email, and password are required.`);
      continue;
    }

    if (seenEmails.has(email)) {
      summary.skippedExistingEmail += 1;
      console.warn(`[ImportStudents] Row ${rowNumber} skipped: duplicate email in file (${email}).`);
      continue;
    }
    seenEmails.add(email);

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      summary.skippedExistingEmail += 1;
      console.warn(`[ImportStudents] Row ${rowNumber} skipped: user email already exists (${email}).`);
      continue;
    }

    try {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: fullName,
            email,
            password: hashedPassword,
            roleId: studentRole.id,
            branchId: branch.id,
          },
        });

        await tx.student.create({
          data: {
            fullName,
            mobile,
            email,
            city,
            course,
            totalFees: args.totalFees,
            discount: args.discount,
            finalFees,
            branchId: branch.id,
            userId: user.id,
          },
        });
      });

      summary.created += 1;
      console.log(`[ImportStudents] Row ${rowNumber} imported: ${email}`);
    } catch (error) {
      summary.failed += 1;
      console.error(`[ImportStudents] Row ${rowNumber} failed (${email}):`, error);
    }
  }

  console.log('\n[ImportStudents] Summary');
  console.log(`  Rows read:                ${summary.read}`);
  console.log(`  Created:                  ${summary.created}`);
  console.log(`  Skipped existing emails:  ${summary.skippedExistingEmail}`);
  console.log(`  Skipped invalid rows:     ${summary.skippedInvalid}`);
  console.log(`  Failed:                   ${summary.failed}`);
}

main()
  .catch((error) => {
    console.error('[ImportStudents] Error:', error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
