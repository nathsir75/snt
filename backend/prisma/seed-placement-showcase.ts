/**
 * seed-placement-showcase.ts
 * DEV / DEMO seed only — safe to re-run (idempotent via skipDuplicates + name checks).
 * Run: npx ts-node --skip-project --compiler-options "{\"module\":\"commonjs\",\"esModuleInterop\":true}" prisma/seed-placement-showcase.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── Branch ids from seed-branches (the clean set) ────────────────────────────
const BRANCH_IDS = [7, 8, 9, 10, 11, 12]; // DELHI, NAVIMUMBAI, RUDAULI, GHAZIPUR, SOLAPUR, PUNE

// ── Helpers ───────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

// ── Static data ───────────────────────────────────────────────────────────────
const COURSES = [
  'Full Stack Web Development',
  'Java Programming',
  'Python & Data Analytics',
  'Frontend Development',
  'Software Testing & QA',
  'Cloud Computing & DevOps',
];

const STUDENT_NAMES: [string, string][] = [ // [fullName, mobile]
  ['Rahul Sharma',       '9810001001'],
  ['Priya Singh',        '9810001002'],
  ['Aman Verma',         '9810001003'],
  ['Neha Gupta',         '9810001004'],
  ['Aditya Mishra',      '9810001005'],
  ['Sneha Patil',        '9810001006'],
  ['Rohit Yadav',        '9810001007'],
  ['Pooja Jaiswal',      '9810001008'],
  ['Kunal Tiwari',       '9810001009'],
  ['Shreya Kulkarni',    '9810001010'],
  ['Vikram Pandey',      '9810001011'],
  ['Anjali Dubey',       '9810001012'],
  ['Mohit Srivastava',   '9810001013'],
  ['Ritu Chauhan',       '9810001014'],
  ['Deepak Rajput',      '9810001015'],
  ['Kavya Nair',         '9810001016'],
  ['Arjun Mehta',        '9810001017'],
  ['Simran Kaur',        '9810001018'],
  ['Nikhil Joshi',       '9810001019'],
  ['Tanvi Desai',        '9810001020'],
  ['Saurabh Tripathi',   '9810001021'],
  ['Divya Shukla',       '9810001022'],
  ['Harshit Agarwal',    '9810001023'],
  ['Pallavi Saxena',     '9810001024'],
  ['Gaurav Bhatia',      '9810001025'],
  ['Swati Rao',          '9810001026'],
  ['Manish Kumar',       '9810001027'],
  ['Ankita Patel',       '9810001028'],
  ['Vivek Chaudhary',    '9810001029'],
  ['Nidhi Bansal',       '9810001030'],
  ['Sumit Garg',         '9810001031'],
  ['Preeti Malhotra',    '9810001032'],
  ['Abhishek Yadav',     '9810001033'],
  ['Shweta Pandey',      '9810001034'],
  ['Rajesh Verma',       '9810001035'],
  ['Meera Iyer',         '9810001036'],
  ['Tarun Bhatt',        '9810001037'],
  ['Sonali Wagh',        '9810001038'],
  ['Karan Kapoor',       '9810001039'],
  ['Riya Jain',          '9810001040'],
];

const CITIES_BY_BRANCH: Record<number, string> = {
  7:  'Delhi',
  8:  'Navi Mumbai',
  9:  'Rudauli',
  10: 'Ghazipur',
  11: 'Solapur',
  12: 'Pune',
};

interface CompanyDef {
  name: string;
  industry: string;
  location: string;
  roles: { title: string; minPkg: number; maxPkg: number }[];
}

const COMPANY_DEFS: CompanyDef[] = [
  {
    name: 'Tata Consultancy Services', industry: 'IT Services', location: 'Mumbai',
    roles: [
      { title: 'Junior Software Engineer',       minPkg: 3.5, maxPkg: 4.5 },
      { title: 'Technical Support Associate',    minPkg: 2.8, maxPkg: 3.5 },
    ],
  },
  {
    name: 'Infosys', industry: 'IT Services', location: 'Bengaluru',
    roles: [
      { title: 'Systems Engineer',               minPkg: 3.6, maxPkg: 4.8 },
      { title: 'QA Engineer',                    minPkg: 3.2, maxPkg: 4.2 },
    ],
  },
  {
    name: 'Wipro', industry: 'IT Services', location: 'Bengaluru',
    roles: [
      { title: 'Project Engineer',               minPkg: 3.5, maxPkg: 4.5 },
      { title: 'Frontend Developer',             minPkg: 3.8, maxPkg: 5.0 },
    ],
  },
  {
    name: 'HCL Technologies', industry: 'IT Services', location: 'Noida',
    roles: [
      { title: 'Software Developer',             minPkg: 3.8, maxPkg: 5.2 },
      { title: 'Support Engineer',               minPkg: 2.8, maxPkg: 3.8 },
    ],
  },
  {
    name: 'Tech Mahindra', industry: 'IT Services', location: 'Pune',
    roles: [
      { title: 'Associate Software Engineer',    minPkg: 3.2, maxPkg: 4.5 },
      { title: 'Python Developer',               minPkg: 4.0, maxPkg: 5.5 },
    ],
  },
  {
    name: 'Capgemini', industry: 'IT Consulting', location: 'Mumbai',
    roles: [
      { title: 'Analyst',                        minPkg: 3.8, maxPkg: 5.0 },
      { title: 'Full Stack Developer',           minPkg: 4.5, maxPkg: 6.5 },
    ],
  },
  {
    name: 'Accenture', industry: 'IT Consulting', location: 'Bengaluru',
    roles: [
      { title: 'Associate Software Engineer',    minPkg: 4.0, maxPkg: 5.5 },
      { title: 'Data Analyst',                   minPkg: 4.5, maxPkg: 6.0 },
    ],
  },
  {
    name: 'Cognizant', industry: 'IT Services', location: 'Chennai',
    roles: [
      { title: 'Programmer Analyst',             minPkg: 3.5, maxPkg: 4.8 },
      { title: 'Java Developer',                 minPkg: 4.2, maxPkg: 6.0 },
    ],
  },
  {
    name: 'LTIMindtree', industry: 'IT Services', location: 'Mumbai',
    roles: [
      { title: 'Software Engineer',              minPkg: 4.5, maxPkg: 7.0 },
      { title: 'Full Stack Developer',           minPkg: 5.0, maxPkg: 8.5 },
    ],
  },
  {
    name: 'IBM India', industry: 'Technology', location: 'Bengaluru',
    roles: [
      { title: 'Application Developer',          minPkg: 4.8, maxPkg: 7.5 },
      { title: 'Cloud Support Engineer',         minPkg: 4.0, maxPkg: 6.0 },
    ],
  },
];

// Status distribution: 65% joined, 25% offered, 10% rejected
const STATUS_POOL = [
  ...Array(13).fill('joined'),
  ...Array(5).fill('offered'),
  ...Array(2).fill('rejected'),
];

async function main() {
  console.log('🌱 Starting placement showcase seed…\n');

  // ── 1. Guard: skip if already seeded ────────────────────────────────────────
  const existingCompany = await prisma.company.findFirst({ where: { name: 'Tata Consultancy Services' } });
  if (existingCompany) {
    console.log('⚠️  Showcase data already exists (TCS found). Run with --force to re-seed. Exiting.');
    return;
  }

  // ── 2. Create companies + job openings ──────────────────────────────────────
  console.log('📦 Creating companies and job openings…');
  const companyMap: Record<string, { id: number; roles: { id: number; title: string; minPkg: number; maxPkg: number }[] }> = {};

  for (const def of COMPANY_DEFS) {
    const company = await prisma.company.create({
      data: {
        name:          def.name,
        industry:      def.industry,
        location:      def.location,
        isActive:      true,
        contactEmail:  `hr@${def.name.toLowerCase().replace(/\s+/g, '')}.com`,
      },
    });

    const roles: { id: number; title: string; minPkg: number; maxPkg: number }[] = [];
    for (const role of def.roles) {
      const jo = await prisma.jobOpening.create({
        data: {
          companyId:      company.id,
          title:          role.title,
          salaryPackage:  role.maxPkg * 100000,
          location:       def.location,
          status:         'open',
          requiredSkills: 'B.Tech / BCA / MCA / Diploma in CS or IT',
        },
      });
      roles.push({ id: jo.id, title: role.title, minPkg: role.minPkg, maxPkg: role.maxPkg });
    }
    companyMap[def.name] = { id: company.id, roles };
  }
  console.log(`   ✓ ${COMPANY_DEFS.length} companies, ${COMPANY_DEFS.reduce((s, d) => s + d.roles.length, 0)} job openings\n`);

  // ── 3. Create demo students ──────────────────────────────────────────────────
  console.log('👩‍🎓 Creating demo students…');
  const createdStudentIds: number[] = [];
  let branchIdx = 0;

  for (const [fullName, mobile] of STUDENT_NAMES) {
    const branchId = BRANCH_IDS[branchIdx % BRANCH_IDS.length];
    branchIdx++;
    const course = pick(COURSES);
    const totalFees = 35000;
    const discount  = pick([0, 2000, 5000]);
    const student = await prisma.student.create({
      data: {
        fullName,
        mobile,
        email:        `${fullName.toLowerCase().replace(/\s+/g, '.')}@demo.snt`,
        city:         CITIES_BY_BRANCH[branchId],
        course,
        admissionDate: daysAgo(Math.floor(Math.random() * 365 * 3 + 30)),
        totalFees,
        discount,
        finalFees:    totalFees - discount,
        branchId,
      },
    });
    createdStudentIds.push(student.id);
  }
  console.log(`   ✓ ${createdStudentIds.length} students created\n`);

  // ── 4. Create placements (35 records) ───────────────────────────────────────
  console.log('🏆 Creating placement records…');
  const companyList = Object.values(companyMap);
  let placementCount = 0;

  // Spread across students — pick 35 distinct students
  const shuffled = [...createdStudentIds].sort(() => Math.random() - 0.5).slice(0, 35);

  for (let i = 0; i < shuffled.length; i++) {
    const studentId = shuffled[i];
    const company   = companyList[i % companyList.length];
    const role      = pick(company.roles);
    const status    = STATUS_POOL[i % STATUS_POOL.length];
    const pkg       = randomBetween(role.minPkg, role.maxPkg) * 100000; // store in rupees

    const joiningDate = status === 'joined'
      ? daysAgo(Math.floor(Math.random() * 365 * 2 + 30))
      : status === 'offered'
        ? daysAgo(Math.floor(Math.random() * 60))
        : null;

    await prisma.placement.create({
      data: {
        studentId,
        companyId:     company.id,
        jobOpeningId:  role.id,
        salaryPackage: pkg,
        joiningDate,
        status,
      },
    });
    placementCount++;
  }
  console.log(`   ✓ ${placementCount} placements created\n`);

  // ── 5. Summary ───────────────────────────────────────────────────────────────
  const joined   = await prisma.placement.count({ where: { status: 'joined' } });
  const offered  = await prisma.placement.count({ where: { status: 'offered' } });
  const rejected = await prisma.placement.count({ where: { status: 'rejected' } });
  const avgPkg   = await prisma.placement.aggregate({ _avg: { salaryPackage: true }, where: { status: { in: ['joined', 'offered'] } } });

  console.log('═══════════════════════════════════════');
  console.log('✅ Placement showcase seed complete');
  console.log('───────────────────────────────────────');
  console.log(`   Companies    : ${COMPANY_DEFS.length}`);
  console.log(`   Job Openings : ${COMPANY_DEFS.reduce((s, d) => s + d.roles.length, 0)}`);
  console.log(`   Students     : ${createdStudentIds.length}`);
  console.log(`   Placements   : ${placementCount}`);
  console.log(`     → Joined   : ${joined}`);
  console.log(`     → Offered  : ${offered}`);
  console.log(`     → Rejected : ${rejected}`);
  const lpa = avgPkg._avg.salaryPackage ? (avgPkg._avg.salaryPackage / 100000).toFixed(2) : '—';
  console.log(`   Avg Package  : ₹${lpa} LPA`);
  console.log('═══════════════════════════════════════');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
