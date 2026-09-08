import { z } from 'zod';
import { ROLES } from '../../lib/enums.js';

// X-03 — provision institution + first admin
export const createInstitutionSchema = z.object({
  name: z.string().min(2).max(120),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters/numbers'),
  timezone: z.string().default('Asia/Kolkata'),
  address: z.string().max(300).optional(),
  admin: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(72),
  }),
});

// X-04 — master data writes (platform seeds masters for new institutions)
export const createAcademicYearSchema = z.object({
  name: z.string().min(4).max(20), // "AY 2026-27"
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()),
  isCurrent: z.boolean().default(false),
});

// X-10 — RBAC role permission assignment
export const setRolePermissionSchema = z.object({
  role: z.enum(ROLES),
  permissionKeys: z.array(z.string()).min(1),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const platformBroadcastSchema = z.object({
  audience: z.enum(['ALL', 'ADMINS']),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
});
