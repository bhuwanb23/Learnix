import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../lib/enums.js';
import { forbidden } from '../lib/errors.js';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(forbidden('No auth context'));
    if (roles.length > 0 && !roles.some((r) => req.auth!.roles.includes(r))) {
      return next(forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
