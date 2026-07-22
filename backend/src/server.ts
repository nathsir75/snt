import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import app from './app';
import { connectDB } from './db/prisma';
import { aggregateSessionAttendance } from './modules/attendance-tracking/attendanceAggregation.service';

const PORT = process.env.PORT || 3000;
const HEARTBEAT_ATTENDANCE_CRON = '*/5 * * * *';

async function bootstrap() {
  try {
    console.log('🚀 Starting server...');

    // ✅ Connect DB first
    await connectDB();

    const attendanceCron = cron.schedule(HEARTBEAT_ATTENDANCE_CRON, () => {
      aggregateSessionAttendance();
    });
    console.log('[AttendanceCron] Scheduled heartbeat aggregation every 5 minutes');

    // ✅ Start Express server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
    });

    // ✅ Graceful shutdown
    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received. Shutting down...');
      attendanceCron.stop();
      server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received. Shutting down...');
      attendanceCron.stop();
      server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('❌ [Server] Failed to start:', err);
    process.exit(1);
  }
}

bootstrap();
