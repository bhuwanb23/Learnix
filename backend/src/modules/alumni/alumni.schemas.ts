import { z } from 'zod';

// Alumni Relations module request schemas (docs/users/12 §4)

/**
 * Directory filters. Every field is OPTIONAL and independent — the UI keeps them
 * all in state and sends only what is set. `departmentId`/`companyId` are ids
 * from `/directory/facets`, never free text: filtering by name would make the
 * same company appear twice under two spellings.
 */
export const directoryQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  batch: z.coerce.number().int().min(1980).max(2100).optional(),
  departmentId: z.string().trim().min(1).max(64).optional(),
  companyId: z.string().trim().min(1).max(64).optional(),
  sector: z.string().trim().min(1).max(40).optional(),
  location: z.string().trim().min(1).max(80).optional(),
  skill: z.string().trim().min(1).max(60).optional(),
  chapterId: z.string().trim().min(1).max(64).optional(),
  engagement: z.enum(['ACTIVE', 'INACTIVE', 'LOST']).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.enum(['name', 'recent', 'seniority']).optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export const chapterQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  sort: z.enum(['city', 'members', 'activity']).optional(),
  region: z.string().trim().min(1).max(80).optional(),
  tier: z.enum(['LOCAL', 'REGIONAL']).optional(),
});

