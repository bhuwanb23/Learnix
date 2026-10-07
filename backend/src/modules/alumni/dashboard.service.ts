/**
 * AL-01 Graduate dashboard — `GET /alumni/dashboard`.
 *
 * WHAT THIS REPLACED, AND WHY THE SHAPE CHANGED
 * ---------------------------------------------
 * The endpoint used to return an OFFICE engagement view: total alumni, an
 * engagement percentage, donations *received by the school*, the number of mentorship
 * pairs awaiting the office's decision, and active fundraising campaigns. Every figure
 * was an `institutionId`-wide aggregate, and the screen was titled "ALUMNI RELATIONS
 * OFFICE".
 *
 * The dashboard users actually open is personal — my batch, my job, my events, my
 * mentorships, what I have given. Those are different questions, and answering them with
 * school-wide totals is not a smaller version of the right answer, it is the wrong
 * answer: "₹2.07 Cr received" next to "My giving" reads as the same number.
 *
 * WHY PER-USER SCOPING HAD TO BE ADDED, NOT DERIVED
 * -------------------------------------------------
 * `GET /alumni/mentorship` returns every pair in the institution and
 * `GET /alumni/donations` returns every donation. Neither is scoped to the caller, so
 * "my mentorships" and "my total contributions" could not be assembled from existing
 * endpoints without a graduate's dashboard showing a stranger's charitable giving. The
 * queries below are therefore written against the CALLER, not the tenant.
 *
 * A missing profile is NOT an error. `getProfileSelf` throws 404 for a user with no
 * `AlumniProfile`, which is a normal state for an office account that was seeded without
 * one. A dashboard that returns 404 for a role that holds `ALUMNI` is wrong; this returns
 * empty sections and a completeness hint instead.
 *
 * Docs: 12-alumni-relations.md §3.1
 */
import { prisma } from '../../db/prisma.js';
import type { Viewer } from './directory.service.js';

const toRupees = (paise: number) => Math.round(paise / 100);

/** Events shown on the dashboard. Enough to be useful, few enough to stay a glance. */
const EVENT_TAKE = 3;
const NEW_ALUMNI_TAKE = 4;
const SUGGESTION_TAKE = 3;
const GIVING_CAMPAIGN_TAKE = 3;

export async function getGraduateDashboard(viewer: Viewer) {
  const institutionId = viewer.institutionId;
  const userId = viewer.userId;

  // Every branch is independent, so one round of Promise.all. Nothing here is sequential
  // against anything else — the profile lookup is not a prerequisite for the events, and
  // waiting for it would add a round trip to a screen people open first thing.
  const [profile, events, pairs, giving, newAlumni, connectionCount] = await Promise.all([
    loadProfile(userId, institutionId),
    loadUpcomingEvents(institutionId, userId),
    loadMentorship(userId, institutionId),
    loadGiving(userId, institutionId),
    loadNewAlumni(institutionId, userId),
    prisma.alumniConnection.count({
      where: { status: 'ACCEPTED', OR: [{ requesterUserId: userId }, { recipientUserId: userId }] },
    }),
  ]);

  const suggestions = await loadSuggestions(viewer);

  return {
    snapshot: buildSnapshot(profile),
    career: buildCareer(profile),
    events,
    mentorship: pairs,
    giving: giving.summary,
    network: { newAlumni, suggestions, connectionCount },
    // Read here rather than by the client: the screen shows one badge, and it must be
    // the caller's mail. This was already scoped per-user in the office version too.
    unreadNotifications: await prisma.notification.count({
      where: { institutionId, recipientUserId: userId, readAt: null },
    }),
  };
}

// ── Snapshot ────────────────────────────────────────────────────────────────────────

type Profile = Awaited<ReturnType<typeof loadProfile>>;

/**
 * `null` rather than throwing when there is no profile. The route contract for the other
 * self endpoints is a 404, but a dashboard is the screen a person lands on, and failing
 * the whole page because one profile is incomplete is the wrong trade.
 */
async function loadProfile(userId: string, institutionId: string) {
  return prisma.alumniProfile.findFirst({
    where: { userId, institutionId },
    select: {
      id: true,
      location: true,
      currentRole: true,
      // The batch is authoritative for the year, but a profile can carry its own
      // `graduationYear` for a batch whose year is unknown, so both are read and the
      // batch wins below. Same rule as `getProfileSelf`.
      graduationYear: true,
      company: { select: { name: true, sector: true } },
      batch: {
        select: {
          name: true,
          graduationYear: true,
          program: { select: { name: true, department: { select: { name: true } } } },
        },
      },
      career: { orderBy: { fromMonth: 'asc' }, select: { title: true, fromMonth: true, toMonth: true } },
      user: { select: { fullName: true } },
    },
  });
}

