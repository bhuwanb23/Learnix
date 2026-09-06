import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '../lib/errors.js';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(badRequest('Validation failed', result.error.flatten()));
    }
    // parsed DTO replaces the raw value for downstream handlers
    (req as unknown as Record<Target, unknown>)[target] = result.data;
    next();
  };
}
