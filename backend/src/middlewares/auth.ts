import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthenticated } from '../lib/errors.js';
import type { Role } from '../lib/enums.js';

export interface AuthContext {
  userId: string;
  institutionId: string;
  roles: Role[];
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

interface AccessPayload {
  sub: string;
  institutionId: string;
  roles: Role[];
}

export function auth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthenticated('Missing bearer token'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as AccessPayload;
    req.auth = {
      userId: payload.sub,
      institutionId: payload.institutionId,
      roles: payload.roles ?? [],
    };
    next();
  } catch {
    next(unauthenticated('Invalid or expired token'));
  }
}
