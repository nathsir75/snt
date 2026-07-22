import 'dotenv/config';
import { LiveSessionType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BRANCH_CODE = 'SNDTWU';
const COURSE_CODE = 'SNDTWU-LIVE';
const BATCH_NAME = 'SNDTWU Live Classes Batch';

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function main() {
  const branch = await prisma.branch.upsert({
    where: { code: BRANCH_CODE },
    update: {
      name: 'SNDTWU',
      subdomain: 'sndtu',
      city: 'Mumbai',
      state: 'Maharashtra',
      status: 'active',
    },
    create: {
      name: 'SNDTWU',
      code: BRANCH_CODE,
      subdomain: 'sndtu',
      city: 'Mumbai',
      state: 'Maharashtra',
      status: 'active',
    },
  });

  const course = await prisma.course.upsert({
    where: { code: COURSE_CODE },
    update: {
      name: 'SNDTWU Live Learning Program',
      durationMonths: 6,
      isActive: true,
    },
    create: {
      name: 'SNDTWU Live Learning Program',
      code: COURSE_CODE,
      description: 'Local testing course for SNDTWU live and recorded classes.',
      durationMonths: 6,
      isActive: true,
    },
  });

  const existingBatch = await prisma.batch.findFirst({
    where: {
      name: BATCH_NAME,
      branchId: branch.id,
      courseId: course.id,
    },
  });

  const batch = existingBatch
    ? await prisma.batch.update({
        where: { id: existingBatch.id },
        data: {
          capacity: 300,
          isActive: true,
          schedule: 'Mon-Fri, 10:00 AM - 12:00 PM',
        },
      })
    : await prisma.batch.create({
        data: {
          name: BATCH_NAME,
          courseId: course.id,
          branchId: branch.id,
          startDate: new Date('2026-07-01T00:00:00.000Z'),
          endDate: new Date('2026-12-31T00:00:00.000Z'),
          schedule: 'Mon-Fri, 10:00 AM - 12:00 PM',
          capacity: 300,
          isActive: true,
        },
      });

  const sessions = [
    {
      title: 'Live Class: Orientation and Platform Walkthrough',
      youtubeVideoId: 'jfKfPfyJRdk',
      sessionType: LiveSessionType.live,
      scheduledAt: minutesFromNow(-15),
      durationMinutes: 90,
      isActive: true,
    },
    {
      title: 'Recorded Class: HTML and CSS Foundations',
      youtubeVideoId: 'pQN-pnXPaVg',
      sessionType: LiveSessionType.recorded,
      scheduledAt: minutesFromNow(-7 * 24 * 60),
      durationMinutes: 75,
      isActive: true,
    },
    {
      title: 'Recorded Class: JavaScript Essentials',
      youtubeVideoId: 'W6NZfCO5SIk',
      sessionType: LiveSessionType.recorded,
      scheduledAt: minutesFromNow(-5 * 24 * 60),
      durationMinutes: 80,
      isActive: true,
    },
    {
      title: 'Recorded Class: TypeScript for Angular',
      youtubeVideoId: 'BwuLxPH8IDs',
      sessionType: LiveSessionType.recorded,
      scheduledAt: minutesFromNow(-2 * 24 * 60),
      durationMinutes: 70,
      isActive: true,
    },
    {
      title: 'Live Class: Angular Components and Routing',
      youtubeVideoId: '3qBXWUpoPHo',
      sessionType: LiveSessionType.live,
      scheduledAt: minutesFromNow(24 * 60),
      durationMinutes: 90,
      isActive: true,
    },
  ];

  for (const session of sessions) {
    const existing = await prisma.liveSession.findFirst({
      where: {
        batchId: batch.id,
        title: session.title,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.liveSession.update({
        where: { id: existing.id },
        data: session,
      });
      console.log(`[SNDTWU Seed] Updated session: ${session.title}`);
    } else {
      await prisma.liveSession.create({
        data: {
          ...session,
          batchId: batch.id,
        },
      });
      console.log(`[SNDTWU Seed] Created session: ${session.title}`);
    }
  }

  console.log('\n[SNDTWU Seed] Done');
  console.log(`  Branch: ${branch.name} (${branch.code})`);
  console.log(`  Course: ${course.name} (${course.code})`);
  console.log(`  Batch: ${batch.name} | capacity=${batch.capacity}`);
  console.log(`  LiveSessions: ${sessions.length}`);
}

main()
  .catch((error) => {
    console.error('[SNDTWU Seed] Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
