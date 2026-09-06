import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
});

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
    log: pino.Logger;
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  req.id = randomUUID();
  req.log = logger.child({ requestId: req.id });
  res.setHeader('X-Request-Id', req.id);
  const start = Date.now();
  res.on('finish', () => {
    req.log.info({ method: req.method, url: req.originalUrl, status: res.statusCode, ms: Date.now() - start });
  });
  next();
}
