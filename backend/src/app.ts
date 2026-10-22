import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { requestContext, logger } from './middlewares/requestContext.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import authRoutes from './modules/auth/auth.routes.js';
import alumniRoutes from './modules/alumni/alumni.routes.js';
import hodRoutes from './modules/hod/hod.routes.js';
// HD-01 — the HOD's nine-section dashboard. Its own router, mounted BEFORE
// `hodRoutes`, because it applies its own auth and Express matches by mount
// order — exactly as the exam cell's dashboard router is mounted.
import hodDashboardRoutes from './modules/hod/hod-dashboard.routes.js';
// HD-06 - the HOD's Courses desk. Its own router, mounted BEFORE `hodRoutes`,
// because it owns `/courses/catalogue`, `/courses/directory` and
// `/courses/:courseId/detail` - and the OLD `GET /api/v1/hod/courses` pair stays
// where it is, doing what it did.
import hodCoursesRoutes from './modules/hod/hod-courses.routes.js';
import sportsRoutes from './modules/sports/sports.routes.js';
import transportRoutes from './modules/transport/transport.routes.js';
import hostelRoutes from './modules/hostel/hostel.routes.js';
// The support-staff complaint surface. Its OWN mount point, not a route inside the hostel router:
// that router is gated `requireRole('HOSTEL','ADMIN')`, and adding MAINTENANCE to that list would
// hand a technician room allocations, resident profiles, gate passes and the visitor register.
import staffComplaintsRoutes from './modules/hostel/hostel-staff-complaints.routes.js';
import libraryRoutes from './modules/library/library.routes.js';
import accountsRoutes from './modules/accounts/accounts.routes.js';
import reportsRoutes from './modules/accounts/reports.routes.js';
import notificationsRoutes from './modules/accounts/notifications.routes.js';
import dashboardRoutes from './modules/accounts/dashboard.routes.js';
import scholarshipRoutes from './modules/accounts/scholarship.routes.js';
import feeStructureRoutes from './modules/accounts/feestructure.routes.js';
import payrollStructureRoutes from './modules/accounts/payroll.structure.routes.js';
import { UPLOAD_DIR } from './modules/accounts/expenses.routes.js';
import timetableRoutes from './modules/examcell/timetable.routes.js';
import hallticketRoutes from './modules/examcell/hallticket.routes.js';
import evaluationRoutes from './modules/examcell/evaluation.routes.js';
import resultRoutes from './modules/examcell/result.routes.js';
import cheatingRoutes from './modules/examcell/cheating.routes.js';
// X-11 — the exam attendance roll and the seven-section dashboard. Both apply
// their own auth and are mounted BEFORE examcellRoutes, because Express matches
// by mount order.
import attendanceRoutes from './modules/examcell/attendance.routes.js';
import examcellDashboardRoutes from './modules/examcell/examcell-dashboard.routes.js';
import examcellRoutes from './modules/examcell/examcell.routes.js';
import placementRoutes from './modules/placement/placement.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import teacherRoutes from './modules/teacher/teacher.routes.js';
import studentRoutes from './modules/student/student.routes.js';
import platformRoutes from './modules/platform/platform.routes.js';

