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

// ── Domain B — Academic Core ──
export const ENROLLMENT_STATUS = ['ACTIVE', 'DROPPED', 'COMPLETED'] as const;
export const SYLLABUS_STATUS = ['DRAFT', 'SUBMITTED', 'HOD_APPROVED', 'CHANGES_REQUESTED', 'ADMIN_APPROVED'] as const;
export const TOPIC_STATUS = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export const NOTE_STATUS = ['DRAFT', 'PUBLISHED'] as const;
export const ATTENDANCE_SESSION_STATUS = ['OPEN', 'FINALIZED'] as const;
export const ATTENDANCE_STATE = ['PRESENT', 'ABSENT', 'LATE'] as const;
export const CLASS_SESSION_STATUS = ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'] as const;
export const CLASS_MODE = ['OFFLINE', 'VIRTUAL'] as const;
export const ASSIGNMENT_STATUS = ['DRAFT', 'PUBLISHED', 'CLOSED'] as const;
export const SUBMISSION_STATUS = ['PENDING', 'UNDER_REVIEW', 'GRADED', 'FLAGGED', 'RETURNED'] as const;
export const COURSE_TYPE = ['CORE', 'ELECTIVE'] as const;
export const PROGRAM_LEVEL = ['UG', 'PG'] as const;
