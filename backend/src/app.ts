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
import sportsRoutes from './modules/sports/sports.routes.js';
import transportRoutes from './modules/transport/transport.routes.js';
import hostelRoutes from './modules/hostel/hostel.routes.js';
import libraryRoutes from './modules/library/library.routes.js';
import accountsRoutes from './modules/accounts/accounts.routes.js';
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

  // CORS: exact allowlist match (no wildcard when credentials are in play)
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));

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
  app.use('/api/v1/hod', hodRoutes);
  app.use('/api/v1/sports', sportsRoutes);
  app.use('/api/v1/transport', transportRoutes);
  app.use('/api/v1/hostel', hostelRoutes);
  app.use('/api/v1/library', libraryRoutes);
  app.use('/api/v1/accounts', accountsRoutes);
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