export function createApp() {
  const app = express();

  // ── Production hardening ─────────────────────────────────
  app.set('trust proxy', env.trustProxy ? 1 : false);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS: exact allowlist match (no wildcard when credentials are in play).
  // Non-allowlisted origins get no ACAO header — browsers block the read.
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  // Expense receipts and generated payslips are served from here. In production
  // this would be signed object-storage URLs; the `File.storageKey` → path
  // mapping is the same either way, so only this line changes.
  //
  // The directory is imported, not re-derived: the writers (expense uploads,
  // payslip generation) and this reader must agree byte for byte, and two
  // copies of the same `?? path.join(...)` default is exactly how they drift.
  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      index: false,
      dotfiles: 'deny',
      maxAge: '1h',
    }),
  );

  // Global API rate limit — generous ceiling; login has its own tighter bucket
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down' } },
  });
  app.use('/api', apiLimiter);

  // Auth endpoints: brute-force protection
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only count failures
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many auth attempts, try again later' },
    },
  });
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/forgot-password', authLimiter);

  app.use(requestContext);

  // Health — no auth; verifies process + DB connectivity
  app.get('/health', async (_req, res) => {
    const checks: Record<string, string> = {};
    let ok = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'down';
      ok = false;
    }
    res.status(ok ? 200 : 503).json({
      data: { status: ok ? 'ok' : 'degraded', checks, ts: new Date().toISOString() },
    });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/alumni', alumniRoutes);
  // HD-01 the HOD's dashboard owns every `/dashboard/*` path, and it applies its
  // own auth, so it is mounted BEFORE hodRoutes. The old
  // `GET /api/v1/hod/dashboard` is gone — it is a 404 now, superseded by
  // `/dashboard/overview`, `/dashboard/catalogue` and `/dashboard/blocks/:block`.
  app.use('/api/v1/hod', hodDashboardRoutes);
  // HD-06 the Courses desk. Mounted before hodRoutes so `/courses/catalogue`,
  // `/courses/directory` and `/courses/:courseId/detail` reach it; the old
  // `/courses` and `/courses/:courseId` GETs fall through to hodRoutes and are
  // unchanged.
  app.use('/api/v1/hod', hodCoursesRoutes);
  app.use('/api/v1/hod', hodRoutes);
  app.use('/api/v1/sports', sportsRoutes);
  app.use('/api/v1/transport', transportRoutes);
  app.use('/api/v1/hostel', hostelRoutes);
app.use('/api/v1/staff-complaints', staffComplaintsRoutes);
  app.use('/api/v1/library', libraryRoutes);
// The scholarship desk (docs §3.7) is mounted BEFORE accountsRoutes for the
  // same reason as the routers below: its literal paths (`/scholarships/catalogue`,
  // `/scholarships/applications`, `/scholarships/tracking`) must not be read as
  // a scheme id by `/scholarships/:id`.
  app.use('/api/v1/accounts', scholarshipRoutes);
  // The payroll salary desk is mounted BEFORE accountsRoutes, and that ordering
  // is load-bearing rather than cosmetic: accountsRoutes owns `/payroll/:id`,
  // so if it ran first, `/payroll/alerts` would be read as a run with the id
  // "alerts" and 404 — and so would `/payroll/components` and
  // `/payroll/entries/:id/payslip`. Express matches by mount order, so the
  // router with the literal sub-paths has to be registered first.
  app.use('/api/v1/accounts', payrollStructureRoutes);
  // Fee structure (docs §3.5) keeps the same shape for the same reason: its
  // literal sub-resource paths must stay ahead of `/fee-structures/:id`, and
  // it deliberately still answers the legacy singular `/fee-structure` alias.
  app.use('/api/v1/accounts', feeStructureRoutes);
  // F-09 Reports first: `/reports/:report/export` must not be shadowed, and
  // this router applies its own auth because it no longer inherits it.
  app.use('/api/v1/accounts', reportsRoutes);
  // F-10 Notifications (docs §3.9) next, for the same reason: its literal paths
  // (`/notifications/catalogue`, `/notifications/alerts`,
  // `/notifications/broadcasts`) must not be read as a notification id, and this
  // router applies its own auth because it no longer inherits accountsRoutes'.
  app.use('/api/v1/accounts', notificationsRoutes);
  // F-11 Dashboard first: `/dashboard/catalogue`, `/dashboard/overview`,
  // `/dashboard/alerts` and `/dashboard/actions` are literals that must not be
  // read as a block id by `/dashboard/blocks/:block`, and this router applies its
  // own auth because it no longer inherits accountsRoutes'.
  app.use('/api/v1/accounts', dashboardRoutes);
  app.use('/api/v1/accounts', accountsRoutes);
  // The timetable router is mounted BEFORE examcellRoutes and applies its own
  // auth. Mounted after, it would be answering only for paths the sibling
  // did not claim, and the sibling's 401 would be doing the protecting.
  app.use('/api/v1/examcell', timetableRoutes);
  // X-04 hall tickets owns every `/hall-tickets/*` path now, and those two
  // endpoints used to be declared in examcellRoutes. It is mounted before it
  // for the same reason the timetable router is: it applies its own auth, and
  // Express matches by mount order.
  app.use('/api/v1/examcell', hallticketRoutes);
  // X-05 evaluations owns every `/evaluations/*` path now, and three of those
  // endpoints used to be declared in examcellRoutes. Mounted before it for the
  // same reason the others are: it applies its own auth, and Express matches
  // by mount order.
  app.use('/api/v1/examcell', evaluationRoutes);
  // X-06 results owns every `/results/*` path and `/re-evaluations/:id/decide`
  // now — four of those endpoints used to be declared in examcellRoutes. It is
  // mounted before it for the same reason the others are: it applies its own
  // auth, and Express matches by mount order.
  app.use('/api/v1/examcell', resultRoutes);
  // X-08 cheating cases owns every `/cheating-cases/*` path now, and those three
  // endpoints used to be declared in examcellRoutes. Mounted before it for the
  // same reason the others are: it applies its own auth, and Express matches
  // by mount order. Its own route order matters too — `/cheating-cases/catalogue`
  // and `/cheating-cases/history` are literals and must be declared before
  // `/cheating-cases/:id`, or "catalogue" is read as a case id.
  app.use('/api/v1/examcell', cheatingRoutes);
  // X-11 exam attendance owns every `/attendance/*` path. Mounted before it for
  // the same reason the others are: it applies its own auth, and Express matches
  // by mount order.
  app.use('/api/v1/examcell', attendanceRoutes);
  // X-11 the seven-section dashboard owns every `/dashboard/*` path. The old
  // `GET /api/v1/examcell/dashboard` was REMOVED rather than re-pointed — it
  // counted three of the six exam statuses, counted only UNDER_REVIEW cheating
  // cases, and answered with a flat list of prose strings where the new one
  // answers with seven structured sections.
  app.use('/api/v1/examcell', examcellDashboardRoutes);
  app.use('/api/v1/examcell', examcellRoutes);
  app.use('/api/v1/placement', placementRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/teacher', teacherRoutes);
  app.use('/api/v1/student', studentRoutes);
  app.use('/api/v1/platform', platformRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use(errorHandler);

  logger.info(`App configured (env=${env.nodeEnv}, cors=${env.corsOrigins.join(',')})`);
  return app;
}
