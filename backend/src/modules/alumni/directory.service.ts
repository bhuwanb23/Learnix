// Alumni directory — search, filters, facets, profile cards, privacy gating.
// Docs: 12-alumni-relations.md §3.2 (directory), §5 (networking, skills,
// career, privacy controls).
//
// Split out of alumni.service.ts for the same reason dues.money.ts exists: the
// directory grew past what one file can hold, and the privacy rules in
// particular must have exactly ONE implementation. If redaction were applied in
// the list query and forgotten in the detail query, the API would leak contact
// details through the endpoint nobody remembered to harden.

import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';

/** Directory page size. The population is bounded (a college has thousands of
 *  graduates, not millions), so paging is a UI convenience not a scale guard. */
const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Who is asking, from the perspective of privacy. `isOffice` widens visibility
 * because the Alumni Relations Office has a legitimate operational need to see
 * contact details — they are the ones who phone people.
 */
export type Viewer = {
  userId: string;
  institutionId: string;
  isOffice: boolean;
  /** userIds of profiles the viewer has an ACCEPTED connection with. */
  connectedUserIds: string[];
};

/**
 * Which users act as the Alumni Relations OFFICE rather than as graduates.
 *
 * Held in one place because "is this person staff or a graduate?" decides
 * visibility, who may post a chapter announcement, and who may create a
 * connection request — three separate rules that must not drift apart.
 */
export async function officeUserIds(institutionId: string): Promise<string[]> {
  const rows = await prisma.userRole.findMany({
    where: { role: 'ALUMNI_OFFICE', user: { institutionId, deletedAt: null } },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

export async function resolveViewer(userId: string, institutionId: string, officeUserIds: string[]): Promise<Viewer> {
  const accepted = await prisma.alumniConnection.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterUserId: userId }, { recipientUserId: userId }],
    },
    select: { requesterUserId: true, recipientUserId: true },
  });
  const connectedUserIds = accepted
    .map((c) => (c.requesterUserId === userId ? c.recipientUserId : c.requesterUserId))
    .filter((id) => !officeUserIds.includes(id));

  return {
    userId,
    institutionId,
    isOffice: officeUserIds.includes(userId),
    connectedUserIds,
  };
}

/**
 * What the viewer is allowed to see of a given profile, per that profile's own
 * settings. Defaults are CLOSED for contact details — the absence of a settings
 * row is treated as "not published", not "publish everything".
 */
export function visibilityFor(
  viewer: Viewer,
  target: {
    userId: string;
    privacy: {
      showEmail: boolean;
      showPhone: boolean;
      showLocation: boolean;
      showCareer: boolean;
      showSkills: boolean;
      discoverable: boolean;
      visibleTo: string;
    } | null;
  },
) {
  if (viewer.isOffice) {
    return { email: true, phone: true, location: true, career: true, skills: true, reason: 'OFFICE' as const };
  }
  if (target.userId === viewer.userId) {
    // Your own data is always fully visible to you — otherwise you could not
    // edit what you are not allowed to see.
    return { email: true, phone: true, location: true, career: true, skills: true, reason: 'SELF' as const };
  }
  const p = target.privacy;
  if (!p) {
    return { email: false, phone: false, location: false, career: false, skills: false, reason: 'NO_SETTINGS' as const };
  }

  const isConnected = viewer.connectedUserIds.includes(target.userId);
  const scopeAllows = p.visibleTo === 'ANYONE' || (p.visibleTo === 'CONNECTIONS' && isConnected) || p.visibleTo === 'OFFICE';

  return {
    email: scopeAllows && p.showEmail,
    phone: scopeAllows && p.showPhone,
    location: p.showLocation,
    career: p.showCareer,
    skills: p.showSkills,
    reason: isConnected ? ('CONNECTED' as const) : (p.visibleTo as string),
  };
}

type DirectoryQuery = {
  q?: string;
  batch?: number;
  departmentId?: string;
  companyId?: string;
  sector?: string;
  location?: string;
  skill?: string;
  chapterId?: string;
  engagement?: string;
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'recent' | 'seniority';
};

