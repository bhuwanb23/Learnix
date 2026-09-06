// Single source of truth for status strings. Mirrors schema.prisma defaults
// and docs/backend/05-state-machines.md. Zod schemas reuse these unions.

export const ROLES = [
  'STUDENT',
  'TEACHER',
  'ADMIN',
  'PLACEMENT',
  'EXAMCELL',
  'ACCOUNTS',
  'LIBRARY',
  'HOSTEL',
  'TRANSPORT',
  'SPORTS',
  'HOD',
  'ALUMNI',
  'PLATFORM_ADMIN',
] as const;

export type Role = (typeof ROLES)[number];

export const USER_STATUS = ['ACTIVE', 'SUSPENDED'] as const;
export const PROFILE_STATUS = ['ACTIVE', 'ALUMNUS', 'DROPPED'] as const;
