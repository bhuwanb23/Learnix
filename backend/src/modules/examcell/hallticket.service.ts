// X-04 Hall tickets — the block service (docs/users/05 §3.5).
//
// Seven blocks and six mutations in ONE file, for the reason the timetable
// service is one file: what a ticket PRINTS is spread over five tables
// (student, enrolment, slot, venue, fees), and splitting it across modules
// would put "is this student eligible?" in a different file from the code that
// actually issues their ticket.
//
// THE POLICY, restated where it is enforced: ELIGIBILITY WARNINGS NEVER BLOCK.
// `generateBulk` issues a ticket for every ACTIVE enrolment and reports the
// warnings beside the result. The only refusals are structural — an exam that
// is not this institution's, an id that does not exist, a body that fails its
// schema, a seat somebody already holds. There is no code path here that says
// "you owe money, so you may not sit the exam".
import { prisma } from '../../db/prisma.js';
import { writeAudit } from '../../lib/audit.js';
import { conflict, notFound, unprocessable } from '../../lib/errors.js';
import {
  BLOCKS,
  CORRECTABLE_FIELDS,
  ELIGIBILITY_REASONS,
  PUBLICATION_STATUSES,
  REQUEST_KINDS,
  REQUEST_STATUSES,
  THRESHOLDS,
  TICKET_STATUSES,
  TICKET_STATUS_META,
  assertBlock,
  assertCorrectableField,
  assertDecision,
  assertPublicationAction,
  assertRequestKind,
  eligibilityReasonMeta,
  nextSeatNo,
  qrPayloadFor,
} from './hallticket.rules.js';

// ═══ Tenant scoping ══════════════════════════════════════════════════════
//
// `CourseOffering` carries NO institutionId of its own — the denormalized
// anchor is `Course.institutionId`. `HallTicket` and `HallTicketRequest` reach
// theirs through `examSlot.exam.institutionId`. Every lookup below goes through
// one of these three, because a ticket is exactly the kind of record whose
// existence in another college must not be observable.

const offeringWhere = (institutionId: string, id?: string) => ({
  ...(id ? { id } : {}),
  course: { institutionId },
});

const examWhere = (institutionId: string, examId?: string) => ({
  ...(examId ? { id: examId } : {}),
  institutionId,
});

const ticketScope = (institutionId: string) => ({ examSlot: { exam: { institutionId } } });

// ═══ Small shared helpers ═════════════════════════════════════════════════

/**
 * Dates are formatted from LOCAL parts on purpose. `toISOString().slice(0,10)`
 * would render every paper one day early in Asia/Calcutta (UTC+5:30) — the same
 * off-by-one the timetable's `parseExamDate` exists to prevent, and a hall
 * ticket printed with the wrong date is a student who does not turn up.
 */
const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const minutesOf = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const durationMinutes = (start: string, end: string): number =>
  Math.max(0, minutesOf(end) - minutesOf(start));

const formatDuration = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
};

async function requireExam(institutionId: string, examId: string) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, institutionId } });
  if (!exam) throw notFound('Exam not found');
  return exam;
}

// ═══ The cohort ═══════════════════════════════════════════════════════════
//
// One builder, two blocks. Eligibility and generation must not be computed by
// two functions, because the screen that says "12 clear, 3 warned" and the
// screen that issues 15 tickets have to be describing the same 15 students.
//
// The cohort is everyone with an enrolment in an offering running THIS
// semester of THIS academic year — the same "eligible" definition the
// timetable's allocation block uses, so the two features cannot disagree about
// who is meant to sit the exam.

type CohortRow = {
  studentProfileId: string;
  name: string;
  email: string;
  rollNo: string;
  profileStatus: string;
  avatarFileId: string | null;
  hasPhoto: boolean;
  /** Active enrolments in this exam's cohort. */
  papers: number;
  /** …of those, how many have a slot in this exam. */
  scheduled: number;
  /** Enrolments that exist but are not ACTIVE. */
  dropped: number;
  /** Tickets already issued to them in this exam. */
  tickets: number;
  reasons: string[];
  eligible: boolean;
};

