import 'dotenv/config';
import { execFile } from 'child_process';
import { readFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

type CheckResult = {
  name: string;
  ok: boolean;
  details?: string;
};

const JWT_PLACEHOLDERS = new Set([
  '',
  'changeme',
  'change_me',
  'placeholder',
  'secret',
  'jwt_secret',
  '<your_strong_jwt_secret>',
  'your_strong_jwt_secret',
]);

function pass(name: string, details?: string): CheckResult {
  return { name, ok: true, details };
}

function fail(name: string, details?: string): CheckResult {
  return { name, ok: false, details };
}

async function checkDatabaseUrl(): Promise<CheckResult> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return fail('DATABASE_URL is set', 'DATABASE_URL is missing or empty');
  return pass('DATABASE_URL is set');
}

async function checkJwtSecret(): Promise<CheckResult> {
  const jwtSecret = process.env.JWT_SECRET?.trim() ?? '';
  const normalized = jwtSecret.toLowerCase();

  if (!jwtSecret) return fail('JWT_SECRET is configured', 'JWT_SECRET is missing or empty');
  if (JWT_PLACEHOLDERS.has(normalized)) {
    return fail('JWT_SECRET is not a placeholder', 'Replace JWT_SECRET with a strong secret');
  }
  if (jwtSecret.length < 24) {
    return fail('JWT_SECRET is not a placeholder', 'JWT_SECRET should be at least 24 characters');
  }

  return pass('JWT_SECRET is not a placeholder');
}

async function checkCronRegistered(): Promise<CheckResult> {
  const serverPath = path.resolve(__dirname, '..', 'src', 'server.ts');
  const source = await readFile(serverPath, 'utf8');
  const hasSchedule = source.includes('cron.schedule(HEARTBEAT_ATTENDANCE_CRON');
  const hasAggregator = source.includes('aggregateSessionAttendance');

  if (!hasSchedule || !hasAggregator) {
    return fail('attendance cron job is registered', 'server.ts must schedule aggregateSessionAttendance');
  }

  return pass('attendance cron job is registered');
}

async function checkMigrationsApplied(): Promise<CheckResult> {
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  try {
    const { stdout, stderr } = await execFileAsync(
      npxCommand,
      ['prisma', 'migrate', 'status', '--schema', 'prisma/schema.prisma'],
      {
        cwd: path.resolve(__dirname, '..'),
        env: process.env,
        maxBuffer: 1024 * 1024,
      },
    );

    const output = `${stdout}\n${stderr}`;
    if (/Database schema is up to date/i.test(output) || /following migration\(s\) have not yet been applied/i.test(output) === false) {
      return pass('all Prisma migrations are applied');
    }

    return fail('all Prisma migrations are applied', output.trim());
  } catch (error: any) {
    const output = `${error?.stdout ?? ''}\n${error?.stderr ?? ''}`.trim();
    return fail('all Prisma migrations are applied', output || error?.message || 'prisma migrate status failed');
  }
}

async function main(): Promise<void> {
  const checks = [
    await checkDatabaseUrl(),
    await checkJwtSecret(),
    await checkCronRegistered(),
    await checkMigrationsApplied(),
  ];

  console.log('\n[DeployCheck] Pre-start checks');
  for (const check of checks) {
    const marker = check.ok ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${check.name}${check.details ? ` - ${check.details}` : ''}`);
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length) {
    console.error(`\n[DeployCheck] ${failed.length} check(s) failed. Aborting startup.`);
    process.exit(1);
  }

  console.log('\n[DeployCheck] All checks passed.');
}

main().catch((error) => {
  console.error('[DeployCheck] Unexpected error:', error);
  process.exit(1);
});