function buildSnapshot(profile: Profile) {
  const missing: string[] = [];
  if (!profile) {
    return {
      hasProfile: false,
      name: null,
      batchName: null,
      graduationYear: null,
      departmentName: null,
      location: null,
      companyName: null,
      // Named rather than a bare number, so the client can say what is actually absent
      // instead of printing "4/6 fields filled".
      missing: ['profile', 'batch', 'location', 'organisation'],
    };
  }

  if (!profile.batch) missing.push('batch');
  if (!profile.location) missing.push('location');
  if (!profile.company) missing.push('organisation');
  if (!profile.currentRole) missing.push('current role');

  return {
    hasProfile: true,
    name: profile.user.fullName,
    batchName: profile.batch?.name ?? null,
    graduationYear: profile.batch?.graduationYear ?? profile.graduationYear ?? null,
    departmentName: profile.batch?.program?.department?.name ?? null,
    programName: profile.batch?.program?.name ?? null,
    location: profile.location,
    companyName: profile.company?.name ?? null,
    missing,
  };
}

// ── Career ──────────────────────────────────────────────────────────────────────────

/**
 * "Experience" is DERIVED, never stored.
 *
 * Years since the earliest career entry, counted in whole years from the start month. It
 * is deliberately the span of the recorded timeline rather than a sum of durations: a gap
 * between two jobs is not a contribution to experience, and a career with one current
 * role started in 2018 should read "8 years", not "1 role".
 *
 * Career entries are month-precision (`YYYY-MM`), so the arithmetic is done on the month
 * rather than the day — otherwise mid-month signups report a year early.
 */
function buildCareer(profile: Profile) {
  if (!profile || profile.career.length === 0) {
    return {
      hasCareer: false,
      role: profile?.currentRole ?? null,
      company: profile?.company?.name ?? null,
      industry: profile?.company?.sector ?? null,
      yearsExperience: null,
      entryCount: 0,
      missing: ['career history'],
    };
  }

  const first = profile.career[0].fromMonth;
  const years = first ? differenceInYears(first) : null;
  const current = profile.career[profile.career.length - 1];

  return {
    hasCareer: true,
    role: current.toMonth === null ? current.title : profile.currentRole,
    company: current.toMonth === null ? null : profile.company?.name ?? null,
    industry: profile.company?.sector ?? null,
    yearsExperience: years,
    entryCount: profile.career.length,
    startedLabel: first ? monthLabel(first) : null,
    missing: profile.career.length > 0 && !profile.currentRole ? ['current role'] : [],
  };
}

function differenceInYears(from: Date): number {
  const now = new Date();
  // Whole years elapsed, floored. Using the month only keeps someone who started this
  // month at 0 rather than rounding to 1 on the 31st.
  let years = now.getUTCFullYear() - from.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - from.getUTCMonth();
  if (monthDelta < 0) years -= 1;
  return Math.max(0, years);
}

