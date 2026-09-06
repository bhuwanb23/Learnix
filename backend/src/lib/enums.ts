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

// ── Domain C — Quizzes & Exams ──
export const QUIZ_STATUS = ['DRAFT', 'PUBLISHED', 'CLOSED'] as const;
export const QUIZ_DIFFICULTY = ['EASY', 'MEDIUM', 'HARD'] as const;
export const QUESTION_TYPE = ['MCQ', 'TRUE_FALSE'] as const;
export const QUIZ_ATTEMPT_STATUS = ['IN_PROGRESS', 'SUBMITTED', 'AUTO_GRADED', 'FLAGGED'] as const;
export const EXAM_TYPE = ['MID_TERM', 'FINAL', 'QUIZ', 'ASSIGNMENT'] as const;
export const EXAM_STATUS = ['SCHEDULED', 'ONGOING', 'COMPLETED', 'RESULTS_PUBLISHED'] as const;
export const EXAM_SLOT_STATUS = ['SCHEDULED', 'COMPLETED', 'RESCHEDULED'] as const;
export const HALL_TICKET_STATUS = ['GENERATED', 'DOWNLOADED', 'NOT_GENERATED'] as const;
export const EVALUATION_STATUS = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
export const EVALUATION_PAPER_STATUS = ['PENDING', 'EVALUATING', 'DONE'] as const;
export const REEVAL_STATUS = ['REQUESTED', 'APPROVED', 'COMPLETED', 'REJECTED'] as const;
export const CHEATING_CASE_STATUS = ['UNDER_REVIEW', 'CONFIRMED', 'DISMISSED', 'ESCALATED'] as const;
export const RISK_LEVEL = ['HIGH', 'MEDIUM', 'LOW'] as const;
export const CHEATING_SOURCE = ['AI', 'INVIGILATOR'] as const;
export const EXAM_CONFLICT_TYPE = ['ROOM', 'TEACHER', 'SUBJECT'] as const;

// ── Domain D — Placement ──
export const JOB_STATUS = ['OPEN', 'CLOSED'] as const;
export const DRIVE_STATUS = ['DRAFT', 'PENDING_ADMIN', 'APPROVED', 'SCHEDULED', 'COMPLETED'] as const;
export const DRIVE_MODE = ['ON_CAMPUS', 'VIRTUAL'] as const;
export const APPLICATION_STATUS = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'] as const;
export const OFFER_STATUS = ['EXTENDED', 'ACCEPTED', 'DECLINED'] as const;
export const DRIVE_REG_STATUS = ['REGISTERED', 'ATTENDED', 'ABSENT'] as const;

// ── Domain E — Finance ──
export const FEE_STRUCTURE_STATUS = ['ACTIVE', 'REVISION_REQUESTED', 'REVISION_APPROVED'] as const;
export const FEE_DUE_STATUS = ['UNPAID', 'PARTIAL', 'CLEARED', 'WAIVED'] as const;
export const PAYMENT_CATEGORY = ['TUITION', 'HOSTEL_RENT', 'MESS', 'TRANSPORT', 'FINE', 'DONATION', 'MISC'] as const;
export const PAYMENT_METHOD = ['UPI', 'NET_BANKING', 'CARD', 'CASH'] as const;
export const PAYMENT_STATUS = ['CLEARED', 'PARTIAL', 'PENDING', 'FAILED'] as const;
export const PAYROLL_STATUS = ['DRAFT', 'RUN', 'PAID'] as const;
export const PAYROLL_ENTRY_STATUS = ['PENDING', 'PAID'] as const;
export const EXPENSE_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const SCHOLARSHIP_TYPE = ['MERIT', 'NEED_BASED'] as const;
export const SCHOLARSHIP_AWARD_STATUS = ['APPROVED', 'DISBURSED', 'REJECTED'] as const;
