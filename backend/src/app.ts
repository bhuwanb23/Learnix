import express from 'express';
import { requestContext } from './middlewares/requestContext.js';
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import alumniRoutes from './modules/alumni/alumni.routes.js';

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

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use(errorHandler);
  return app;
}
