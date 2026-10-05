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