/**
 * Builds the Prisma `where` for the directory.
 *
 * Department is reached through the COHORT, not a column: AlumniProfile →
 * batchId → Batch.programId → Program.departmentId. Adding a departmentId to the
 * profile would have denormalised a path the schema already has and let the two
 * disagree.
 */
function buildWhere(institutionId: string, query: DirectoryQuery) {
  const where: Record<string, unknown> = {
    user: { institutionId, deletedAt: null },
    // A profile that has opted out of discovery stays reachable by direct link
    // (the detail endpoint) but never appears in browse or suggestions.
    privacy: { is: { discoverable: true } },
  };

  if (query.batch) where.graduationYear = query.batch;
  if (query.chapterId) where.chapterId = query.chapterId;
  if (query.engagement) where.engagementStatus = query.engagement;
  if (query.location) where.location = { contains: query.location };
  if (query.companyId) where.companyId = query.companyId;
  if (query.departmentId) where.batch = { program: { departmentId: query.departmentId } };
  if (query.skill) where.skills = { some: { skill: { equals: query.skill } } };

  if (query.sector) {
    // Sector lives on the Company, so filtering by industry means joining
    // through it.
    where.company = { sector: query.sector };
  }

  if (query.q) {
    // One search box covers name, headline, role, company and location. The
    // office's actual question is "who can I call about X", not "whose name
    // starts with A".
    where.OR = [
      { user: { fullName: { contains: query.q } } },
      { currentRole: { contains: query.q } },
      { headline: { contains: query.q } },
      { location: { contains: query.q } },
      { company: { name: { contains: query.q } } },
    ];
  }

  return where;
}

export async function listDirectory(viewer: Viewer, query: DirectoryQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? PAGE_SIZE));
  const where = buildWhere(viewer.institutionId, query);

  // `recent` sorts by most recently updated, `seniority` by graduation year
  // ascending (oldest first = most experienced). Name is the neutral default.
  const orderBy =
    query.sort === 'recent'
      ? { updatedAt: 'desc' as const }
      : query.sort === 'seniority'
        ? { graduationYear: 'asc' as const }
        : { user: { fullName: 'asc' as const } };

  const [profiles, total] = await Promise.all([
    prisma.alumniProfile.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        chapter: { select: { id: true, city: true } },
        company: { select: { id: true, name: true, sector: true } },
        batch: { select: { id: true, name: true, program: { select: { id: true, code: true, name: true, department: { select: { id: true, code: true, name: true } } } } } },
        skills: { orderBy: { level: 'desc' }, take: 6 },
        _count: { select: { skills: true } },
        privacy: true,
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.alumniProfile.count({ where }),
  ]);

  // Connection state is resolved for the whole page in one query rather than
  // per row — 20 sequential queries to colour 20 buttons is the difference
  // between a directory that feels instant and one that feels broken.
  const profileUserIds = profiles.map((p) => p.userId);
  const connections = profileUserIds.length
    ? await prisma.alumniConnection.findMany({
        where: {
          OR: [
            { requesterUserId: viewer.userId, recipientUserId: { in: profileUserIds } },
            { recipientUserId: viewer.userId, requesterUserId: { in: profileUserIds } },
          ],
        },
        select: { requesterUserId: true, recipientUserId: true, status: true },
      })
    : [];
  const connectionByUser = new Map(connections.map((c) => [c.requesterUserId === viewer.userId ? c.recipientUserId : c.requesterUserId, c.status]));

  return {
    stats: { total },
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    alumni: profiles.map((p) => {
      const vis = visibilityFor(viewer, { userId: p.userId, privacy: p.privacy });
      return {
        id: p.id,
        userId: p.userId,
        name: p.user.fullName,
        headline: p.headline ?? p.currentRole,
        currentRole: p.currentRole,
        graduationYear: p.graduationYear,
        // Contact details are included ONLY when the privacy gate allows. The
        // field is always present (as null) so the client never has to guess
        // whether a missing key means "hidden" or "not implemented".
        email: vis.email ? p.user.email : null,
        phone: vis.phone ? p.user.phone : null,
        location: vis.location ? p.location : null,
        company: p.company ? { id: p.company.id, name: p.company.name, sector: p.company.sector } : null,
        program: p.batch
          ? {
              id: p.batch.program.id,
              code: p.batch.program.code,
              name: p.batch.program.name,
              department: p.batch.program.department,
            }
          : null,
        chapter: p.chapter,
        engagementStatus: p.engagementStatus,
        skills: vis.skills ? p.skills.map((s) => ({ skill: s.skill, level: s.level })) : [],
        // The card shows at most 6 skills; the count is the real total, so the
        // UI can say "+3 more" without loading every row.
        skillCount: p._count.skills,
        connectionStatus: connectionByUser.get(p.userId) ?? null,
        isSelf: p.userId === viewer.userId,
        contactVisible: vis.email || vis.phone,
        visibilityReason: vis.reason,
      };
    }),
  };
}