async function cohortFor(institutionId: string, examId: string) {
  const exam = await requireExam(institutionId, examId);

  const offerings = await prisma.courseOffering.findMany({
    where: {
      ...offeringWhere(institutionId),
      semester: exam.semester,
      academicYearId: exam.academicYearId,
    },
    include: {
      course: { select: { code: true, name: true } },
      enrollments: {
        include: {
          studentProfile: {
            include: {
              user: { select: { fullName: true, email: true, avatarFileId: true } },
            },
          },
        },
      },
    },
  });

  const slots = await prisma.examSlot.findMany({
    where: { examId: exam.id },
    select: {
      id: true,
      offeringId: true,
      hallTickets: { select: { studentProfileId: true } },
    },
  });

  const scheduledOfferings = new Set(slots.map((s) => s.offeringId));
  const ticketedBy = new Map<string, number>();
  for (const s of slots) {
    for (const t of s.hallTickets) {
      ticketedBy.set(t.studentProfileId, (ticketedBy.get(t.studentProfileId) ?? 0) + 1);
    }
  }

  // Fee warnings are scoped to this institution through the profile. FeeDue
  // has no institutionId of its own.
  const owingRows = await prisma.feeDue.findMany({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, studentProfile: { institutionId } },
    select: { studentProfileId: true },
  });
  const owing = new Set(owingRows.map((f) => f.studentProfileId));

  const rows = new Map<string, CohortRow>();
  for (const o of offerings) {
    for (const e of o.enrollments) {
      const sp = e.studentProfile;
      let row = rows.get(sp.id);
      if (!row) {
        const reasons: string[] = [];
        if (sp.status !== 'ACTIVE') reasons.push('PROFILE_NOT_ACTIVE');
        if (owing.has(sp.id)) reasons.push('FEES_OUTSTANDING');
        if (!sp.user.avatarFileId) reasons.push('NO_PHOTO');
        const tickets = ticketedBy.get(sp.id) ?? 0;
        if (tickets > 0) reasons.push('TICKET_ALREADY_ISSUED');
        row = {
          studentProfileId: sp.id,
          name: sp.user.fullName,
          email: sp.user.email,
          rollNo: sp.rollNo,
          profileStatus: sp.status,
          avatarFileId: sp.user.avatarFileId,
          hasPhoto: !!sp.user.avatarFileId,
          papers: 0,
          scheduled: 0,
          dropped: 0,
          tickets,
          reasons,
          eligible: false,
        };
        rows.set(sp.id, row);
      }
      if (e.status === 'ACTIVE') {
        row.papers += 1;
        if (scheduledOfferings.has(o.id)) row.scheduled += 1;
      } else {
        row.dropped += 1;
      }
    }
  }

  for (const row of rows.values()) {
    if (row.dropped > 0 && !row.reasons.includes('ENROLLMENT_DROPPED')) {
      row.reasons.push('ENROLLMENT_DROPPED');
    }
    // Enrolled in this cohort but nothing in this exam has a slot for them, so
    // a bulk run will never reach them. Reported, not raised — adding the slot
    // is the fix, and it is not this screen's job to refuse.
    if (row.papers > 0 && row.scheduled === 0 && !row.reasons.includes('NO_SCHEDULED_PAPER')) {
      row.reasons.push('NO_SCHEDULED_PAPER');
    }
    row.eligible = row.reasons.length === 0;
  }

  const list = [...rows.values()].sort((a, b) => a.rollNo.localeCompare(b.rollNo));
  const byReason: Record<string, number> = {};
  for (const id of ELIGIBILITY_REASONS.map((r) => r.id)) byReason[id] = 0;
  for (const row of list) for (const r of row.reasons) byReason[r] = (byReason[r] ?? 0) + 1;

  const totals = {
    students: list.length,
    clear: list.filter((r) => r.eligible).length,
    warned: list.filter((r) => !r.eligible).length,
    scheduled: list.filter((r) => r.scheduled > 0).length,
    issued: list.filter((r) => r.tickets > 0).length,
    byReason,
  };

  return { exam, rows: list, totals };
}

const withReasonDetails = (row: CohortRow) => ({
  ...row,
  reasonDetails: row.reasons.map((id) => eligibilityReasonMeta(id)).filter(Boolean),
});

// ═══ Blocks ═══════════════════════════════════════════════════════════════

/**
 * Requirement 1 — student eligibility verification.
 *
 * Every warning is returned WITH the policy that says it does not block, so the
 * screen cannot render a red row without the sentence explaining that red does
 * not mean "refused".
 */
async function eligibilityBlock(institutionId: string, examId: string) {
  const { exam, rows, totals } = await cohortFor(institutionId, examId);
  return {
    exam: { id: exam.id, name: exam.name, type: exam.type, semester: exam.semester, status: exam.status },
    policy: THRESHOLDS.eligibilityPolicy,
    reasons: ELIGIBILITY_REASONS,
    totals,
    students: rows.map(withReasonDetails),
  };
}

/**
 * Requirement 2 + 7 — generation (single and bulk), as a preview of what a run
 * would do. `wouldIssue` counts exactly the students `generateBulk` would create
 * a ticket for; if those two numbers ever differ the screen is lying.
 */