export const chapterMembersQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  sort: z.enum(['name', 'seniority', 'recent']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const connectionsQuerySchema = z.object({
  box: z.enum(['incoming', 'outgoing', 'accepted']).default('incoming'),
});

export const matchesQuerySchema = z.object({
  type: z.enum(['connections', 'mentors']).default('connections'),
  skill: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const connectionRequestSchema = z.object({
  profileId: z.string().min(1).max(64),
  // Optional: connecting without a note is normal, so this must not be required.
  message: z.string().trim().min(1).max(500).optional(),
});

export const connectionActionSchema = z.object({
  action: z.enum(['accept', 'decline', 'cancel']),
});

export const chapterAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(2000),
});

// ── Events (AL-03) ────────────────────────────────────────────

export const eventTypes = ['REUNION', 'NETWORKING', 'WORKSHOP', 'WEBINAR', 'MEETUP'] as const;

export const eventQuerySchema = z.object({
  scope: z.enum(['upcoming', 'past', 'mine']).optional(),
  type: z.enum(eventTypes).optional(),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(['date', 'recent', 'popularity', 'title']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const createEventSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional(),
  eventType: z.enum(eventTypes).optional(),
  startDate: z.string().min(8).max(40),
  endDate: z.string().min(8).max(40),
  venueId: z.string().trim().min(1).max(64).optional(),
  isOnline: z.boolean().optional(),
  meetingUrl: z.string().trim().max(500).optional(),
  capacity: z.coerce.number().int().min(1).max(100000).optional(),
  chapterId: z.string().trim().min(1).max(64).optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const updateEventSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    eventType: z.enum(eventTypes).optional(),
    startDate: z.string().min(8).max(40).optional(),
    endDate: z.string().min(8).max(40).optional(),
    capacity: z.coerce.number().int().min(1).max(100000).optional(),
    isOnline: z.boolean().optional(),
    meetingUrl: z.string().trim().max(500).optional(),
    status: z.enum(['DRAFT', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Provide at least one field to update',
  });

export const scheduleItemSchema = z.object({
  day: z.coerce.number().int().min(1).max(30),
  item: z.string().trim().min(2).max(200),
  order: z.coerce.number().int().min(1).max(999).optional(),
  startsAt: z.string().min(8).max(40).optional(),
  endsAt: z.string().min(8).max(40).optional(),
  speaker: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  track: z.string().trim().max(80).optional(),
});

export const scheduleItemDoneSchema = z.object({ isDone: z.boolean() });

/**
 * Attendance is marked by registration id, not user id, so the office marks the
 * row they see on screen. It is deliberately an array: real check-in is a
 * headcount, not one-at-a-time.
 */
export const attendanceSchema = z.object({
  registrationIds: z.array(z.string().trim().min(1).max(64)).min(1).max(500),
  method: z.enum(['MANUAL', 'QR']).optional(),
});

export const qrCheckInSchema = z.object({ code: z.string().trim().min(4).max(200) });

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

export const photoCaptionSchema = z.object({
  caption: z.string().trim().max(300).optional(),
});

export const addAttendeeSchema = z.object({
  userId: z.string().trim().min(1).max(64),
  status: z.enum(['CONFIRMED', 'PENDING']).optional(),
});

export const removeAttendeeSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const chapterEventSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(3).max(1000).optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().min(10).max(40)),
  endDate: z.string().datetime({ offset: true }).or(z.string().min(10).max(40)).optional(),
  capacity: z.coerce.number().int().min(1).max(100000).optional(),
  venueId: z.string().trim().min(1).max(64).optional(),
});

// ── Chapter creation / metadata (office) ──
export const createChapterSchema = z.object({
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().min(1).max(80).optional(),
  tier: z.enum(['LOCAL', 'REGIONAL']).optional(),
  description: z.string().trim().max(1000).optional(),
  foundedOn: z.string().min(8).max(40).optional(),
  meetingFrequency: z.string().trim().max(60).optional(),
  // Optional: a chapter may be created before its president is appointed, in
  // which case the seat starts vacant.
  presidentProfileId: z.string().trim().min(1).max(64).optional(),
});

export const updateChapterSchema = z.object({
  region: z.string().trim().max(80).nullish(),
  tier: z.enum(['LOCAL', 'REGIONAL']).optional(),
  description: z.string().trim().max(1000).nullish(),
  meetingFrequency: z.string().trim().max(60).nullish(),
});

// ── Leadership ──
export const assignOfficerSchema = z.object({
  profileId: z.string().trim().min(1).max(64),
  role: z.enum(['PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'TREASURER', 'COORDINATOR']),
  since: z.string().min(8).max(40).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const resignOfficerSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// ── Initiatives ──
export const createInitiativeSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(['MENTORSHIP', 'SCHOLARSHIP', 'OUTREACH', 'FUNDRAISING', 'SOCIAL']).optional(),
  // Nullable: an open-ended initiative ("a mentoring hour each month") has no
  // countable goal, so 0 must not be the way to say "none".
  targetCount: z.coerce.number().int().min(1).max(1000000).nullish(),
  startDate: z.string().min(8).max(40).optional(),
  targetDate: z.string().min(8).max(40).optional(),
  campaignId: z.string().trim().min(1).max(64).optional(),
  ownerProfileId: z.string().trim().min(1).max(64).optional(),
});

export const updateInitiativeSchema = z.object({
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  achievedCount: z.coerce.number().int().min(0).max(1000000).optional(),
  targetCount: z.coerce.number().int().min(1).max(1000000).nullish(),
  targetDate: z.string().min(8).max(40).nullish(),
  description: z.string().trim().max(2000).nullish(),
});

export const initiativesQuerySchema = z.object({
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
});

export const officersQuerySchema = z.object({
  includePast: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
});

// ── Membership ──
export const removeMemberSchema = z.object({
  profileId: z.string().trim().min(1).max(64),
  // Required, not optional: silently dropping someone off a roster is
  // indistinguishable from a data error three months later.
  reason: z.string().trim().min(5).max(500),
});

// ── Mentorship (AL-05) ──────────────────────────────────────

export const mentorshipQuerySchema = z.object({
  scope: z.enum(['active', 'pending', 'history', 'all']).optional(),
});

export const mentorshipRequestSchema = z
  .object({
    // Office enrolment on someone's behalf. A graduate requesting for themselves
    // supplies neither — their identity comes from the session.
    alumniProfileId: z.string().trim().min(1).max(64).optional(),
    studentProfileId: z.string().trim().min(1).max(64).optional(),
    requestedSkills: z.string().trim().max(500).optional(),
    message: z.string().trim().max(2000).optional(),
    field: z.string().trim().max(120).optional(),
    mentorUserId: z.string().trim().min(1).max(64).optional(),
  })
  .refine((v) => !(v.alumniProfileId && v.studentProfileId), {
    message: 'A mentee is either an alumnus or a student, not both',
  });

export const mentorshipDecisionSchema = z
  .object({
    action: z.enum(['accept', 'decline']),
    mentorUserId: z.string().trim().min(1).max(64).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.action !== 'decline' || (v.reason && v.reason.trim().length >= 5), {
    message: 'A decline needs a reason of at least 5 characters',
    path: ['reason'],
  });

const pairBodyShape = {
  mentorUserId: z.string().trim().min(1).max(64),
  alumniProfileId: z.string().trim().min(1).max(64).optional(),
  studentProfileId: z.string().trim().min(1).max(64).optional(),
  // Required: there is no demo fallback any more, and a pair with no field
  // cannot be matched, filtered, or reported on.
  field: z.string().trim().min(2).max(120),
};

/** Both refine()s live in a helper because a ZodEffects has no `.omit()` — which
 *  is exactly what the office shortcut below needs. */
function withMenteeRules<T extends z.ZodTypeAny>(shape: T) {
  return shape
    .refine((v: any) => !!(v.alumniProfileId || v.studentProfileId), {
      message: 'Specify alumniProfileId or studentProfileId',
    })
    .refine((v: any) => !(v.alumniProfileId && v.studentProfileId), {
      message: 'A mentee is either an alumnus or a student, not both',
    });
}

export const createPairSchema = withMenteeRules(z.object(pairBodyShape));

/** The office pairing shortcut: the mentor comes from the route, not the body. */
export const officePairMentorSchema = withMenteeRules(
  z.object({ ...pairBodyShape, mentorUserId: z.undefined().optional() }),
);

export const completePairSchema = z.object({ outcome: z.string().trim().max(1000).optional() });

export const mentorshipSessionSchema = z
  .object({
    sessionDate: z.string().min(8).max(40),
    notes: z.string().trim().max(4000).optional(),
    durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
    mode: z.enum(['IN_PERSON', 'VIDEO', 'PHONE']).optional(),
    agenda: z.string().trim().max(2000).optional(),
    outcome: z.string().trim().max(2000).optional(),
    planned: z.boolean().optional(),
  })
  .refine((v) => v.planned !== true || !v.durationMinutes, {
    message: 'A planned session has no duration yet — log it once it has happened',
    path: ['durationMinutes'],
  });

export const updateSessionSchema = z.object({
  sessionDate: z.string().min(8).max(40).optional(),
  notes: z.string().trim().max(4000).optional(),
  durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  mode: z.enum(['IN_PERSON', 'VIDEO', 'PHONE']).optional(),
  agenda: z.string().trim().max(2000).optional(),
  outcome: z.string().trim().max(2000).optional(),
});

export const cancelSessionSchema = z.object({ reason: z.string().trim().max(500).optional() });

export const goalSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    detail: z.string().trim().max(2000).optional(),
    targetDate: z.string().min(8).max(40).optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'ACHIEVED', 'DROPPED']).optional(),
    progressPct: z.coerce.number().int().min(0).max(100).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Provide at least one field to update',
  });

