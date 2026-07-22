import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ── Roles ──────────────────────────────────────────────────────────────────
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'super_admin' },  update: {}, create: { name: 'super_admin',  description: 'Full system access' } }),
    prisma.role.upsert({ where: { name: 'branch_admin' }, update: {}, create: { name: 'branch_admin', description: 'Branch level access' } }),
    prisma.role.upsert({ where: { name: 'counselor' },    update: {}, create: { name: 'counselor',    description: 'Counselor access' } }),
    prisma.role.upsert({ where: { name: 'teacher' },      update: {}, create: { name: 'teacher',      description: 'Teacher — assigned batches only' } }),
    prisma.role.upsert({ where: { name: 'student' },      update: {}, create: { name: 'student',      description: 'Student — own data only' } }),
  ]);
  console.log('[Seed] Roles:', roles.map(r => r.name).join(', '));

  // ── Branch ─────────────────────────────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where:  { code: 'mumbai01' },
    update: { subdomain: 'mumbai', name: 'SNT Mumbai', city: 'Mumbai', state: 'Maharashtra', status: 'active' },
    create: {
      name:      'SNT Mumbai',
      code:      'mumbai01',
      subdomain: 'mumbai',
      city:      'Mumbai',
      state:     'Maharashtra',
      status:    'active',
    },
  });
  console.log('[Seed] Branch:', branch.name, '| subdomain:', branch.subdomain);

  const sndtBranch = await prisma.branch.upsert({
    where:  { code: 'SNDTWU' },
    update: { subdomain: 'sndtu', name: 'SNDTWU', city: 'Mumbai', state: 'Maharashtra', status: 'active' },
    create: {
      name:      'SNDTWU',
      code:      'SNDTWU',
      subdomain: 'sndtu',
      city:      'Mumbai',
      state:     'Maharashtra',
      status:    'active',
    },
  });
  console.log('[Seed] Branch:', sndtBranch.name, '| subdomain:', sndtBranch.subdomain);

  const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = [
    { email: 'admin@snt.com',      name: 'Super Admin',   password: 'Admin@123', roleId: roleMap['super_admin'],  branchId: null },
    { email: 'branch@snt.com',     name: 'Branch Admin',  password: '123456',    roleId: roleMap['branch_admin'], branchId: branch.id },
    { email: 'counselor@snt.com',  name: 'Counselor',     password: '123456',    roleId: roleMap['counselor'],    branchId: branch.id },
    { email: 'teacher@snt.com',    name: 'John Teacher',  password: '123456',    roleId: roleMap['teacher'],      branchId: branch.id },
    { email: 'student@snt.com',    name: 'Jane Student',  password: '123456',    roleId: roleMap['student'],      branchId: branch.id },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, password: hash, roleId: u.roleId, branchId: u.branchId },
    });
    console.log(`[Seed] User: ${user.email} | role: ${u.roleId}`);
  }

  // ── Sample Course + Batch ──────────────────────────────────────────────────
  const course = await prisma.course.upsert({
    where:  { code: 'FSWD' },
    update: {},
    create: { name: 'Full Stack Web Development', code: 'FSWD', durationMonths: 6, isActive: true },
  });

  const batch = await prisma.batch.upsert({
    where:  { id: 1 },
    update: {},
    create: {
      name:      'FSWD Batch Jan 2025',
      courseId:  course.id,
      branchId:  branch.id,
      startDate: new Date('2025-01-01'),
      isActive:  true,
    },
  });
  console.log('[Seed] Batch:', batch.name);

  // ── Assign teacher to batch ────────────────────────────────────────────────
  const teacher = await prisma.user.findUnique({ where: { email: 'teacher@snt.com' } });
  if (teacher) {
    await prisma.teacherBatchAssignment.upsert({
      where:  { userId_batchId: { userId: teacher.id, batchId: batch.id } },
      update: {},
      create: { userId: teacher.id, batchId: batch.id, branchId: branch.id },
    });
    console.log('[Seed] Teacher assigned to batch');
  }

  console.log('\n[Seed] ✅ Done');
  console.log('  super_admin  → admin@snt.com     / Admin@123');
  console.log('  branch_admin → branch@snt.com    / 123456');
  console.log('  counselor    → counselor@snt.com / 123456');
  console.log('  teacher      → teacher@snt.com   / 123456');
  console.log('  student      → student@snt.com   / 123456');
}

main()
  .catch(e => { console.error('[Seed] Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