/**
 * Filter options with live counts, so the filter sheet shows what is actually
 * available ("Bengaluru (11)") instead of a list of guesses that may return
 * nothing. Counts respect `discoverable`, so a facet can never advertise rows
 * the directory will then hide.
 */
export async function getFacets(institutionId: string) {
  const base = { institutionId, privacy: { is: { discoverable: true } } };

  const [departments, companies, sectors, locations, batches, skills, chapters] = await Promise.all([
    prisma.program.findMany({
      where: { department: { institutionId }, batches: { some: { alumniProfiles: { some: base } } } },
      select: { id: true, code: true, name: true, department: { select: { id: true, code: true, name: true } } },
      orderBy: { code: 'asc' },
    }),
    prisma.company.findMany({
      where: { institutionId, alumniProfiles: { some: base } },
      select: { id: true, name: true, sector: true, _count: { select: { alumniProfiles: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.company.findMany({
      where: { institutionId, sector: { not: null }, alumniProfiles: { some: base } },
      distinct: ['sector'],
      select: { sector: true },
    }),
    prisma.alumniProfile.findMany({
      where: { ...base, location: { not: null } },
      distinct: ['location'],
      select: { location: true },
    }),
    prisma.batch.findMany({
      where: { program: { department: { institutionId } }, alumniProfiles: { some: base } },
      select: { id: true, name: true, graduationYear: true, _count: { select: { alumniProfiles: true } } },
      orderBy: { graduationYear: 'desc' },
    }),
    prisma.alumniSkill.groupBy({
      by: ['skill'],
      where: { profile: base },
      _count: { _all: true },
      orderBy: { skill: 'asc' },
    }),
    prisma.alumniChapter.findMany({
      where: { institutionId },
      select: { id: true, city: true, memberCount: true },
      orderBy: { city: 'asc' },
    }),
  ]);

  // One pass over the profiles to count per department/location/batch, rather
  // than a grouped aggregate per facet — with four dimensions that would be
  // four extra round trips and four places for the tenant filter to be forgotten.
  const profiles = await prisma.alumniProfile.findMany({
    where: base,
    select: {
      location: true,
      graduationYear: true,
      company: { select: { id: true, sector: true } },
      batch: { select: { id: true, program: { select: { departmentId: true } } } },
    },
  });

  const tally = (keys: (p: (typeof profiles)[number]) => string | null) => {
    const m = new Map<string, number>();
    for (const p of profiles) {
      const k = keys(p);
      if (k === null || k === undefined) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const byDepartment = tally((p) => p.batch?.program.departmentId ?? null);
  const byLocation = tally((p) => p.location);

  return {
    departments: departments
      .map((p) => ({
        id: p.department.id,
        code: p.department.code,
        name: p.department.name,
        count: byDepartment.get(p.department.id) ?? 0,
        programs: [{ id: p.id, code: p.code, name: p.name }],
      }))
      .filter((d) => d.count > 0),
    companies: companies.map((c) => ({ id: c.id, name: c.name, sector: c.sector })),
    sectors: sectors.map((s) => s.sector).filter((s): s is string => !!s).sort(),
    locations: locations
      .map((l) => l.location)
      .filter((l): l is string => !!l)
      .map((l) => ({ value: l, count: byLocation.get(l) ?? 0 }))
      .sort((a, b) => a.value.localeCompare(b.value)),
    // Batches are aggregated by GRADUATION YEAR, not listed per batch row. Each
    // program has its own batch for a given year (CSE 2023, ECE 2023, ME 2023),
    // so listing rows produced "2023 (7), 2023 (7)" in the filter — and the
    // filter itself takes a year, so a duplicate row is a dead end for the user.
    batches: (() => {
      const byYear = new Map<number, number>();
      for (const b of batches) {
        if (b.graduationYear === null) continue;
        byYear.set(b.graduationYear, (byYear.get(b.graduationYear) ?? 0) + b._count.alumniProfiles);
      }
      return [...byYear.entries()]
        .map(([graduationYear, count]) => ({ graduationYear, count }))
        .sort((a, b) => b.graduationYear - a.graduationYear);
    })(),
    skills: skills.map((s) => ({ skill: s.skill, count: s._count._all })).sort((a, b) => b.count - a.count),
    chapters: chapters.map((c) => ({ id: c.id, city: c.city, count: c.memberCount })),
  };
}

/** Full profile for the detail screen: skills, career timeline, education,
 *  connections, contributions — with contact details gated by privacy. */
export async function getProfileDetail(viewer: Viewer, profileId: string) {
  const profile = await prisma.alumniProfile.findFirst({
    where: { id: profileId, user: { institutionId: viewer.institutionId, deletedAt: null } },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      chapter: { select: { id: true, city: true } },
      company: { select: { id: true, name: true, sector: true } },
      batch: {
        select: {
          id: true,
          name: true,
          startYear: true,
          graduationYear: true,
          program: { select: { id: true, code: true, name: true, level: true, department: { select: { id: true, code: true, name: true } } } },
        },
      },
      skills: { orderBy: [{ level: 'desc' }, { skill: 'asc' }] },
      career: { orderBy: { fromMonth: 'desc' }, include: { company: { select: { name: true, sector: true } } } },
      privacy: true,
    },
  });
  if (!profile) throw notFound('Alumni not found');

  const vis = visibilityFor(viewer, { userId: profile.userId, privacy: profile.privacy });

  const [donations, mentorships, eventRegs, connection, mutualCount] = await Promise.all([
    prisma.donation.findMany({
      where: { alumniUserId: profile.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.mentorshipPair.findMany({
      where: { mentorAlumniUserId: profile.userId },
      include: { menteeStudentProfile: { include: { user: { select: { fullName: true } } } } },
      take: 5,
    }),
    prisma.eventRegistration.findMany({
      where: { registrantUserId: profile.userId },
      include: { event: { select: { id: true, title: true, startDate: true, chapterId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.alumniConnection.findFirst({
      where: {
        OR: [
          { requesterUserId: viewer.userId, recipientUserId: profile.userId },
          { recipientUserId: viewer.userId, requesterUserId: profile.userId },
        ],
      },
      select: { id: true, status: true, requesterUserId: true, recipientUserId: true },
    }),
    // Mutual connections — the number that makes a profile feel alive ("12 mutual
    // connections"). Scoped to the viewer's own network so it is the same graph
    // the viewer can actually navigate.
    viewer.connectedUserIds.length
      ? prisma.alumniConnection.count({
          where: {
            status: 'ACCEPTED',
            requesterUserId: { in: viewer.connectedUserIds },
            recipientUserId: profile.userId,
          },
        })
      : Promise.resolve(0),
  ]);

  const totalDonatedPaise = donations
    .filter((d) => d.status === 'RECEIVED')
    .reduce((s, d) => s + d.amountMinor, 0);

  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.user.fullName,
    headline: profile.headline ?? profile.currentRole,
    bio: profile.bio,
    currentRole: profile.currentRole,
    graduationYear: profile.graduationYear,
    email: vis.email ? profile.user.email : null,
    phone: vis.phone ? profile.user.phone : null,
    contactVisible: vis.email || vis.phone,
    visibilityReason: vis.reason,
    location: vis.location ? profile.location : null,
    engagementStatus: profile.engagementStatus,
    company: profile.company,
    chapter: profile.chapter,
    program: profile.batch
      ? {
          id: profile.batch.program.id,
          code: profile.batch.program.code,
          name: profile.batch.program.name,
          level: profile.batch.program.level,
          department: profile.batch.program.department,
        }
      : null,
    education: profile.batch
      ? {
          batch: profile.batch.name,
          program: profile.batch.program.name,
          degree: profile.batch.program.level === 'PG' ? 'Postgraduate' : 'Undergraduate',
          department: profile.batch.program.department.name,
          startYear: profile.batch.startYear,
          graduationYear: profile.batch.graduationYear,
        }
      : null,
    skills: vis.skills
      ? profile.skills.map((s) => ({ skill: s.skill, level: s.level, yearsExperience: s.yearsExperience }))
      : [],
    // An empty array is a valid answer ("career hidden") and must be
    // distinguishable from "no career on file" — hence the flag alongside it.
    career: vis.career
      ? profile.career.map((c) => ({
          id: c.id,
          title: c.title,
          employer: c.companyId ? null : c.employerLabel,
          companyId: c.companyId,
          employerLabel: c.employerLabel,
          location: c.location,
          fromMonth: c.fromMonth,
          toMonth: c.toMonth,
          isCurrent: c.toMonth === null,
          isHighlight: c.isHighlight,
        }))
      : [],
    careerVisible: vis.career,
    connectionStatus: connection
      ? connection.status
      : null,
    connectionDirection: connection
      ? (connection.requesterUserId === viewer.userId ? 'OUTGOING' : 'INCOMING')
      : null,
    connectionId: connection?.id ?? null,
    mutualConnections: mutualCount,
    contributions: {
      totalDonatedRupees: Math.round(totalDonatedPaise / 100),
      donations: donations.map((d) => ({
        id: d.id,
        fund: d.fund,
        amountRupees: Math.round(d.amountMinor / 100),
        status: d.status,
        date: d.receivedAt ?? d.createdAt,
      })),
      mentorship: mentorships.map((m) => ({
        id: m.id,
        mentee: m.menteeStudentProfile.user.fullName,
        field: m.field,
        status: m.status,
      })),
      events: eventRegs.map((r) => ({
        id: r.event.id,
        title: r.event.title,
        date: r.event.startDate,
        status: r.status,
      })),
    },
  };
}

/** The caller's own directory profile, for self-service editing. */
export async function getMyProfile(viewer: Viewer) {
  const profile = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true },
  });
  if (!profile) throw notFound('No alumni profile for this account');
  return getProfileDetail(viewer, profile.id);
}

type UpdateMyProfileInput = {
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  currentRole?: string | null;
  companyId?: string | null;
  chapterId?: string | null;
  skills?: { skill: string; level?: string }[];
  privacy?: {
    showEmail?: boolean;
    showPhone?: boolean;
    showLocation?: boolean;
    showCareer?: boolean;
    showSkills?: boolean;
    discoverable?: boolean;
    visibleTo?: 'ANYONE' | 'CONNECTIONS' | 'OFFICE';
  };
};

/**
 * Self-service update of the caller's own profile.
 *
 * Every field is read as `undefined` rather than defaulted, because the endpoint
 * is a PATCH: an absent key must leave the column alone. Defaulting `bio` to ''
 * would erase an alumnus's bio every time they changed their headline.
 *
 * `discoverable` is clamped so it can only ever be set by the account owner —
 * the office editing someone's discoverability would let staff unlist a
 * graduate without their consent, which is the exact outcome the privacy model
 * exists to prevent.
 */
export async function updateMyProfile(viewer: Viewer, input: UpdateMyProfileInput) {
  const profile = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true },
  });
  if (!profile) throw notFound('No alumni profile for this account');

  const data: Record<string, unknown> = {};
  if (input.headline !== undefined) data.headline = input.headline;
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.location !== undefined) data.location = input.location;
  if (input.currentRole !== undefined) data.currentRole = input.currentRole;
  if (input.companyId !== undefined) data.companyId = input.companyId;
  if (input.chapterId !== undefined) {
    // A chapter must belong to THIS institution, or a caller could attach
    // themselves to another college's chapter by guessing an id.
    if (input.chapterId) {
      const chapter = await prisma.alumniChapter.findFirst({
        where: { id: input.chapterId, institutionId: viewer.institutionId },
        select: { id: true },
      });
      if (!chapter) throw notFound('Chapter not found');
    }
    data.chapterId = input.chapterId;
  }

  if (Object.keys(data).length > 0) {
    await prisma.alumniProfile.update({ where: { id: profile.id }, data });
  }

  // Skills are REPLACED, not merged. The UI sends the full list the user sees;
  // merging would make it impossible to remove a skill, and the set is small
  // (≤30) so a delete+insert is cheaper than the bookkeeping needed to diff.
  if (input.skills !== undefined) {
    await prisma.$transaction(async (tx) => {
      await tx.alumniSkill.deleteMany({ where: { alumniProfileId: profile.id } });
      if (input.skills!.length > 0) {
        await tx.alumniSkill.createMany({
          data: input.skills!.map((s) => ({
            alumniProfileId: profile.id,
            skill: s.skill,
            level: s.level ?? 'INTERMEDIATE',
          })),
        });
      }
    });
  }

  // Privacy settings are upserted, not required to pre-exist: an alumnus who has
  // never touched the privacy screen must be able to set their preferences
  // without the endpoint demanding a row was created first.
  if (input.privacy !== undefined) {
    await prisma.alumniPrivacySettings.upsert({
      where: { alumniProfileId: profile.id },
      create: {
        alumniProfileId: profile.id,
        showEmail: input.privacy.showEmail ?? false,
        showPhone: input.privacy.showPhone ?? false,
        showLocation: input.privacy.showLocation ?? true,
        showCareer: input.privacy.showCareer ?? true,
        showSkills: input.privacy.showSkills ?? true,
        discoverable: input.privacy.discoverable ?? true,
        visibleTo: input.privacy.visibleTo ?? 'CONNECTIONS',
      },
      update: {
        ...(input.privacy.showEmail !== undefined ? { showEmail: input.privacy.showEmail } : {}),
        ...(input.privacy.showPhone !== undefined ? { showPhone: input.privacy.showPhone } : {}),
        ...(input.privacy.showLocation !== undefined ? { showLocation: input.privacy.showLocation } : {}),
        ...(input.privacy.showCareer !== undefined ? { showCareer: input.privacy.showCareer } : {}),
        ...(input.privacy.showSkills !== undefined ? { showSkills: input.privacy.showSkills } : {}),
        ...(input.privacy.discoverable !== undefined ? { discoverable: input.privacy.discoverable } : {}),
        ...(input.privacy.visibleTo !== undefined ? { visibleTo: input.privacy.visibleTo } : {}),
      },
    });
  }

  // Chapter membership changed → the denormalised memberCount must follow.
  const fresh = await prisma.alumniProfile.findUnique({
    where: { id: profile.id },
    select: { chapterId: true },
  });
  if (fresh?.chapterId) {
    const members = await prisma.alumniProfile.count({
      where: { institutionId: viewer.institutionId, chapterId: fresh.chapterId, engagementStatus: 'ACTIVE' },
    });
    await prisma.alumniChapter.update({
      where: { id: fresh.chapterId },
      data: { memberCount: members },
    });
  }

  return getProfileDetail(viewer, profile.id);
}