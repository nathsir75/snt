import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ [DB] PostgreSQL connected via Prisma');
  } catch (error) {
    console.error('❌ [DB] Connection failed:', error);
    process.exit(1);
  }
}

export default prisma;