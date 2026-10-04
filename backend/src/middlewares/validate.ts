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
      // Express 5 defines `query` (and `params`) as a PROTOTYPE getter that
      // re-parses on every access, so each read returns a NEW object.
      // `Object.assign(req.query, result.data)` therefore mutates a throwaway:
      // the coerced value is silently discarded and the handler still sees the
      // raw string. Verified — `?batch=2019` reached Prisma as the string
      // "2019" and failed the Int filter with a 500 (GET /alumni/directory,
      // 18 routes across 8 modules with the same shape).
      //
      // Defining an OWN data property shadows the prototype getter, so the
      // handler's `req.query` resolves to the merged object. Spreading the
      // original first keeps any query param the schema does not declare —
      // a Zod schema that omits a key must not make that key disappear.
      Object.defineProperty(req, target, {
        value: { ...(req[target] as Record<string, unknown>), ...result.data },
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    next();
  };
}
