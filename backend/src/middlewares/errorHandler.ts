import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    const body: ErrorEnvelope = { error: { code: err.code, message: err.message, details: err.details } };
    res.status(err.httpStatus).json(body);
    return;
  }
  if (err instanceof ZodError) {
    const body: ErrorEnvelope = { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.flatten() } };
    res.status(400).json(body);
    return;
  }
  req.log?.error({ err }, 'Unhandled error');
  const body: ErrorEnvelope = { error: { code: 'INTERNAL', message: 'Internal server error' } };
  res.status(500).json(body);
}