function monthLabel(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ── Events ──────────────────────────────────────────────────────────────────────────

/**
 * Upcoming events the caller can actually join.
 *
 * `registered` is carried per row because "Join" and "You're going" are different
 * actions, and the dashboard should not offer to re-register somebody who already has a
 * seat. It is read from the caller's own registration rows rather than a count over all
 * registrations, for the same reason the mentorship and giving sections are per-user.
 */
async function loadUpcomingEvents(institutionId: string, userId: string) {
  const rows = await prisma.event.findMany({
    where: {
      institutionId,
      category: 'ALUMNI',
      status: { in: ['APPROVED', 'PUBLISHED'] },
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: 'asc' },
    take: EVENT_TAKE,
    include: {
      venue: { select: { name: true } },
      registrations: { where: { registrantUserId: userId }, select: { status: true } },
      _count: { select: { registrations: true } },
    },
  });

  return rows.map((e) => ({
    id: e.id,
    title: e.title,
    eventType: e.eventType,
    isOnline: e.isOnline,
    startDate: e.startDate,
    venue: e.venue?.name ?? null,
    rsvps: e._count.registrations,
    capacity: e.capacity,
    registered: (e.registrations ?? []).length > 0,
  }));
}

// ── Mentorship ──────────────────────────────────────────────────────────────────────

/**
 * The caller's OWN pairs, in every role they could hold.
 *
 * Three predicates, not one. `mentorAlumniUserId` is the mentor side; the mentee side is
 * polymorphic and was made so after this table already had rows, so a pair created before
 * the change has `menteeStudentProfileId` set and `menteeAlumniProfileId` null. Filtering
 * on the alumni mentee alone hides every pre-existing pair — which is the same mistake
 * `listMentorship` documents and corrects with the same `OR`.
 */
async function loadMentorship(userId: string, institutionId: string) {
  const pairs = await prisma.mentorshipPair.findMany({
    where: {
      OR: [
        { mentorAlumniUserId: userId },
        { menteeAlumniProfile: { userId } },
        { menteeStudentProfile: { userId } },
      ],
      // The institution filter matters only on the mentor side, which is a bare scalar
      // user id with no relation to scope through. Without it a user id that somehow
      // appeared in another tenant's pair would surface on this dashboard.
      mentorAlumniUser: { institutionId, deletedAt: null },
    },
    select: {
      id: true,
      status: true,
      field: true,
      nextSessionAt: true,
      mentorAlumniUserId: true,
      menteeAlumniProfile: { select: { userId: true } },
      menteeStudentProfile: { select: { userId: true } },
    },
  });

  const asMentor = pairs.filter((p) => p.mentorAlumniUserId === userId);
  const asMentee = pairs.filter(
    (p) =>
      p.menteeAlumniProfile?.userId === userId || p.menteeStudentProfile?.userId === userId,
  );
  const active = pairs.filter((p) => p.status === 'ACTIVE');
  const pending = pairs.filter((p) => p.status === 'PENDING');

  const nextSessions = active
    .map((p) => p.nextSessionAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    activeCount: active.length,
    pendingCount: pending.length,
    asMentorCount: asMentor.length,
    asMenteeCount: asMentee.length,
    fields: [...new Set(pairs.map((p) => p.field).filter(Boolean))].slice(0, 3),
    nextSession: nextSessions[0] ?? null,
  };
}

// ── Giving ──────────────────────────────────────────────────────────────────────────

/**
 * What THIS person has given. `GET /alumni/donations` returns every donation in the
 * institution, which is the ledger the office reconciles — not a donor's own statement.
 *
 * Received and pledged are kept apart. Collapsing them would let a card read
 * "₹5.25L given" for money the bank has not seen yet, and a donor comparing that against
 * their own bank statement would conclude the app is wrong.
 */
async function loadGiving(userId: string, institutionId: string) {
  const [received, pledged, campaignIds] = await Promise.all([
    prisma.donation.aggregate({
      where: { institutionId, alumniUserId: userId, status: 'RECEIVED' },
      _sum: { amountMinor: true },
      _count: true,
    }),
    prisma.donation.aggregate({
      where: { institutionId, alumniUserId: userId, status: 'PLEDGED' },
      _sum: { amountMinor: true },
      _count: true,
    }),
    prisma.donation.findMany({
      where: { institutionId, alumniUserId: userId, campaignId: { not: null } },
      distinct: ['campaignId'],
      select: { campaignId: true },
      // Ordered so the most recent gift's campaign leads, rather than an arbitrary one
      // from a `distinct` scan. `take` below would otherwise keep whichever row SQLite
      // happened to return first.
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const ids = campaignIds.map((c) => c.campaignId).filter((v): v is string => !!v);
  const campaigns = ids.length
    ? await prisma.fundraisingCampaign.findMany({
        where: { id: { in: ids }, institutionId },
        select: { id: true, name: true, targetMinor: true, raisedMinor: true },
        take: GIVING_CAMPAIGN_TAKE,
      })
    : [];

  return {
    summary: {
      receivedRupees: toRupees(received._sum.amountMinor ?? 0),
      receivedCount: received._count,
      pledgedRupees: toRupees(pledged._sum.amountMinor ?? 0),
      pledgedCount: pledged._count,
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        raisedRupees: toRupees(c.raisedMinor),
        targetRupees: toRupees(c.targetMinor),
        percent: c.targetMinor === 0 ? 0 : Math.round((c.raisedMinor / c.targetMinor) * 100),
      })),
      // An unrestricted gift has no campaign, so "supported campaigns" can legitimately be
      // empty while `receivedCount` is non-zero. The client needs to know which it is.
      unrestrictedOnly: ids.length === 0 && received._count > 0,
    },
  };
}

// ── Network ─────────────────────────────────────────────────────────────────────────

/**
 * Newest alumni, EXCLUDING the caller.
 *
 * `sort: recent` in the directory means `updatedAt desc`, which is "recently touched",
 * not "recently joined" — a profile edited last week outranks one created last month. For
 * a "who's new" list the join date is the honest ordering, so it is ordered here rather
 * than reusing the directory sort and mislabelling it.
 */
async function loadNewAlumni(institutionId: string, userId: string) {
  const rows = await prisma.alumniProfile.findMany({
    where: { institutionId, userId: { not: userId } },
    orderBy: { createdAt: 'desc' },
    take: NEW_ALUMNI_TAKE,
    select: {
      id: true,
      graduationYear: true,
      location: true,
      user: { select: { fullName: true } },
      company: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.user.fullName,
    graduationYear: r.graduationYear,
    location: r.location,
    company: r.company?.name ?? null,
  }));
}

/**
 * Recommended connections.
 *
 * The caller's own pairs and giving have already been read; the suggestions are the only
 * piece that needs a scoring pass, so it is resolved with `await` afterwards rather than
 * inside the `Promise.all` above — `scoreCandidate` is a pure function over a small
 * in-memory set, and keeping it out of the batch makes the dependency obvious to the next
 * reader.
 */
async function loadSuggestions(viewer: Viewer) {
  try {
    const { getMatches } = await import('./connections.service.js');
    const res = await getMatches(viewer, { type: 'connections', limit: SUGGESTION_TAKE });
    return (res.matches ?? []).map((m: any) => ({
      userId: m.userId,
      profileId: m.profileId,
      name: m.name,
      headline: m.headline ?? null,
      graduationYear: m.graduationYear ?? null,
      location: m.location ?? null,
      company: m.company ?? null,
      score: m.score,
      reasons: m.reasons ?? [],
    }));
  } catch {
    // A scorer that throws must not take the whole dashboard down. Suggestions are the
    // most decorative section here; an empty one is better than an error page.
    return [];
  }
}