async function generationBlock(institutionId: string, examId: string) {
  const { exam, rows, totals } = await cohortFor(institutionId, examId);

  // Counted with THE SAME PREDICATE `generateBulk` uses — per slot, over active
  // enrolments, skipping students who already hold a ticket on that slot. Not
  // derived from the cohort, because a student with two papers and one ticket
  // still has a second ticket to issue, and a per-student count would call
  // that "nothing to do".
  const slots = await prisma.examSlot.findMany({
    where: { examId: exam.id },
    include: {
      offering: {
        include: {
          course: { select: { code: true, name: true } },
          enrollments: { where: { status: 'ACTIVE' }, select: { studentProfileId: true } },
        },
      },
      hallTickets: { select: { studentProfileId: true } },
    },
  });
  const wouldIssueByStudent = new Set<string>();
  const pendingByStudent = new Map<
    string,
    Array<{ slotId: string; courseCode: string; courseName: string; date: string; startTime: string; endTime: string }>
  >();
  let wouldIssueTickets = 0;
  for (const slot of slots) {
    const already = new Set(slot.hallTickets.map((t) => t.studentProfileId));
    for (const e of slot.offering.enrollments) {
      if (already.has(e.studentProfileId)) continue;
      wouldIssueTickets += 1;
      wouldIssueByStudent.add(e.studentProfileId);
      // Which paper is still missing, so the screen can offer a SINGLE issue
      // for it. Without this the only reachable action is the whole-exam batch.
      const list = pendingByStudent.get(e.studentProfileId) ?? [];
      list.push({
        slotId: slot.id,
        courseCode: slot.offering.course.code,
        courseName: slot.offering.course.name,
        date: dateKey(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      pendingByStudent.set(e.studentProfileId, list);
    }
  }

  const alreadyIssued = rows.filter((r) => r.tickets > 0).length;
  // Same condition as the NO_SCHEDULED_PAPER reason: enrolled IN THIS EXAM but
  // with no slot for them. Without `papers > 0` this also counts students whose
  // only enrolment was dropped, who are already reported as ENROLLMENT_DROPPED
  // and would be counted twice.
  const noScheduledPaper = rows.filter((r) => r.papers > 0 && r.scheduled === 0).length;

  return {
    exam: { id: exam.id, name: exam.name, type: exam.type, semester: exam.semester, status: exam.status },
    policy: THRESHOLDS.eligibilityPolicy,
    totals: {
      ...totals,
      wouldIssue: wouldIssueByStudent.size,
      wouldIssueTickets,
      alreadyIssued,
      noScheduledPaper,
      slots: slots.length,
    },
    // Trimmed: this screen needs the decision, not the reason catalogue.
    students: rows.map((r) => ({
      studentProfileId: r.studentProfileId,
      name: r.name,
      rollNo: r.rollNo,
      papers: r.papers,
      scheduled: r.scheduled,
      tickets: r.tickets,
      wouldIssue: wouldIssueByStudent.has(r.studentProfileId),
      pendingSlots: pendingByStudent.get(r.studentProfileId) ?? [],
      warned: r.reasons.length > 0,
      reasons: r.reasons,
    })),
  };
}

/**
 * Requirements 3 + 6 — the tickets themselves: photo and details, subject,
 * schedule, centre, and everything a printout needs.
 *
 * Returned twice on purpose: `tickets` flat for the table, `students` grouped
 * for printing, because a student with three papers gets ONE sheet with three
 * lines on it, not three sheets.
 */
async function ticketsBlock(institutionId: string, examId: string) {
  const exam = await requireExam(institutionId, examId);

  const tickets = await prisma.hallTicket.findMany({
    where: { examSlot: { examId: exam.id, exam: { institutionId } } },
    include: {
      studentProfile: {
        include: { user: { select: { fullName: true, email: true, avatarFileId: true } } },
      },
      examSlot: {
        include: {
          offering: { include: { course: { select: { code: true, name: true } }, section: true } },
          roomAllocations: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const roomIds = [...new Set(tickets.flatMap((t) => t.examSlot.roomAllocations.map((a) => a.roomId)))];
  const venues = roomIds.length
    ? await prisma.venue.findMany({
        where: { id: { in: roomIds }, institutionId },
        select: { id: true, name: true, capacity: true, location: true },
      })
    : [];
  const venueById = new Map(venues.map((v) => [v.id, v]));

  const flat = tickets.map((t) => {
    const room = t.examSlot.roomAllocations[0]?.roomId ?? null;
    const venue = room ? venueById.get(room) : undefined;
    const start = t.examSlot.startTime;
    const end = t.examSlot.endTime;
    return {
      id: t.id,
      studentProfileId: t.studentProfileId,
      studentName: t.studentProfile.user.fullName,
      email: t.studentProfile.user.email,
      rollNo: t.studentProfile.rollNo,
      avatarFileId: t.studentProfile.user.avatarFileId,
      hasPhoto: !!t.studentProfile.user.avatarFileId,
      seatNo: t.seatNo,
      status: t.status,
      generatedAt: t.generatedAt,
      qrPayload: t.qrPayload,
      slotId: t.examSlotId,
      courseCode: t.examSlot.offering.course.code,
      courseName: t.examSlot.offering.course.name,
      section: t.examSlot.offering.section.name,
      date: dateKey(t.examSlot.date),
      startTime: start,
      endTime: end,
      durationMinutes: durationMinutes(start, end),
      roomId: room,
      centre: venue?.name ?? null,
      centreLocation: venue?.location ?? null,
      capacity: venue?.capacity ?? null,
      /** The row references a room that is not a venue of this institution. */
      centreMissing: !!room && !venue,
    };
  });

  /** One printed sheet: the student, and every paper on it. */
  type StudentGroup = {
    studentProfileId: string;
    name: string;
    rollNo: string;
    email: string;
    avatarFileId: string | null;
    hasPhoto: boolean;
    papers: typeof flat;
  };

  const grouped = new Map<string, StudentGroup>();
  for (const t of flat) {
    let g = grouped.get(t.studentProfileId);
    if (!g) {
      g = {
        studentProfileId: t.studentProfileId,
        name: t.studentName,
        rollNo: t.rollNo,
        email: t.email,
        avatarFileId: t.avatarFileId,
        hasPhoto: t.hasPhoto,
        papers: [],
      };
      grouped.set(t.studentProfileId, g);
    }
    g.papers.push(t);
  }
  const students = [...grouped.values()].sort((a, b) => a.rollNo.localeCompare(b.rollNo));
  for (const s of students) s.papers.sort((a, b) => a.date.localeCompare(b.date));

  const statusCounts: Record<string, number> = {};
  for (const s of TICKET_STATUSES) statusCounts[s] = 0;
  for (const t of flat) statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;

  return {
    exam: { id: exam.id, name: exam.name, type: exam.type, semester: exam.semester, status: exam.status },
    ticketStatuses: TICKET_STATUSES.map((id) => ({ id, ...TICKET_STATUS_META[id] })),
    stats: {
      total: flat.length,
      students: students.length,
      generated: statusCounts.GENERATED ?? 0,
      downloaded: statusCounts.DOWNLOADED ?? 0,
      missingCentre: flat.filter((t) => t.centreMissing).length,
      noPhoto: students.filter((s) => !s.hasPhoto).length,
    },
    tickets: flat,
    students,
  };
}

/**
 * Requirement 4 — exam subjects and schedule.
 *
 * Institution-wide when no examId is given, so the screen works before the
 * controller has picked anything.
 */
async function scheduleBlock(institutionId: string, examId?: string) {
  const exams = await prisma.exam.findMany({
    where: examWhere(institutionId, examId),
    orderBy: [{ semester: 'asc' }, { createdAt: 'desc' }],
    include: {
      examSlots: {
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        include: {
          offering: {
            include: {
              course: { select: { code: true, name: true } },
              section: true,
              enrollments: { where: { status: 'ACTIVE' }, select: { id: true } },
            },
          },
          hallTickets: { select: { id: true } },
          roomAllocations: { select: { roomId: true } },
        },
      },
    },
  });

  const roomIds = [...new Set(exams.flatMap((e) => e.examSlots.flatMap((s) => s.roomAllocations.map((a) => a.roomId))))];
  const venues = roomIds.length
    ? await prisma.venue.findMany({ where: { id: { in: roomIds }, institutionId }, select: { id: true, name: true } })
    : [];
  const venueById = new Map(venues.map((v) => [v.id, v]));

  return {
    exams: exams.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      semester: e.semester,
      status: e.status,
      hallTicketStatus: e.hallTicketStatus,
      papers: e.examSlots.map((s) => {
        const roomId = s.roomAllocations[0]?.roomId ?? null;
        const start = s.startTime;
        const end = s.endTime;
        return {
          slotId: s.id,
          courseCode: s.offering.course.code,
          courseName: s.offering.course.name,
          section: s.offering.section.name,
          date: dateKey(s.date),
          startTime: start,
          endTime: end,
          durationMinutes: durationMinutes(start, end),
          durationLabel: formatDuration(durationMinutes(start, end)),
          enrolled: s.offering.enrollments.length,
          issued: s.hallTickets.length,
          centre: roomId ? (venueById.get(roomId)?.name ?? null) : null,
        };
      }),
      totals: {
        papers: e.examSlots.length,
        enrolled: e.examSlots.reduce((t, s) => t + s.offering.enrollments.length, 0),
        issued: e.examSlots.reduce((t, s) => t + s.hallTickets.length, 0),
      },
    })),
  };
}

/**
 * Requirement 5 — examination-centre information.
 *
 * `ExamRoomAllocation.roomId` is a SCALAR with no FK (the venue master is
 * Domain I), and the seed writes rows like `ROOM-L201` that name no venue at
 * all. So an unknown centre is reported as unknown rather than dropped: a paper
 * whose centre cannot be resolved is exactly what a controller needs to see.
 */
async function venueBlock(institutionId: string, examId?: string) {
  const slots = await prisma.examSlot.findMany({
    where: { exam: examWhere(institutionId, examId) },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: {
      exam: { select: { id: true, name: true } },
      offering: {
        include: {
          course: { select: { code: true, name: true } },
          enrollments: { where: { status: 'ACTIVE' }, select: { id: true } },
        },
      },
      roomAllocations: true,
      hallTickets: { select: { id: true } },
    },
  });

  const roomIds = [...new Set(slots.flatMap((s) => s.roomAllocations.map((a) => a.roomId)))];
  const invigilatorIds = [
    ...new Set(slots.flatMap((s) => s.roomAllocations.map((a) => a.invigilatorUserId).filter(Boolean))),
  ] as string[];

  const [venues, invigilators] = await Promise.all([
    roomIds.length
      ? prisma.venue.findMany({
          where: { id: { in: roomIds }, institutionId },
          select: { id: true, name: true, location: true, capacity: true, status: true },
        })
      : Promise.resolve([]),
    invigilatorIds.length
      ? prisma.user.findMany({
          where: { id: { in: invigilatorIds }, institutionId },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
  ]);
  const venueById = new Map(venues.map((v) => [v.id, v]));
  const invigilatorById = new Map(invigilators.map((u) => [u.id, u.fullName]));

  type Paper = {
    slotId: string;
    examId: string;
    examName: string;
    courseCode: string;
    courseName: string;
    date: string;
    startTime: string;
    endTime: string;
    enrolled: number;
    issued: number;
    invigilators: string[];
  };

  const centres = new Map<string, { venueId: string; name: string; location: string | null; capacity: number | null; status: string | null; known: boolean; papers: Paper[] }>();
  const unseated: Paper[] = [];
  const unknownRooms: Paper[] = [];

  for (const s of slots) {
    const roomId = s.roomAllocations[0]?.roomId ?? null;
    const start = s.startTime;
    const end = s.endTime;
    const paper: Paper = {
      slotId: s.id,
      examId: s.exam.id,
      examName: s.exam.name,
      courseCode: s.offering.course.code,
      courseName: s.offering.course.name,
      date: dateKey(s.date),
      startTime: start,
      endTime: end,
      enrolled: s.offering.enrollments.length,
      issued: s.hallTickets.length,
      invigilators: s.roomAllocations
        .map((a) => (a.invigilatorUserId ? (invigilatorById.get(a.invigilatorUserId) ?? null) : null))
        .filter(Boolean) as string[],
    };

    if (!roomId) {
      unseated.push(paper);
      continue;
    }
    const venue = venueById.get(roomId);
    if (!venue) {
      unknownRooms.push({ ...paper });
      continue;
    }
    let c = centres.get(roomId);
    if (!c) {
      c = {
        venueId: venue.id,
        name: venue.name,
        location: venue.location,
        capacity: venue.capacity,
        status: venue.status,
        known: true,
        papers: [],
      };
      centres.set(roomId, c);
    }
    c.papers.push(paper);
  }

  const list = [...centres.values()].map((c) => ({
    ...c,
    paperCount: c.papers.length,
    seated: c.papers.reduce((t, p) => t + p.issued, 0),
    enrolled: c.papers.reduce((t, p) => t + p.enrolled, 0),
    /** Seats left in the venue after everyone with a ticket is counted. */
    headroom: c.capacity === null ? null : c.capacity - c.papers.reduce((t, p) => t + p.issued, 0),
  }));

  return {
    centres: list.sort((a, b) => a.name.localeCompare(b.name)),
    unseated,
    unknownRooms,
    totals: {
      centres: list.length,
      papers: slots.length,
      unseated: unseated.length,
      unknownRooms: unknownRooms.length,
      capacity: list.reduce((t, c) => t + (c.capacity ?? 0), 0),
      issued: slots.reduce((t, s) => t + s.hallTickets.length, 0),
    },
  };
}

/** Requirements 8 + 9 — correction requests and reissue management. */
async function requestsBlock(institutionId: string, examId?: string) {
  const requests = await prisma.hallTicketRequest.findMany({
    where: {
      hallTicket: { examSlot: { exam: examWhere(institutionId, examId) } },
    },
    include: {
      hallTicket: {
        include: {
          studentProfile: { include: { user: { select: { fullName: true, avatarFileId: true } } } },
          examSlot: {
            include: {
              exam: { select: { id: true, name: true } },
              offering: { include: { course: { select: { code: true, name: true } } } },
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const deciderIds = [...new Set(requests.map((r) => r.decidedByUserId).filter(Boolean))] as string[];
  const deciders = deciderIds.length
    ? await prisma.user.findMany({ where: { id: { in: deciderIds } }, select: { id: true, fullName: true } })
    : [];
  const deciderById = new Map(deciders.map((u) => [u.id, u.fullName]));

  const totals: Record<string, number> = {};
  for (const s of REQUEST_STATUSES) totals[s] = 0;
  for (const r of requests) totals[r.status] = (totals[r.status] ?? 0) + 1;

  return {
    open: (totals.REQUESTED ?? 0) + (totals.APPROVED ?? 0),
    totals,
    requests: requests.map((r) => ({
      id: r.id,
      kind: r.kind,
      field: r.field,
      requestedValue: r.requestedValue,
      reason: r.reason,
      status: r.status,
      note: r.note,
      decidedBy: r.decidedByUserId ? (deciderById.get(r.decidedByUserId) ?? null) : null,
      decidedAt: r.decidedAt,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
      hallTicketId: r.hallTicketId,
      seatNo: r.hallTicket.seatNo,
      studentProfileId: r.hallTicket.studentProfileId,
      studentName: r.hallTicket.studentProfile.user.fullName,
      rollNo: r.hallTicket.studentProfile.rollNo,
      examId: r.hallTicket.examSlot.exam.id,
      examName: r.hallTicket.examSlot.exam.name,
      courseCode: r.hallTicket.examSlot.offering.course.code,
      courseName: r.hallTicket.examSlot.offering.course.name,
      date: dateKey(r.hallTicket.examSlot.date),
      currentSeatNo: r.hallTicket.seatNo,
      currentName: r.hallTicket.studentProfile.user.fullName,
      currentRollNo: r.hallTicket.studentProfile.rollNo,
    })),
  };
}

/**
 * Requirement 10 — hall-ticket publication status.
 *
 * Counts every exam in the institution (or one), because the question this
 * screen answers is "which of these can students actually see?".
 */
async function publicationBlock(institutionId: string, examId?: string) {
  const exams = await prisma.exam.findMany({
    where: examWhere(institutionId, examId),
    orderBy: [{ createdAt: 'desc' }],
    include: {
      examSlots: { include: { hallTickets: { select: { status: true } } } },
    },
  });

  const requestCounts = await prisma.hallTicketRequest.groupBy({
    by: ['status'],
    where: { hallTicket: { examSlot: { exam: examWhere(institutionId, examId) } } },
    _count: { _all: true },
  });
  const openRequests = requestCounts
    .filter((c) => c.status === 'REQUESTED' || c.status === 'APPROVED')
    .reduce((t, c) => t + c._count._all, 0);

  const rows = exams.map((e) => {
    const tickets = e.examSlots.flatMap((s) => s.hallTickets);
    return {
      id: e.id,
      name: e.name,
      type: e.type,
      semester: e.semester,
      examStatus: e.status,
      hallTicketStatus: e.hallTicketStatus,
      publishedAt: e.hallTicketPublishedAt,
      publishedByUserId: e.hallTicketPublishedByUserId,
      slots: e.examSlots.length,
      tickets: tickets.length,
      generated: tickets.filter((t) => t.status === 'GENERATED').length,
      downloaded: tickets.filter((t) => t.status === 'DOWNLOADED').length,
      /** Publishing an exam with nothing to publish is refused, so show it here first. */
      publishable: tickets.length > 0,
    };
  });

  const byStatus: Record<string, number> = {};
  for (const s of PUBLICATION_STATUSES) byStatus[s] = 0;
  for (const r of rows) byStatus[r.hallTicketStatus] = (byStatus[r.hallTicketStatus] ?? 0) + 1;

  return {
    policy: THRESHOLDS.publishPolicy,
    statuses: PUBLICATION_STATUSES,
    openRequests,
    totals: {
      exams: rows.length,
      ...byStatus,
      tickets: rows.reduce((t, r) => t + r.tickets, 0),
      publishable: rows.filter((r) => r.publishable).length,
    },
    exams: rows,
  };
}

// ═══ Catalogue and overview ═══════════════════════════════════════════════

/**
 * Everything the app renders from, in one round trip — the same reason the
 * timetable and dashboard hubs publish theirs: a status list hard-coded in the
 * app is a list that goes stale, and then the screen colours a status the
 * server no longer recognises.
 *
 * `exams` rides along so the exam picker needs no second request. The old
 * hall-ticket screen called `examcellApi.exams()`, a method that never existed
 * on that API object (it lives on the STUDENT api), so its picker threw and the
 * screen never loaded anything.
 */
export async function hallTicketCatalogue(institutionId: string) {
  const exams = await prisma.exam.findMany({
    where: { institutionId },
    orderBy: [{ semester: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { examSlots: true } },
      examSlots: { include: { hallTickets: { select: { id: true } } } },
    },
  });

  return {
    blocks: BLOCKS,
    requestKinds: REQUEST_KINDS.map((id) => ({ id })),
    requestStatuses: REQUEST_STATUSES,
    correctableFields: CORRECTABLE_FIELDS,
    ticketStatuses: TICKET_STATUSES,
    publicationStatuses: PUBLICATION_STATUSES,
    eligibilityReasons: ELIGIBILITY_REASONS,
    thresholds: THRESHOLDS,
    exams: exams.map((e) => {
      const tickets = e.examSlots.reduce((t, s) => t + s.hallTickets.length, 0);
      return {
        id: e.id,
        name: e.name,
        type: e.type,
        semester: e.semester,
        status: e.status,
        hallTicketStatus: e.hallTicketStatus,
        slots: e._count.examSlots,
        tickets,
        publishable: tickets > 0,
      };
    }),
  };
}

export async function hallTicketOverview(institutionId: string) {
  const [exams, tickets, requests, published] = await Promise.all([
    prisma.exam.count({ where: { institutionId } }),
    prisma.hallTicket.count({ where: ticketScope(institutionId) }),
    prisma.hallTicketRequest.count({ where: { hallTicket: { examSlot: { exam: { institutionId } } } } }),
    prisma.exam.count({ where: { institutionId, hallTicketStatus: 'PUBLISHED' } }),
  ]);

  const downloaded = await prisma.hallTicket.count({
    where: { ...ticketScope(institutionId), status: 'DOWNLOADED' },
  });
  const openRequests = await prisma.hallTicketRequest.count({
    where: {
      status: { in: ['REQUESTED', 'APPROVED'] },
      hallTicket: { examSlot: { exam: { institutionId } } },
    },
  });

  return {
    stats: { exams, tickets, downloaded, published, requests, openRequests },
    policy: THRESHOLDS,
  };
}

/**
 * Dispatch. `requiresExam` is enforced HERE rather than in the route, so a
 * caller cannot reach a block through some other entry point and get a
 * `undefined` examId instead of a 422 that names what was missing.
 */
export async function hallTicketBlock(block: string, institutionId: string, examId?: string) {
  const id = assertBlock(block);
  const meta = BLOCKS.find((b) => b.id === id);
  if (meta?.requiresExam && !examId) {
    throw unprocessable(`Block "${id}" needs an examId`, { block: id, required: 'examId' });
  }

  switch (id) {
    case 'ELIGIBILITY':
      return eligibilityBlock(institutionId, examId as string);
    case 'GENERATION':
      return generationBlock(institutionId, examId as string);
    case 'TICKETS':
      return ticketsBlock(institutionId, examId as string);
    case 'SCHEDULE':
      return scheduleBlock(institutionId, examId);
    case 'VENUE':
      return venueBlock(institutionId, examId);
    case 'REQUESTS':
      return requestsBlock(institutionId, examId);
    case 'PUBLICATION':
      return publicationBlock(institutionId, examId);
    default:
      throw unprocessable(`Unknown block "${block}"`, { allowed: BLOCKS.map((b) => b.id) });
  }
}

// ═══ Mutations ════════════════════════════════════════════════════════════

/**
 * Requirement 7 — bulk generation.
 *
 * Issues for every ACTIVE enrolment with a slot, skipping what already exists.
 * The warnings are computed and RETURNED, never enforced: a student with an
 * unpaid fee or no photograph still gets a ticket, and the controller is told.
 *
 * Seats are handed out per slot from `nextSeatNo(taken)`, where `taken` grows
 * as this loop writes, so two students in one run can never share a seat — the
 * unique constraint on (examSlotId, seatNo) would otherwise make the run fail
 * halfway with a 500.
 */
export async function generateBulk(institutionId: string, actorUserId: string, examId: string) {
  const exam = await requireExam(institutionId, examId);

  const slots = await prisma.examSlot.findMany({
    where: { examId: exam.id },
    include: {
      offering: {
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            include: { studentProfile: { select: { rollNo: true } } },
          },
        },
      },
      hallTickets: { select: { id: true, studentProfileId: true, seatNo: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  let issued = 0;
  let skipped = 0;
  const created: Array<{ slotId: string; studentProfileId: string; seatNo: string }> = [];

  for (const slot of slots) {
    const taken = slot.hallTickets.map((t) => t.seatNo);
    const already = new Set(slot.hallTickets.map((t) => t.studentProfileId));
    for (const e of slot.offering.enrollments) {
      if (already.has(e.studentProfileId)) {
        skipped += 1;
        continue;
      }
      const seatNo = nextSeatNo(taken);
      taken.push(seatNo);
      already.add(e.studentProfileId);
      await prisma.hallTicket.create({
        data: {
          examSlotId: slot.id,
          studentProfileId: e.studentProfileId,
          seatNo,
          qrPayload: qrPayloadFor(slot.id, e.studentProfile.rollNo, seatNo),
          status: 'GENERATED',
        },
      });
      created.push({ slotId: slot.id, studentProfileId: e.studentProfileId, seatNo });
      issued += 1;
    }
  }

  const { totals } = await cohortFor(institutionId, exam.id);

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'HALL_TICKETS_GENERATED',
    entityType: 'HallTicket',
    entityId: exam.id,
    after: { issued, skipped, warned: totals.warned },
  });

  return {
    examId: exam.id,
    issued,
    skipped,
    slots: slots.length,
    warnings: totals.warned,
    byReason: totals.byReason,
    policy: THRESHOLDS.eligibilityPolicy,
    created,
  };
}

/**
 * Requirement 2 — one ticket, for one student, in one paper.
 *
 * The two refusals are deliberately NOT eligibility: an exam/slot that is not
 * this institution's is a 404 (its existence is not this caller's business), a
 * missing ACTIVE enrolment is 422 because there is nothing to attach a ticket
 * to, and a duplicate is 409 because the seat has already been handed out.
 */
export async function generateOne(
  institutionId: string,
  actorUserId: string,
  slotId: string,
  studentProfileId: string,
) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: { institutionId } },
    include: {
      exam: { select: { id: true, name: true } },
      offering: {
        include: {
          enrollments: {
            where: { studentProfileId, status: 'ACTIVE' },
            include: { studentProfile: { select: { rollNo: true } } },
          },
        },
      },
      hallTickets: { select: { id: true, studentProfileId: true, seatNo: true } },
    },
  });
  if (!slot) throw notFound('Exam slot not found');

  if (slot.offering.enrollments.length === 0) {
    throw unprocessable('That student has no active enrolment in this paper', {
      reason: 'NO_ACTIVE_ENROLLMENT',
      note: 'Warnings never block generation, but there must be an active enrolment to attach a ticket to.',
      policy: THRESHOLDS.eligibilityPolicy,
    });
  }

  const existing = slot.hallTickets.find((t) => t.studentProfileId === studentProfileId);
  if (existing) {
    throw conflict(
      `A hall ticket has already been issued for this student in this paper (seat ${existing.seatNo})`,
    );
  }

  const seatNo = nextSeatNo(slot.hallTickets.map((t) => t.seatNo));
  const rollNo = slot.offering.enrollments[0]!.studentProfile.rollNo;
  const ticket = await prisma.hallTicket.create({
    data: {
      examSlotId: slot.id,
      studentProfileId,
      seatNo,
      qrPayload: qrPayloadFor(slot.id, rollNo, seatNo),
      status: 'GENERATED',
    },
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'HALL_TICKET_ISSUED',
    entityType: 'HallTicket',
    entityId: ticket.id,
    after: { seatNo, examId: slot.exam.id },
  });

  return { ...ticket, examId: slot.exam.id };
}

/**
 * Requirement 6 — download/print. Marking DOWNLOADED is idempotent: printing
 * twice is normal, and turning the second print into an error would be a
 * screen that punishes the user for using it.
 */
export async function markDownloaded(institutionId: string, actorUserId: string, ticketId: string) {
  const ticket = await prisma.hallTicket.findFirst({
    where: { id: ticketId, ...ticketScope(institutionId) },
  });
  if (!ticket) throw notFound('Hall ticket not found');

  if (ticket.status === 'DOWNLOADED') return { ...ticket, alreadyDownloaded: true };

  const updated = await prisma.hallTicket.update({
    where: { id: ticketId },
    data: { status: 'DOWNLOADED' },
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'HALL_TICKET_DOWNLOADED',
    entityType: 'HallTicket',
    entityId: ticketId,
    before: { status: ticket.status },
    after: { status: 'DOWNLOADED' },
  });

  return { ...updated, alreadyDownloaded: false };
}

/**
 * Requirements 8 + 9 — raise a correction or a reissue.
 *
 * `field` is required for a correction and forbidden for a reissue, because a
 * reissue that "corrects" a field would leave the reader unsure which of the
 * two happened.
 */
export async function createRequest(
  institutionId: string,
  actorUserId: string,
  body: {
    hallTicketId: string;
    kind: string;
    field?: string | null;
    requestedValue?: string | null;
    reason: string;
  },
) {
  const kind = assertRequestKind(body.kind);

  const ticket = await prisma.hallTicket.findFirst({
    where: { id: body.hallTicketId, ...ticketScope(institutionId) },
    select: { id: true, studentProfileId: true, seatNo: true },
  });
  if (!ticket) throw notFound('Hall ticket not found');

  let field: string | null = null;
  let requestedValue: string | null = null;

  if (kind === 'CORRECTION') {
    if (!body.field) {
      throw unprocessable('A correction must say which field is wrong', {
        required: 'field',
        allowed: CORRECTABLE_FIELDS,
      });
    }
    field = assertCorrectableField(body.field);
    if (!body.requestedValue || !String(body.requestedValue).trim()) {
      throw unprocessable('A correction must say what it should say instead', {
        required: 'requestedValue',
        field,
      });
    }
    requestedValue = String(body.requestedValue).trim();
  } else {
    if (body.field) {
      throw unprocessable('A reissue does not correct a field', {
        received: body.field,
        hint: 'Use kind=CORRECTION if a printed detail is wrong.',
      });
    }
  }

  const open = await prisma.hallTicketRequest.findFirst({
    where: { hallTicketId: ticket.id, kind, status: { in: ['REQUESTED', 'APPROVED'] } },
  });
  if (open) {
    throw conflict(`This ticket already has an open ${kind.toLowerCase()} request`);
  }

  const created = await prisma.hallTicketRequest.create({
    data: {
      hallTicketId: ticket.id,
      studentProfileId: ticket.studentProfileId,
      kind,
      field,
      requestedValue,
      reason: body.reason,
      status: 'REQUESTED',
    },
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'HALL_TICKET_REQUESTED',
    entityType: 'HallTicketRequest',
    entityId: created.id,
    after: { kind, field, seatNo: ticket.seatNo },
  });

  return created;
}

/**
 * Decide a request. Only REQUESTED may be decided, and completing is a
 * SEPARATE call — an approver should not change a student's record by accident
 * in the same breath as saying "yes, that looks right".
 */
export async function decideRequest(
  institutionId: string,
  actorUserId: string,
  requestId: string,
  body: { decision: string; note?: string | null },
) {
  const decision = assertDecision(body.decision);

  const existing = await prisma.hallTicketRequest.findFirst({
    where: { id: requestId, hallTicket: { examSlot: { exam: { institutionId } } } },
  });
  if (!existing) throw notFound('Request not found');

  if (existing.status !== 'REQUESTED') {
    throw unprocessable(`A request that is already ${existing.status.toLowerCase()} cannot be decided`, {
      status: existing.status,
      allowed: ['REQUESTED'],
    });
  }

  const updated = await prisma.hallTicketRequest.update({
    where: { id: requestId },
    data: {
      status: decision,
      decidedByUserId: actorUserId,
      decidedAt: new Date(),
      note: body.note ?? null,
    },
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'HALL_TICKET_REQUEST_DECIDED',
    entityType: 'HallTicketRequest',
    entityId: requestId,
    before: { status: existing.status },
    after: { status: decision, note: body.note ?? null },
  });

  return updated;
}

/**
 * Apply an approved request — the step that actually changes data.
 *
 * A CORRECTION rewrites the one field it named; a REISSUE takes the next free
 * seat and regenerates the QR. The QR is regenerated after a roll-number change
 * too, because the payload CONTAINS the roll number: leaving it stale would
 * hand a student a ticket that scans as their old identity.
 */
export async function completeRequest(institutionId: string, actorUserId: string, requestId: string) {
  const request = await prisma.hallTicketRequest.findFirst({
    where: { id: requestId, hallTicket: { examSlot: { exam: { institutionId } } } },
    include: {
      hallTicket: {
        include: {
          studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
          examSlot: { include: { hallTickets: { select: { id: true, seatNo: true } } } },
        },
      },
    },
  });
  if (!request) throw notFound('Request not found');

  if (request.status !== 'APPROVED') {
    throw unprocessable(`Only an approved request can be completed, this one is ${request.status.toLowerCase()}`, {
      status: request.status,
      allowed: ['APPROVED'],
      note: 'Decide it first — approval and effect are separate steps.',
    });
  }

  const ticket = request.hallTicket;
  const slot = ticket.examSlot;
  const otherSeats = slot.hallTickets.filter((t) => t.id !== ticket.id).map((t) => t.seatNo);
  const before = {
    seatNo: ticket.seatNo,
    rollNo: ticket.studentProfile.rollNo,
    fullName: ticket.studentProfile.user.fullName,
  };

  if (request.kind === 'REISSUE') {
    const seatNo = nextSeatNo(otherSeats);
    await prisma.hallTicket.update({
      where: { id: ticket.id },
      data: {
        seatNo,
        qrPayload: qrPayloadFor(slot.id, ticket.studentProfile.rollNo, seatNo),
        status: 'GENERATED',
        generatedAt: new Date(),
      },
    });
  } else {
    const field = request.field as string;
    const value = (request.requestedValue ?? '').trim();

    if (field === 'seatNo') {
      if (otherSeats.includes(value)) {
        throw conflict(`Seat ${value} is already taken in this paper`);
      }
      await prisma.hallTicket.update({
        where: { id: ticket.id },
        data: { seatNo: value, qrPayload: qrPayloadFor(slot.id, ticket.studentProfile.rollNo, value) },
      });
    } else if (field === 'rollNo') {
      await prisma.studentProfile.update({ where: { id: ticket.studentProfileId }, data: { rollNo: value } });
      // The QR payload carries the roll number, so it must be rebuilt with it.
      await prisma.hallTicket.update({
        where: { id: ticket.id },
        data: { qrPayload: qrPayloadFor(slot.id, value, ticket.seatNo) },
      });
    } else if (field === 'fullName') {
      await prisma.user.update({ where: { id: ticket.studentProfile.user.id }, data: { fullName: value } });
    } else {
      throw unprocessable(`Field "${field}" cannot be applied`, { allowed: CORRECTABLE_FIELDS });
    }
  }

  const completed = await prisma.hallTicketRequest.update({
    where: { id: requestId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  const after = {
    seatNo: request.kind === 'REISSUE' ? (await prisma.hallTicket.findUnique({ where: { id: ticket.id } }))?.seatNo : ticket.seatNo,
    rollNo: request.field === 'rollNo' ? (request.requestedValue ?? null) : ticket.studentProfile.rollNo,
    fullName: request.field === 'fullName' ? (request.requestedValue ?? null) : ticket.studentProfile.user.fullName,
  };

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'HALL_TICKET_REQUEST_COMPLETED',
    entityType: 'HallTicketRequest',
    entityId: requestId,
    before,
    after,
  });

  return completed;
}

/**
 * Requirement 10 — publish or recall.
 *
 * Refuses to publish an exam with nothing to publish, because "published, 0
 * tickets" tells a controller the students can see their hall tickets when
 * there are none to see. Recalling is idempotent for the same reason printing
 * twice is.
 */
export async function setPublication(
  institutionId: string,
  actorUserId: string,
  examId: string,
  rawAction: string,
) {
  const action = assertPublicationAction(rawAction);
  const exam = await requireExam(institutionId, examId);
  const target = action === 'publish' ? 'PUBLISHED' : 'RECALLED';

  if (action === 'publish') {
    const tickets = await prisma.hallTicket.count({ where: { examSlot: { examId: exam.id } } });
    if (tickets === 0) {
      throw unprocessable('This exam has no generated hall ticket to publish', {
        tickets: 0,
        policy: THRESHOLDS.publishPolicy.sentence,
      });
    }
  }

  const alreadyInState = exam.hallTicketStatus === target;
  const updated = alreadyInState
    ? exam
    : await prisma.exam.update({
        where: { id: exam.id },
        data: {
          hallTicketStatus: target,
          ...(action === 'publish'
            ? { hallTicketPublishedAt: new Date(), hallTicketPublishedByUserId: actorUserId }
            : {}),
        },
      });

  if (!alreadyInState) {
    await writeAudit({
      institutionId,
      actorUserId,
      action: action === 'publish' ? 'HALL_TICKETS_PUBLISHED' : 'HALL_TICKETS_RECALLED',
      entityType: 'Exam',
      entityId: exam.id,
      before: { hallTicketStatus: exam.hallTicketStatus },
      after: { hallTicketStatus: target },
    });
  }

  return { ...updated, alreadyInState };
}
