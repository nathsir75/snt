import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import authRouter from './modules/auth/auth.routes';
import usersRouter from './modules/users/users.routes';
import branchesRouter from './modules/branches/branches.routes';
import enquiriesRouter from './modules/enquiries/enquiry.routes';
import studentsRouter from './modules/students/student.routes';
import feesRouter from './modules/fees/fee.routes';
import coursesRouter from './modules/courses/course.routes';
import feeStructuresRouter from './modules/fee-structures/feeStructure.routes';
import discountPoliciesRouter from './modules/discount-policies/discountPolicy.routes';
import discountRequestsRouter from './modules/discount-requests/discountRequest.routes';
import batchesRouter from './modules/batches/batch.routes';
import liveSessionsRouter from './modules/live-sessions/liveSession.routes';
import batchStudentsRouter from './modules/batch-students/batchStudent.routes';
import attendanceRouter from './modules/attendance/attendance.routes';
import attendanceTrackingRouter from './modules/attendance-tracking/attendanceTracking.routes';
import mentorQaRouter from './modules/mentor-qa/mentorQa.routes';
import trainersRouter from './modules/trainers/trainer.routes';
import batchTrainersRouter from './modules/batch-trainers/batchTrainer.routes';
import schedulesRouter from './modules/schedules/schedule.routes';
import reportsRouter from './modules/reports/report.routes';
import enquiryFollowUpsRouter from './modules/enquiry-followups/enquiryFollowUp.routes';
import alertsRouter from './modules/alerts/alert.routes';
import examEligibilityRouter from './modules/exam-eligibility/examEligibility.routes';
import finalExamRegistrationsRouter from './modules/final-exam-registrations/finalExamRegistration.routes';
import finalResultsRouter from './modules/final-results/finalResult.routes';
import certificatesRouter from './modules/certificates/certificate.routes';
import companiesRouter from './modules/companies/company.routes';
import jobOpeningsRouter from './modules/job-openings/jobOpening.routes';
import interviewsRouter from './modules/interviews/interview.routes';
import interviewApplicationsRouter from './modules/interview-applications/interviewApplication.routes';
import placementsRouter from './modules/placements/placement.routes';
import kpiDashboardRouter from './modules/kpi-dashboard/kpiDashboard.routes';
import lmsRouter from './modules/lms/courseContent.routes';
import contentItemsRouter from './modules/lms/contentItem.routes';
import studentProfileRouter from './modules/student/student.routes';
import pagesRouter from './modules/pages/page.routes';
import mediaLibraryRouter from './modules/media-library/mediaLibrary.routes';
import uploadGatewayRouter from './modules/upload-gateway/uploadGateway.routes';
import branchCmsRouter from './modules/branch-cms/branchCms.routes';
import settingsRouter from './modules/settings/settings.routes';
import branchContentRouter from './modules/branch-content/branchContent.routes';
import siteSettingsRouter from './modules/site-settings/siteSettings.routes';
import sitePagesRouter from './modules/site-pages/sitePages.routes';
import siteCollectionsRouter from './modules/site-collections/siteCollections.routes';
import siteEnquiriesRouter from './modules/site-enquiries/siteEnquiries.routes';
import chatbotRouter from './modules/chatbot/routes';
import navBadgesRouter from './modules/nav-badges/navBadges.routes';
import { resolveUploadRoot } from './common/utils/file.util';

const app: Application = express();

console.log('[App] Initializing Express application...');

app.use(cors());
app.use(express.json());

// ── Static file serving for local uploads ────────────────────────────────────
const uploadRoot = resolveUploadRoot();
console.log(`[App] Serving static uploads from: ${uploadRoot}`);
app.use('/uploads', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (['.pdf', '.ppt', '.pptx'].includes(ext)) {
    res.status(403).json({ error: 'Use secure-view for PDF/PPT files' });
    return;
  }
  next();
});
app.use('/uploads', express.static(uploadRoot));

app.get('/api/v1/health', (_req: Request, res: Response) => {
  console.log('[Health] GET /api/v1/health hit');
  res.json({ status: 'ok' });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/branches', branchesRouter);
app.use('/api/v1/enquiries', enquiriesRouter);
app.use('/api/v1/students', studentsRouter);
app.use('/api/v1/fees', feesRouter);
app.use('/api/v1/courses', coursesRouter);
app.use('/api/v1/fee-structures', feeStructuresRouter);
app.use('/api/v1/discount-policies', discountPoliciesRouter);
app.use('/api/v1/discount-requests', discountRequestsRouter);
app.use('/api/v1/batches', batchesRouter);
app.use('/api/v1/live-sessions', liveSessionsRouter);
app.use('/api/v1/batch-students', batchStudentsRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/attendance-tracking', attendanceTrackingRouter);
app.use('/api/v1/mentor-qa', mentorQaRouter);
app.use('/api/v1/trainers', trainersRouter);
app.use('/api/v1/batch-trainers', batchTrainersRouter);
app.use('/api/v1/schedules', schedulesRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/enquiry-followups', enquiryFollowUpsRouter);
app.use('/api/v1/alerts', alertsRouter);
app.use('/api/v1/exam-eligibility', examEligibilityRouter);
app.use('/api/v1/final-exam-registrations', finalExamRegistrationsRouter);
app.use('/api/v1/final-results', finalResultsRouter);
app.use('/api/v1/certificates', certificatesRouter);
app.use('/api/v1/companies', companiesRouter);
app.use('/api/v1/job-openings', jobOpeningsRouter);
app.use('/api/v1/interviews', interviewsRouter);
app.use('/api/v1/interview-applications', interviewApplicationsRouter);
app.use('/api/v1/placements', placementsRouter);
app.use('/api/v1/kpi-dashboard', kpiDashboardRouter);
app.use('/api/v1/lms', lmsRouter);
app.use('/api/v1/content-items', contentItemsRouter);
app.use('/api/v1/student', studentProfileRouter);
app.use('/api/v1/pages', pagesRouter);
app.use('/api/v1/media-library', mediaLibraryRouter);
app.use('/api/v1/upload-gateway', uploadGatewayRouter);
app.use('/api/v1/branch-cms', branchCmsRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/branch-content', branchContentRouter);
app.use('/api/v1/site-settings', siteSettingsRouter);
app.use('/api/v1/site-pages', sitePagesRouter);
app.use('/api/v1/site-collections', siteCollectionsRouter);
app.use('/api/v1/site-enquiries', siteEnquiriesRouter);
app.use('/api/v1/chatbot', chatbotRouter);
app.use('/api/v1/nav-badges', navBadgesRouter);

export default app;
