import express from 'express';
import { requestContext } from './middlewares/requestContext.js';
import { errorHandler } from './middlewares/errorHandler.js';
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

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use(requestContext);

  // Health — no auth
  app.get('/health', (_req, res) => {
    res.json({ data: { status: 'ok', ts: new Date().toISOString() } });
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

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use(errorHandler);
  return app;
}
