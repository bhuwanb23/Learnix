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
  // The Alumni Relations OFFICE, as distinct from a graduate.
  //
  // `ALUMNI` alone cannot tell them apart: an office user and a graduate both
  // hold `ALUMNI`, both have an AlumniProfile, and neither has a StaffProfile.
  // Three rules depend on the difference — who may post a chapter
  // announcement, who may assign officers, and whether contact details are
  // visible — so it is modelled as a role rather than a boolean flag on the
  // profile.
  'ALUMNI_OFFICE',
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

// ── Domain F — Library ──
export const BOOK_ISSUE_STATUS = ['ISSUED', 'RETURNED', 'OVERDUE'] as const;
export const FINE_STATUS = ['PENDING', 'PAID', 'WAIVED'] as const;
export const BOOK_REQUEST_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'PROCURED'] as const;
export const DIGITAL_RESOURCE_TYPE = ['PDF', 'EBOOK', 'JOURNAL'] as const;
export const PROCUREMENT_STATUS = ['REQUESTED', 'APPROVED', 'ORDERED', 'RECEIVED'] as const;

// ── Domain G — Hostel ──
export const BED_STATUS = ['VACANT', 'ALLOCATED', 'MAINTENANCE'] as const;
export const ALLOCATION_STATUS = ['ACTIVE', 'TRANSFERRED', 'VACATED'] as const;
export const MEAL = ['BREAKFAST', 'LUNCH', 'DINNER'] as const;
export const GATE_PASS_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const COMPLAINT_CATEGORY = ['PLUMBING', 'ELECTRICAL', 'NETWORK', 'MAINTENANCE'] as const;
export const COMPLAINT_STATUS = ['OPEN', 'ASSIGNED', 'RESOLVED'] as const;
export const VISITOR_STATUS = ['IN', 'OUT'] as const;

// ── Domain H — Transport ──
export const VEHICLE_STATUS = ['ON_ROAD', 'IDLE', 'SERVICE'] as const;
export const DUTY_STATUS = ['ON_DUTY', 'OFF_DUTY', 'ON_LEAVE'] as const;
export const ROUTE_ENROLLMENT_STATE = ['ACTIVE', 'REMOVED'] as const;
export const BUS_STATUS = ['ON_TIME', 'DELAYED'] as const;
export const SERVICE_TYPE = ['PERIODIC', 'REPAIR', 'INSPECTION'] as const;
export const SERVICE_STATUS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] as const;

// ── Domain I — Events, Sports & Cultural ──
export const EVENT_CATEGORY = ['TECH', 'SPORTS', 'CULTURAL', 'ALUMNI', 'OTHER'] as const;
export const EVENT_STATUS = ['DRAFT', 'PENDING_ADMIN', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'CANCELLED'] as const;
export const EVENT_REG_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'CONFIRMED', 'DECLINED'] as const;
export const TOURNAMENT_STATUS = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;
export const FIXTURE_STATUS = ['UPCOMING', 'TODAY', 'COMPLETED'] as const;
export const VENUE_STATUS = ['AVAILABLE', 'BOOKED', 'MAINTENANCE'] as const;
export const VENUE_BOOKING_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const EQUIPMENT_CONDITION = ['GOOD', 'NEEDS_REPAIR'] as const;
export const EQUIPMENT_ISSUE_STATUS = ['ISSUED', 'RETURNED', 'OVERDUE'] as const;

// ── Domain J — Alumni ──
export const CAMPAIGN_STATUS = ['ACTIVE', 'COMPLETED'] as const;
export const DONATION_STATUS = ['PLEDGED', 'RECEIVED'] as const;
export const DONATION_FUND = ['GENERAL', 'LIBRARY', 'SCHOLARSHIP', 'INFRASTRUCTURE'] as const;
export const MENTORSHIP_STATUS = ['PENDING', 'ACTIVE', 'DECLINED', 'COMPLETED'] as const;

// Chapters (docs/users/12 §3.6). A chapter is a CITY; `tier` distinguishes a
// neighbourhood/local chapter from a large regional one, and `region` groups
// cities for the directory ("Karnataka → Bengaluru") without introducing a
// nested Region parent, which would complicate every join/leave and aggregate
// for no benefit at college scale.
export const CHAPTER_TIER = ['LOCAL', 'REGIONAL'] as const;
// A chapter is a committee, not one person. `presidentAlumniUserId` on
// AlumniChapter is a maintained POINTER to the current PRESIDENT row — the
// officers table is authoritative and this column is written only by the
// assign/resign service functions.
export const CHAPTER_OFFICER_ROLE = [
  'PRESIDENT',
  'VICE_PRESIDENT',
  'SECRETARY',
  'TREASURER',
  'COORDINATOR',
] as const;
export const INITIATIVE_CATEGORY = [
  'MENTORSHIP',
  'SCHOLARSHIP',
  'OUTREACH',
  'FUNDRAISING',
  'SOCIAL',
] as const;
export const INITIATIVE_STATUS = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
// What the viewer is allowed to do in a chapter. Computed server-side so the UI
// never offers an action the backend would reject.
export const CHAPTER_VISIBILITY = ['ANYONE', 'CONNECTIONS', 'OFFICE'] as const;

// ── Domain K — Communication ──
export const BROADCAST_CHANNEL = ['IN_APP', 'EMAIL', 'PUSH'] as const;
export const ANNOUNCEMENT_STATUS = ['DRAFT', 'PENDING_ADMIN', 'PUBLISHED', 'REJECTED'] as const;
export const EMAIL_STATUS = ['QUEUED', 'SENT', 'FAILED'] as const;
export const AI_FEATURE = ['STUDY_BUDDY', 'TEACHING_INSIGHT', 'PERFORMANCE_NOTE'] as const;

// ── Domain L — System ──
export const FILE_PURPOSE = [
  'NOTE_ATTACHMENT', 'ASSIGNMENT_ATTACHMENT', 'SUBMISSION', 'AVATAR', 'COVER', 'PAYSLIP', 'LOGO', 'RESUME',
] as const;
export const PLATFORM_ADMIN_LEVEL = ['SUPER', 'SUPPORT'] as const;