/**
 * The UPDATE half of the goal contract, where every field is optional.
 *
 * `goalSchema` requires `title`, because a goal without one is meaningless. But it
 * was also wired to the PATCH route, so `{ status: 'ACHIEVED' }` — a partial
 * update, which is what the UI's "mark done" button sends — was rejected with
 * "title Required". Goals could therefore be created and never moved.
 */
export const updateGoalSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    detail: z.string().trim().max(2000).optional(),
    targetDate: z.string().min(8).max(40).nullable().optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'ACHIEVED', 'DROPPED']).optional(),
    progressPct: z.coerce.number().int().min(0).max(100).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Provide at least one field to update',
  });

export const mentorshipFeedbackSchema = z
  .object({
    mentorRating: z.coerce.number().int().min(1).max(5).optional(),
    menteeRating: z.coerce.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.mentorRating !== undefined || v.menteeRating !== undefined, {
    message: 'Rate the mentor, the mentee, or both',
  });

/** Office-side enrolment. The reason is optional here — unlike a removal, adding
 *  someone is not destructive — but recorded when given. */
export const addMemberSchema = z.object({
  profileId: z.string().trim().min(1).max(64),
  reason: z.string().trim().max(500).optional(),
});

/**
 * Self-service profile update. Every field optional — a PATCH-like update where
 * an absent key means "leave it alone". That is why the service reads
 * `undefined` rather than defaulting: defaulting would silently blank a field
 * the caller never mentioned.
 */
export const updateMyProfileSchema = z.object({
  headline: z.string().trim().max(160).nullish(),
  bio: z.string().trim().max(2000).nullish(),
  location: z.string().trim().max(80).nullish(),
  currentRole: z.string().trim().max(120).nullish(),
  companyId: z.string().trim().min(1).max(64).nullish(),
  chapterId: z.string().trim().min(1).max(64).nullish(),
  skills: z.array(z.object({ skill: z.string().trim().min(1).max(60), level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional() })).max(30).optional(),
  privacy: z
    .object({
      showEmail: z.boolean().optional(),
      showPhone: z.boolean().optional(),
      showLocation: z.boolean().optional(),
      showCareer: z.boolean().optional(),
      showSkills: z.boolean().optional(),
      discoverable: z.boolean().optional(),
      visibleTo: z.enum(['ANYONE', 'CONNECTIONS', 'OFFICE']).optional(),
    })
    .optional(),
});

/**
 * The donation ledger is unbounded (one row per gift), so it is paginated.
 * Defaults match the service; pageSize is capped there so a caller cannot ask
 * for the whole table.
 */
export const donationPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const rsvpDecisionSchema = z.object({
  decision: z.enum(['CONFIRMED', 'DECLINED']),
});

export const broadcastSchema = z.object({
  audience: z.enum(['ALL_ALUMNI', 'BATCH_2024', 'CITY_BENGALURU', 'MENTORS']),
  templateKey: z.enum(['EVENT_INVITE', 'NEWSLETTER', 'REUNION', 'DONATION_APPEAL']),
  title: z.string().min(3).max(120),
  body: z.string().min(3).max(2000),
});

export const mentorshipActionSchema = z.object({
  action: z.enum(['approve', 'decline', 'remind']).optional(),
});
