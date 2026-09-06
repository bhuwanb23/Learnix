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
    if (target === 'body') {
      // body is writable — replace with the parsed DTO
      req.body = result.data;
    } else {
      // Express 5 query/params are getter-only — mutate contents in place
      Object.assign(req[target] as Record<string, unknown>, result.data);
    }
    next();
  };
}
