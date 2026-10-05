import { z } from 'zod';

// Exam Cell module request schemas (docs/users/05 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

// X-02 Exam schedule — create exam
export const createExamSchema = z.object({
  semester: z.number().int().min(1).max(8),
  type: z.enum(['MID_TERM', 'FINAL', 'QUIZ', 'ASSIGNMENT']),
  name: z.string().trim().min(3).max(120),
});

// X-02 Exam schedule — add slot
export const createExamSlotSchema = z.object({
  offeringId: z.string().min(1).max(64),
  date: z.string().min(1), // ISO date string
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().trim().max(60).optional(),
  seats: z.number().int().min(1).max(500).default(30),
});

// X-02 Exam schedule — reschedule slot
export const rescheduleSlotSchema = z.object({
  date: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().trim().max(60).optional(),
});

// X-03 Room allocations — allocate room
export const allocateRoomSchema = z.object({
  roomId: z.string().trim().min(1).max(64),
  invigilatorUserId: z.string().min(1).max(64).optional(),
});

// X-04 Hall tickets — batch generate
export const generateHallTicketsSchema = z.object({
  examId: z.string().min(1).max(64),
});

// X-05 Evaluations — assign evaluator
export const assignEvaluatorSchema = z.object({
  evaluatorUserId: z.string().min(1).max(64),
});

// X-05 Evaluations — enter marks
export const enterMarksSchema = z.object({
  marksObtained: z.number().int().min(0),
  maxMarks: z.number().int().min(1),
});

// X-06 Results — publish
export const publishResultsSchema = z.object({
  examSlotId: z.string().min(1).max(64),
});

// X-06 Results — enter result
export const enterResultSchema = z.object({
  studentProfileId: z.string().min(1).max(64),
  examSlotId: z.string().min(1).max(64),
  marksObtained: z.number().int().min(0),
  maxMarks: z.number().int().min(1),
  grade: z.string().trim().min(1).max(10),
  isPass: z.boolean(),
});

// X-07 Re-evaluation — decide
export const decideRevalSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'COMPLETED']),
});

// X-08 Cheating cases — decide
export const decideCheatingSchema = z.object({
  decision: z.enum(['CONFIRMED', 'DISMISSED', 'ESCALATED']),
});

// X-09 Notifications — broadcast
export const examcellBroadcastSchema = z.object({
  audience: z.enum(['ALL_STUDENTS', 'SEM_STUDENTS', 'FINAL_YEAR']),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
});


// ═══════════════════════════════════════════════════════════════════════════
// X-02 Timetable (docs/users/05 §3.9)
//
// EVERY schema here is `.strict()`.
//
// None of the pre-existing examcell schemas were, which means a typo is
// silently dropped rather than rejected: `POST /timetable { name, typr }` used
// to create an exam with the default type and no complaint at all. A field the
// server ignores looks exactly like a field it honoured, and the caller has no
// way to tell which happened.
// ═══════════════════════════════════════════════════════════════════════════

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO "YYYY-MM-DD" date');

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be a 24-hour "HH:MM" time');

export const timetableCatalogueQuerySchema = z.object({}).strict();

export const timetableBlockQuerySchema = z
  .object({ examId: z.string().min(1).max(64).optional() })
  .strict();

export const timetableStudentsQuerySchema = z
  .object({ studentProfileId: z.string().min(1).max(64).optional() })
  .strict();

export const timetableExamParamSchema = z.object({ id: z.string().min(1).max(64) }).strict();

export const timetableSlotParamSchema = z.object({ id: z.string().min(1).max(64) }).strict();

export const timetableAllocationParamSchema = z
  .object({ id: z.string().min(1).max(64) })
  .strict();

export const createTimetableExamSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    type: z.enum(['MID_TERM', 'FINAL', 'QUIZ', 'ASSIGNMENT']),
    semester: z.number().int().min(1).max(8),
    academicYearId: z.string().min(1).max(64).optional(),
  })
  .strict();

export const updateTimetableExamSchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),
    semester: z.number().int().min(1).max(8).optional(),
    academicYearId: z.string().min(1).max(64).optional(),
    status: z
      .enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'RESULTS_PUBLISHED'])
      .optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'nothing to update' });

export const addTimetableSlotSchema = z
  .object({
    offeringId: z.string().min(1).max(64),
    date: isoDate,
    startTime: hhmm,
    endTime: hhmm,
    seats: z.number().int().min(1).max(2000).optional(),
  })
  .strict();

export const rescheduleTimetableSlotSchema = z
  .object({
    date: isoDate.optional(),
    startTime: hhmm.optional(),
    endTime: hhmm.optional(),
    seats: z.number().int().min(1).max(2000).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'nothing to reschedule' });

export const allocateVenueSchema = z
  .object({
    venueId: z.string().min(1).max(64),
    invigilatorUserId: z.string().min(1).max(64).nullable().optional(),
  })
  .strict();

export const assignInvigilatorSchema = z
  .object({ invigilatorUserId: z.string().min(1).max(64).nullable() })
  .strict();

export const publishTimetableExamSchema = z.object({}).strict();

export const completeTimetableSlotSchema = z.object({}).strict();
