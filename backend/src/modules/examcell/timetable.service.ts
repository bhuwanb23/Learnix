// X-02 Timetable — the block service (docs/users/05 §3.9).
//
// One file, eight blocks, one conflict engine. The engine is the important part:
// `detectConflicts()` is the ONLY place a clash is decided, and every read path
// and every write path calls it. The previous version checked clashes ad hoc in
// `addExamSlot`, checked nothing in `rescheduleSlot`, and never wrote an
// `ExamConflict` row at all — so the screen showed a hard-coded "2 conflicts"
// from a fixture while the server could only ever report zero.
//
// Everything is computed live from rows on every read. A clash is not a fact
// that gets stored and then goes stale the moment somebody fixes it; it is a
// property of the timetable as it currently stands. `ExamConflict` rows are
// still written on detection, so the audit trail is real, but a fixed clash
// disappears with nothing to dismiss.
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { writeAudit } from '../../lib/audit.js';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/errors.js';
import {
  addDays, assertBlock, BLOCKS, BLOCKING_KINDS, CALENDAR_SPAN_DAYS,
  CONFLICT_KINDS, dayKey, EXAM_STATUSES, EXAM_TYPES, EXAM_TYPE_META,
  formatDuration, HEAVY_DUTY_COUNT, overlaps, parseExamDate, shortDayLabel,
  slotDurationMinutes, startOfLocalDay, THRESHOLDS, validateWindow,
  type ConflictKindId,
} from './timetable.rules.js';

// ═══ Tenant scoping ══════════════════════════════════════════════════════
//
// `ExamSlot` reaches its tenant through `exam.institutionId`. `CourseOffering`
// carries NO institutionId of its own — the denormalized anchor is
// `Course.institutionId`.
//
// The old `addExamSlot` did `prisma.courseOffering.findFirst({ where: { id } })`
// with no institution filter at all, so a slot could be created against another
// college's offering. `offeringWhere` is the only way an offering is looked up
// anywhere in this file, and every call goes through it.
const offeringWhere = (institutionId: string, id?: string) => ({
  ...(id ? { id } : {}),
  course: { institutionId },
});

const examWhere = (institutionId: string, examId?: string) => ({
  ...(examId ? { id: examId } : {}),
  institutionId,
});

const slotInclude = {
  exam: true,
  offering: { include: { course: true, section: true, enrollments: true } },
  roomAllocations: true,
} satisfies Prisma.ExamSlotInclude;

type SlotRow = {
  id: string; examId: string; offeringId: string;
  date: Date; startTime: string; endTime: string; room: string | null;
  seats: number; status: string;
  exam: { id: string; institutionId: string; name: string; semester: number; type: string; status: string; academicYearId: string };
  offering: {
    id: string; teacherUserId: string;
    course: { id: string; code: string; name: string; institutionId: string };
    section: { id: string; name: string };
    /** The one field the student-clash rule cannot work without. */
    enrollments: { id: string; studentProfileId: string; status: string }[];
  };
  roomAllocations: { id: string; roomId: string; invigilatorUserId: string | null }[];
};

// ═══ The catalogue ═══════════════════════════════════════════════════════

/**
 * Everything the app builds itself out of, in one round trip.
 *
 * Published rather than hard-coded, for the reason the reports and dashboard
 * hubs do it: a block list copied into the app is a list that goes stale, and
 * the card would either not exist or open a block the server answers 422.
 */
export async function timetableCatalogue() {
  return {
    blocks: BLOCKS,
    conflictKinds: CONFLICT_KINDS,
    examTypes: EXAM_TYPES.map((t) => ({ id: t, ...EXAM_TYPE_META[t] })),
    examStatuses: EXAM_STATUSES,
    thresholds: THRESHOLDS,
  };
}

// ═══ The conflict engine ═════════════════════════════════════════════════
//
// The single decision point for a clash. `detectConflicts` is pure with respect
// to a list of slots: given the slots, it returns what is wrong. That is what
// makes it testable without a database, and what stops the six checks from
// drifting apart the way the old per-path checks did.

export type DetectedConflict = {
  kind: ConflictKindId;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  blocking: boolean;
  slotIds: string[];
  message: string;
  detail?: Record<string, unknown>;
};

const dayOf = (d: Date) => dayKey(d);

/** Two slots collide only on the same calendar day AND overlapping hours. */
const sameTimeWindow = (a: SlotRow, b: SlotRow) =>
  dayOf(a.date) === dayOf(b.date) && overlaps(a.startTime, a.endTime, b.startTime, b.endTime);

const statusLive = (s: SlotRow) => s.status !== 'CANCELLED';

const nameOf = (s: SlotRow) => `${s.offering.course.code} ${s.offering.course.name}`;

/**
 * Given slots, what is wrong with them?
 *
 * The engine takes the FULL set for the institution because a clash can cross
 * exam boundaries — the whole point is that two different examinations must not
 * put the same student in two rooms — and a per-exam check structurally cannot
 * see that.
 */
export function detectConflicts(
  slots: SlotRow[],
  venueCapacityById: ReadonlyMap<string, number> = new Map(),
): DetectedConflict[] {
  const out: DetectedConflict[] = [];
  const live = slots.filter(statusLive);

  // ── STUDENT_DOUBLE_BOOKED ────────────────────────────────────────────
  // The only clash that physically stops a student sitting a paper. Built from
  // ENROLLMENTS rather than from the offering, because two sections of the same
  // course are different offerings and a student enrolled in both really does
  // have two papers.
  const studentSlots = new Map<string, { slot: SlotRow; offeringId: string }[]>();
  for (const s of live) {
    for (const e of s.offering.enrollments) {
      const list = studentSlots.get(e.studentProfileId) ?? [];
      list.push({ slot: s, offeringId: s.offeringId });
      studentSlots.set(e.studentProfileId, list);
    }
  }
  for (const [studentProfileId, entries] of studentSlots) {
    const seen = new Set<string>();
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const a = entries[i];
        const b = entries[j];
        const key = [a.slot.id, b.slot.id].sort().join('|');
        if (seen.has(key)) continue;
        if (!sameTimeWindow(a.slot, b.slot)) continue;
        seen.add(key);
        out.push({
          kind: 'STUDENT_DOUBLE_BOOKED',
          severity: 'HIGH',
          blocking: true,
          slotIds: [a.slot.id, b.slot.id],
          message: `A student enrolled in both ${nameOf(a.slot)} and ${nameOf(b.slot)} is in two papers at once on ${shortDayLabel(dayOf(a.slot.date))}`,
          detail: {
            studentProfileId,
            papers: [nameOf(a.slot), nameOf(b.slot)],
            date: dayOf(a.slot.date),
          },
        });
      }
    }
  }

  // ── INVIGILATOR_DOUBLE_BOOKED ────────────────────────────────────────
  //
  // DEDUPED BY SLOT, and the reason is a bug this very structure caused.
  //
  // A paper split across two venues has TWO allocations on the SAME slot. The
  // loop below pushed the slot once per allocation, so a slot staffed by one
  // person across two rooms compared ITSELF against ITSELF and reported an
  // invigilator double-booking — a HIGH, BLOCKING clash that made a split paper
  // impossible to staff at all. Two allocations of one slot are one paper, not
  // two.
  //
  // Whether one person should cover both rooms of a split paper is a real
  // staffing question, but it is a duty-roster question, not a clash: it does
  // not stop anyone sitting two papers at once, and blocking on it would mean a
  // large paper could never be seated.
  const invigilatorSlots = new Map<string, SlotRow[]>();
  for (const s of live) {
    const people = new Set(
      s.roomAllocations.map((a) => a.invigilatorUserId).filter((x): x is string => !!x),
    );
    for (const person of people) {
      const list = invigilatorSlots.get(person) ?? [];
      list.push(s);
      invigilatorSlots.set(person, list);
    }
  }
  for (const [invigilatorUserId, list] of invigilatorSlots) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (!sameTimeWindow(a, b)) continue;
        out.push({
          kind: 'INVIGILATOR_DOUBLE_BOOKED',
          severity: 'HIGH',
          blocking: true,
          slotIds: [a.id, b.id],
          message: `One invigilator is booked for both ${nameOf(a)} and ${nameOf(b)} at ${a.startTime}–${a.endTime} on ${shortDayLabel(dayOf(a.date))}`,
          detail: { invigilatorUserId, date: dayOf(a.date) },
        });
      }
    }
  }

  // ── TEACHER_DOUBLE_BOOKED ────────────────────────────────────────────
  const teacherSlots = new Map<string, SlotRow[]>();
  for (const s of live) {
    const list = teacherSlots.get(s.offering.teacherUserId) ?? [];
    list.push(s);
    teacherSlots.set(s.offering.teacherUserId, list);
  }
  for (const [teacherUserId, list] of teacherSlots) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (!sameTimeWindow(a, b)) continue;
        out.push({
          kind: 'TEACHER_DOUBLE_BOOKED',
          severity: 'LOW',
          blocking: false,
          slotIds: [a.id, b.id],
          message: `The teacher of ${nameOf(a)} is also due for ${nameOf(b)} at the same time`,
          detail: { teacherUserId, date: dayOf(a.date) },
        });
      }
    }
  }

  // ── SUBJECT_DOUBLE_BOOKED ────────────────────────────────────────────
  const byCourse = new Map<string, SlotRow[]>();
  for (const s of live) {
    const list = byCourse.get(s.offering.course.id) ?? [];
    list.push(s);
    byCourse.set(s.offering.course.id, list);
  }
  for (const [courseId, list] of byCourse) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (a.id === b.id) continue;
        if (!sameTimeWindow(a, b)) continue;
        out.push({
          kind: 'SUBJECT_DOUBLE_BOOKED',
          severity: 'MEDIUM',
          blocking: false,
          slotIds: [a.id, b.id],
          message: `${nameOf(a)} is scheduled twice in overlapping papers`,
          detail: { courseId, date: dayOf(a.date) },
        });
      }
    }
  }

  // ── ROOM_DOUBLE_BOOKED ───────────────────────────────────────────────
  const byRoom = new Map<string, SlotRow[]>();
  for (const s of live) {
    for (const a of s.roomAllocations) {
      const list = byRoom.get(a.roomId) ?? [];
      list.push(s);
      byRoom.set(a.roomId, list);
    }
  }
  for (const [roomId, list] of byRoom) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (!sameTimeWindow(a, b)) continue;
        out.push({
          kind: 'ROOM_DOUBLE_BOOKED',
          severity: 'MEDIUM',
          blocking: false,
          slotIds: [a.id, b.id],
          message: `Venue "${roomId}" hosts both ${nameOf(a)} and ${nameOf(b)} at the same time`,
          detail: { roomId, date: dayOf(a.date) },
        });
      }
    }
  }

  // ── CAPACITY_SHORTFALL ───────────────────────────────────────────────
  // The DECISION was: warn and show the shortfall, not block. Splitting a large
  // paper across venues is the normal remedy and must stay stageable, so this
  // records the exact number of seats that are missing.
  //
  // Capacity arrives as an argument rather than being fetched here, so this
  // function stays PURE and can be exercised against hundreds of synthetic
  // schedules with no database at all. `loadSlots` fills the map.
  const capacityById = venueCapacityById;
  for (const s of live) {
    const enrolled = s.offering.enrollments.length;
    if (enrolled === 0) continue;
    const seated = s.roomAllocations.reduce((sum, a) => sum + (capacityById.get(a.roomId) ?? 0), 0);
    if (seated === 0) continue; // no venue allocated at all — that is PAPER_UNALLOCATED's job
    if (seated >= enrolled) continue;
    out.push({
      kind: 'CAPACITY_SHORTFALL',
      severity: 'MEDIUM',
      blocking: false,
      slotIds: [s.id],
      message: `${nameOf(s)} has ${enrolled} enrolled but only ${seated} seats allocated — ${enrolled - seated} short`,
      detail: {
        enrolled,
        seated,
        shortfall: enrolled - seated,
        roomIds: s.roomAllocations.map((a) => a.roomId),
      },
    });
  }

  // ── NO_INVIGILATOR ───────────────────────────────────────────────────
  for (const s of live) {
    const staffed = s.roomAllocations.filter((a) => a.invigilatorUserId).length;
    if (staffed > 0) continue;
    out.push({
      kind: 'NO_INVIGILATOR',
      severity: 'HIGH',
      blocking: false,
      slotIds: [s.id],
      message: `${nameOf(s)} on ${shortDayLabel(dayOf(s.date))} has no invigilator assigned`,
      detail: { date: dayOf(s.date) },
    });
  }

  return out;
}

/** Load every slot the engine needs. Institution-scoped, and never filtered to one exam. */
async function loadSlots(institutionId: string, examId?: string): Promise<SlotRow[]> {
  return prisma.examSlot.findMany({
    where: { exam: examWhere(institutionId, examId) },
    include: slotInclude,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  }) as unknown as Promise<SlotRow[]>;
}

/** Venue capacities for exactly the venues these slots use. */
async function loadCapacities(
  slots: SlotRow[],
): Promise<Map<string, number>> {
  const ids = [...new Set(slots.flatMap((s) => s.roomAllocations.map((a) => a.roomId)))];
  if (ids.length === 0) return new Map();
  const venues = await prisma.venue.findMany({
    where: { id: { in: ids } },
    select: { id: true, capacity: true },
  });
  return new Map(venues.map((v) => [v.id, v.capacity]));
}

/**
 * Load the slots and run the engine, filling in the one thing the pure engine
 * cannot know for itself: how many seats each venue actually has.
 *
 * Every read path and every write path calls THIS, which is what stops six
 * checks drifting apart the way the old per-path checks did.
 */
async function detectFor(
  institutionId: string,
  examId?: string,
): Promise<{ slots: SlotRow[]; conflicts: DetectedConflict[] }> {
  const slots = await loadSlots(institutionId, examId);
  const capacities = await loadCapacities(slots);
  return { slots, conflicts: detectConflicts(slots, capacities) };
}

/**
 * The gate every write path goes through.
 *
 * A BLOCKING clash is refused with 422 and the offending slot named. A soft
 * clash is returned so the caller can record it and tell the controller what
 * they just created.
 */
export function assertNoBlockingClash(
  conflicts: DetectedConflict[],
  touchingSlotId?: string,
): void {
  const hits = conflicts.filter(
    (c) => c.blocking && (!touchingSlotId || c.slotIds.includes(touchingSlotId)),
  );
  if (hits.length === 0) return;
  throw unprocessable(
    `That would double-book ${hits.length === 1 ? 'someone' : 'people'}: ${hits.map((h) => h.message).join('; ')}`,
    {
      blockingKinds: BLOCKING_KINDS,
      conflicts: hits.map((h) => ({ kind: h.kind, message: h.message, detail: h.detail })),
    },
  );
}

/** Persist what was detected, so `exam_conflicts` stops being a table nothing writes. */
async function recordConflicts(
  institutionId: string,
  actorUserId: string,
  examIds: string[],
  conflicts: DetectedConflict[],
): Promise<void> {
  const byExam = new Map<string, DetectedConflict[]>();
  for (const c of conflicts) {
    // ExamConflict rows hang off an Exam, so a cross-exam clash is filed under
    // every exam it touches rather than being silently dropped.
    const exams = await prisma.examSlot.findMany({
      where: { id: { in: c.slotIds } },
      select: { examId: true },
    });
    for (const e of exams) {
      const list = byExam.get(e.examId) ?? [];
      list.push(c);
      byExam.set(e.examId, list);
    }
  }
  const targets = examIds.length ? examIds : [...byExam.keys()];
  for (const examId of targets) {
    const mine = byExam.get(examId) ?? [];
    // Clear this exam's previous rows, then write the current truth. A clash
    // that has been fixed must disappear, which is the whole argument for
    // recomputing rather than accumulating.
    await prisma.examConflict.deleteMany({ where: { examId, resolvedAt: null } });
    for (const c of mine) {
      await prisma.examConflict.create({
        data: {
          examId,
          type: c.kind,
          description: c.message,
          severity: c.severity,
        },
      });
    }
  }
  if (conflicts.length > 0) {
    await writeAudit({
      institutionId,
      actorUserId,
      action: 'timetable.conflicts.detected',
      entityType: 'Exam',
      entityId: targets[0] ?? 'none',
      after: { detected: conflicts.length, blocking: conflicts.filter((c) => c.blocking).length },
    });
  }
}

const decorateSlot = (s: SlotRow, conflicts: DetectedConflict[]) => {
  const mine = conflicts.filter((c) => c.slotIds.includes(s.id));
  return {
    slotId: s.id,
    examId: s.examId,
    examName: s.exam.name,
    examType: s.exam.type,
    examStatus: s.exam.status,
    semester: s.exam.semester,
    offeringId: s.offeringId,
    courseCode: s.offering.course.code,
    courseName: s.offering.course.name,
    section: s.offering.section.name,
    teacherUserId: s.offering.teacherUserId,
    date: dayOf(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
    durationMinutes: slotDurationMinutes(s.startTime, s.endTime),
    durationLabel: formatDuration(slotDurationMinutes(s.startTime, s.endTime)),
    room: s.room,
    seats: s.seats,
    status: s.status,
    enrolled: s.offering.enrollments.length,
    venues: s.roomAllocations.map((a) => a.roomId),
    invigilators: s.roomAllocations
      .filter((a) => a.invigilatorUserId)
      .map((a) => a.invigilatorUserId),
    conflicts: mine.map((c) => ({ kind: c.kind, severity: c.severity, blocking: c.blocking })),
    conflictCount: mine.length,
    blocking: mine.some((c) => c.blocking),
  };
};

// ═══ Block 1 — the calendar ══════════════════════════════════════════════

/**
 * The season as a date grid rather than a list.
 *
 * A list of papers answers "what is on the 15th" only if you scroll to it. An
 * exam controller's actual question is "what shape is this fortnight", which is
 * why this is a grid and why an empty day is drawn rather than omitted.
 */
export async function calendarBlock(institutionId: string, examId?: string) {
  const { slots, conflicts } = await detectFor(institutionId, examId);
  const today = startOfLocalDay(new Date());
  const from = addDays(today, -7);
  const to = addDays(today, CALENDAR_SPAN_DAYS);

  const days: { date: string; label: string; inWindow: boolean; isToday: boolean; slotCount: number; conflictCount: number; slots: ReturnType<typeof decorateSlot>[] }[] = [];
  for (let i = 0; i <= CALENDAR_SPAN_DAYS + 7; i += 1) {
    const d = addDays(from, i);
    const key = dayKey(d);
    const onDay = slots.filter((s) => dayOf(s.date) === key && s.status !== 'CANCELLED');
    days.push({
      date: key,
      label: shortDayLabel(key),
      inWindow: d >= today && d <= to,
      isToday: key === dayKey(today),
      slotCount: onDay.length,
      conflictCount: onDay.filter((s) => conflicts.some((c) => c.slotIds.includes(s.id))).length,
      slots: onDay.map((s) => decorateSlot(s, conflicts)),
    });
  }

  const dated = slots.filter((s) => s.status !== 'CANCELLED').map((s) => dayOf(s.date)).sort();
  return {
    from: dayKey(from),
    to: dayKey(to),
    today: dayKey(today),
    spanDays: CALENDAR_SPAN_DAYS,
    days,
    // Null, not zero, when nothing is scheduled at all: "the season has not
    // started" and "the season runs to today" are different facts.
    firstExamDay: dated[0] ?? null,
    lastExamDay: dated[dated.length - 1] ?? null,
    examDays: dated.length,
    slotCount: slots.filter((s) => s.status !== 'CANCELLED').length,
    conflictCount: conflicts.length,
  };
}

// ═══ Block 2 — the exam schedules ═══════════════════════════════════════

export async function examsBlock(institutionId: string) {
  const [exams, { slots, conflicts }] = await Promise.all([
    prisma.exam.findMany({
      where: { institutionId },
      include: { academicYear: true, examSlots: true },
      orderBy: [{ semester: 'asc' }, { createdAt: 'desc' }],
    }),
    detectFor(institutionId),
  ]);
  const slotsByExam = new Map<string, typeof slots>();
  for (const s of slots) {
    const list = slotsByExam.get(s.examId) ?? [];
    list.push(s);
    slotsByExam.set(s.examId, list);
  }
  return exams.map((e) => {
    const mine = slotsByExam.get(e.id) ?? [];
    const mineConflicts = conflicts.filter((c) => c.slotIds.some((id) => mine.some((s) => s.id === id)));
    const high = mineConflicts.filter((c) => c.severity === 'HIGH');
    return {
      examId: e.id,
      name: e.name,
      type: e.type,
      typeLabel: EXAM_TYPE_META[e.type as keyof typeof EXAM_TYPE_META]?.label ?? e.type,
      semester: e.semester,
      status: e.status,
      academicYearName: e.academicYear?.name ?? null,
      slotCount: mine.length,
      scheduledCount: mine.filter((s) => s.status !== 'CANCELLED').length,
      firstDay: mine.length ? dayKey(mine[0].date) : null,
      lastDay: mine.length ? dayKey(mine[mine.length - 1].date) : null,
      conflictCount: mineConflicts.length,
      highConflictCount: high.length,
      // The publish gate, per exam, computed rather than stored, so it is never
      // stale and there is nothing to keep in sync by hand.
      publishable: high.length === 0 && mine.length > 0,
      blockReason: mine.length === 0
        ? 'This exam has no slots yet, so there is nothing to publish.'
        : high.length === 0 ? null : `${high.length} HIGH clash(es) must be resolved first`,
    };
  });
}

// ═══ Block 3 — course & subject allocation ══════════════════════════════

/**
 * Which courses are in each exam, and — the part that earns its screen — which
 * ELIGIBLE ones are not.
 *
 * An exam that quietly omits a course is the failure nobody notices until a
 * student is missing a paper they were told to sit. So "missing" is computed
 * against the offerings actually running for that semester in that year, and it
 * is shown rather than inferred.
 */
export async function allocationBlock(institutionId: string, examId?: string) {
  const exams = await prisma.exam.findMany({
    where: examWhere(institutionId, examId),
    include: { examSlots: { include: { offering: { include: { course: true, section: true, enrollments: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  const out = [];
  for (const e of exams) {
    const allocated = e.examSlots.map((s) => s.offering);
    const allocatedOfferingIds = new Set(allocated.map((o) => o.id));
    const allocatedCourseIds = new Set(allocated.map((o) => o.courseId));

    // Eligible = an offering running in THIS semester of THIS academic year
    // that has a slot. Anything in another semester or year is not this exam's
    // business and must not appear as "missing".
    const eligible = await prisma.courseOffering.findMany({
      where: {
        ...offeringWhere(institutionId),
        semester: e.semester,
        academicYearId: e.academicYearId,
      },
      include: { course: true, section: true, enrollments: true },
    });
    const missing = eligible.filter((o) => !allocatedOfferingIds.has(o.id));

    out.push({
      examId: e.id,
      examName: e.name,
      semester: e.semester,
      type: e.type,
      typeLabel: EXAM_TYPE_META[e.type as keyof typeof EXAM_TYPE_META]?.label ?? e.type,
      status: e.status,
      allocatedCount: allocated.length,
      distinctCourses: allocatedCourseIds.size,
      eligibleCount: eligible.length,
      // A distinct-course count beside the offering count, because two sections
      // of one course are two papers sat at different times, not two courses.
      missingCount: missing.length,
      missing: missing.map((o) => ({
        offeringId: o.id,
        courseCode: o.course.code,
        courseName: o.course.name,
        section: o.section.name,
        enrolled: o.enrollments.length,
      })),
      allocated: allocated.map((o) => ({
        offeringId: o.id,
        courseCode: o.course.code,
        courseName: o.course.name,
        section: o.section.name,
        enrolled: o.enrollments.length,
        slotIds: e.examSlots.filter((s) => s.offeringId === o.id).map((s) => s.id),
      })),
    });
  }
  return out;
}

// ═══ Block 4 — the slots ═════════════════════════════════════════════════

export async function slotsBlock(institutionId: string, examId?: string) {
  const { slots, conflicts } = await detectFor(institutionId, examId);
  const decorated = slots.map((s) => decorateSlot(s, conflicts));
  const byDay = new Map<string, ReturnType<typeof decorateSlot>[]>();
  for (const s of decorated) {
    const list = byDay.get(s.date) ?? [];
    list.push(s);
    byDay.set(s.date, list);
  }
  return {
    slots: decorated,
    days: [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, list]) => ({
        date,
        label: shortDayLabel(date),
        count: list.length,
        conflictCount: list.filter((s) => s.conflictCount > 0).length,
      })),
    totals: {
      slots: decorated.length,
      scheduled: decorated.filter((s) => s.status === 'SCHEDULED').length,
      rescheduled: decorated.filter((s) => s.status === 'RESCHEDULED').length,
      completed: decorated.filter((s) => s.status === 'COMPLETED').length,
      cancelled: decorated.filter((s) => s.status === 'CANCELLED').length,
      seats: decorated.reduce((t, s) => t + s.seats, 0),
      enrolled: decorated.reduce((t, s) => t + s.enrolled, 0),
      conflictCount: conflicts.length,
      blockingCount: conflicts.filter((c) => c.blocking).length,
    },
  };
}

// ═══ Block 5 — centres & rooms ══════════════════════════════════════════

/**
 * Venues with their REAL capacity.
 *
 * `Room` in the schema is a HOSTEL room — capacity 2, belonging to a block — and
 * using it as an exam centre would be nonsense. `Venue` is the institution-wide
 * room master and is what this allocates against. An allocation naming an id
 * that is not a venue of THIS institution is refused, because `roomId` on
 * `ExamRoomAllocation` is a scalar with no foreign key to protect it.
 */
export async function roomsBlock(institutionId: string, examId?: string) {
  const [{ slots, conflicts }, venues] = await Promise.all([
    detectFor(institutionId, examId),
    prisma.venue.findMany({ where: { institutionId }, orderBy: { name: 'asc' } }),
  ]);

  const usage = new Map<string, { slots: number; bookedDates: Set<string>; seatedCapacity: number }>();
  for (const s of slots) {
    for (const a of s.roomAllocations) {
      const u = usage.get(a.roomId) ?? { slots: 0, bookedDates: new Set<string>(), seatedCapacity: 0 };
      u.slots += 1;
      u.bookedDates.add(dayOf(s.date));
      const v = venues.find((x) => x.id === a.roomId);
      u.seatedCapacity += v?.capacity ?? 0;
      usage.set(a.roomId, u);
    }
  }

  return {
    venues: venues.map((v) => {
      const u = usage.get(v.id);
      return {
        venueId: v.id,
        name: v.name,
        location: v.location,
        capacity: v.capacity,
        status: v.status,
        allocatedSlots: u?.slots ?? 0,
        bookedDays: u ? [...u.bookedDates].sort() : [],
        // A venue with zero bookings on a day is why the next allocation can go
        // in, so "free on this day" is computed rather than left to the reader.
        conflictCount: conflicts.filter((c) => c.detail?.roomId === v.id).length,
        inUse: (u?.slots ?? 0) > 0,
      };
    }),
    totals: {
      venues: venues.length,
      capacity: venues.reduce((t, v) => t + v.capacity, 0),
      inUse: venues.filter((v) => (usage.get(v.id)?.slots ?? 0) > 0).length,
      free: venues.filter((v) => (usage.get(v.id)?.slots ?? 0) === 0).length,
      allocations: slots.reduce((t, s) => t + s.roomAllocations.length, 0),
    },
  };
}

// ═══ Block 6 — invigilator duty ═════════════════════════════════════════

export async function dutyBlock(institutionId: string, examId?: string) {
  const [{ slots }, staff] = await Promise.all([
    detectFor(institutionId, examId),
    prisma.user.findMany({
      where: { institutionId, deletedAt: null, roles: { some: { role: { in: ['TEACHER', 'HOD', 'ADMIN'] } } } },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  const load = new Map<string, { slots: SlotRow[]; days: Set<string> }>();
  for (const s of slots) {
    for (const a of s.roomAllocations) {
      if (!a.invigilatorUserId) continue;
      const u = load.get(a.invigilatorUserId) ?? { slots: [], days: new Set<string>() };
      u.slots.push(s);
      u.days.add(dayOf(s.date));
      load.set(a.invigilatorUserId, u);
    }
  }

  const roster = staff.map((u) => {
    const mine = load.get(u.id);
    const busy = mine?.slots.filter((s) => s.status !== 'CANCELLED') ?? [];
    return {
      userId: u.id,
      name: u.fullName,
      email: u.email,
      dutyCount: busy.length,
      dutyDays: mine ? [...mine.days].sort() : [],
      dutyMinutes: busy.reduce((t, s) => t + (slotDurationMinutes(s.startTime, s.endTime) ?? 0), 0),
      // Surfaced, not blocked. A small college may legitimately have one
      // invigilator; the controller needs to SEE the load, not be forbidden.
      heavy: busy.length >= HEAVY_DUTY_COUNT,
      duty: busy.map((s) => ({
        slotId: s.id,
        examName: s.exam.name,
        courseCode: s.offering.course.code,
        courseName: s.offering.course.name,
        date: dayOf(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
        venueId: s.roomAllocations.find((a) => a.invigilatorUserId === u.id)?.roomId ?? null,
      })),
    };
  }).sort((a, b) => b.dutyCount - a.dutyCount || a.name.localeCompare(b.name));

  const unstaffed = slots
    .filter((s) => s.status !== 'CANCELLED' && !s.roomAllocations.some((a) => a.invigilatorUserId))
    .map((s) => ({
      slotId: s.id,
      examName: s.exam.name,
      courseCode: s.offering.course.code,
      courseName: s.offering.course.name,
      date: dayOf(s.date),
      startTime: s.startTime,
      endTime: s.endTime,
    }));

  return {
    roster,
    unstaffed,
    totals: {
      staff: staff.length,
      onDuty: roster.filter((x) => x.dutyCount > 0).length,
      available: roster.filter((x) => x.dutyCount === 0).length,
      heavy: roster.filter((x) => x.heavy).length,
      unstaffedSlots: unstaffed.length,
      dutyTotal: roster.reduce((t, x) => t + x.dutyCount, 0),
    },
    heavyThreshold: HEAVY_DUTY_COUNT,
  };
}

// ═══ Block 7 — the student timetable ═════════════════════════════════════

/**
 * One student's season, derived from ENROLLMENTS rather than from a stored
 * student-timetable table — so it cannot disagree with what the student is
 * actually enrolled in.
 *
 * An enrolled course with no slot is reported as `unallocated` rather than
 * quietly missing, because "I have not been told when to sit" and "I am not
 * sitting this" must not look the same.
 */
export async function studentsBlock(institutionId: string, studentProfileId?: string) {
  const profiles = await prisma.studentProfile.findMany({
    where: { institutionId, status: 'ACTIVE', ...(studentProfileId ? { id: studentProfileId } : {}) },
    include: { user: { select: { fullName: true, email: true } } },
    orderBy: { rollNo: 'asc' },
    take: studentProfileId ? 1 : 50,
  });

  const out = [];
  for (const p of profiles) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentProfileId: p.id, status: 'ACTIVE', offering: offeringWhere(institutionId) },
      include: {
        offering: {
          include: {
            course: true, section: true,
            examSlots: { include: { exam: true, roomAllocations: true } },
          },
        },
      },
    });
    const withSlots = enrollments.filter((e) => e.offering.examSlots.length > 0);
    const unallocated = enrollments
      .filter((e) => e.offering.examSlots.length === 0)
      .map((e) => ({
        offeringId: e.offeringId,
        courseCode: e.offering.course.code,
        courseName: e.offering.course.name,
        section: e.offering.section.name,
      }));

    const papers = withSlots
      .flatMap((e) => e.offering.examSlots.map((s) => ({
        slotId: s.id,
        examName: s.exam.name,
        examType: s.exam.type,
        examStatus: s.exam.status,
        courseCode: e.offering.course.code,
        courseName: e.offering.course.name,
        date: dayOf(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        // The student's own seat, not the paper's nominal room.
        venueIds: s.roomAllocations.map((a) => a.roomId),
      })))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    // The whole point of a student timetable: prove nothing overlaps.
    let clashes = 0;
    for (let i = 0; i < papers.length; i += 1) {
      for (let j = i + 1; j < papers.length; j += 1) {
        if (papers[i].date === papers[j].date && overlaps(papers[i].startTime, papers[i].endTime, papers[j].startTime, papers[j].endTime)) {
          clashes += 1;
        }
      }
    }

    out.push({
      studentProfileId: p.id,
      name: p.user.fullName,
      rollNo: p.rollNo,
      currentSemester: p.currentSemester,
      enrolled: enrollments.length,
      paperCount: papers.length,
      unallocatedCount: unallocated.length,
      unallocated,
      clashes,
      papers,
      firstDay: papers[0]?.date ?? null,
      lastDay: papers[papers.length - 1]?.date ?? null,
    });
  }
  return out;
}

// ═══ Block 8 — clashes & publishing ══════════════════════════════════════

export async function conflictsBlock(institutionId: string, examId?: string) {
  const [{ conflicts: all }, exams] = await Promise.all([
    detectFor(institutionId, examId),
    prisma.exam.findMany({ where: examWhere(institutionId, examId), include: { examSlots: true } }),
  ]);
  // The engine is already scoped to this exam's slots when `examId` is
  // given. Re-filtering here would DROP the cross-exam clashes — a student
  // in two papers from two different examinations is precisely the one a
  // single-exam view would otherwise hide.
  const scoped = all;

  const byKind = CONFLICT_KINDS.map((k) => {
    const mine = scoped.filter((c) => c.kind === k.id);
    return {
      kind: k.id,
      label: k.label,
      blurb: k.blurb,
      severity: k.severity,
      blocking: k.blocking,
      icon: k.icon,
      color: k.color,
      count: mine.length,
      tone: mine.length === 0 ? 'clear' : k.severity === 'HIGH' ? 'bad' : 'warn',
      items: mine.map((c) => ({ slotIds: c.slotIds, message: c.message, detail: c.detail })),
    };
  });

  const high = scoped.filter((c) => c.severity === 'HIGH');
  return {
    kinds: byKind,
    total: scoped.length,
    high: high.length,
    blocking: scoped.filter((c) => c.blocking).length,
    publishable: high.length === 0,
    blockReason: high.length === 0 ? null : `${high.length} HIGH clash(es) must be resolved before publishing`,
    policy: THRESHOLDS.publishPolicy,
    exams: exams.map((e) => {
      const mineIds = new Set(e.examSlots.map((s) => s.id));
      const mine = all.filter((c) => c.slotIds.some((id) => mineIds.has(id)));
      const mineHigh = mine.filter((c) => c.severity === 'HIGH');
      return {
        examId: e.id,
        name: e.name,
        status: e.status,
        slotCount: e.examSlots.length,
        conflictCount: mine.length,
        highConflictCount: mineHigh.length,
        publishable: mineHigh.length === 0 && e.examSlots.length > 0,
        blockReason: e.examSlots.length === 0
          ? 'No slots yet.'
          : mineHigh.length === 0 ? null : `${mineHigh.length} HIGH clash(es) unresolved`,
      };
    }),
  };
}

// ═══ The overview ════════════════════════════════════════════════════════

/**
 * The whole feature in one round trip, plus the catalogue.
 *
 * The hub shows all eight blocks at once. A screen that fetched eight times
 * could show eight different moments — a conflicts count computed before a slot
 * the officer had just added, and a calendar drawn after it.
 */
export async function timetableOverview(institutionId: string) {
  const [calendar, exams, allocation, slots, rooms, duty, students, conflicts] = await Promise.all([
    calendarBlock(institutionId),
    examsBlock(institutionId),
    allocationBlock(institutionId),
    slotsBlock(institutionId),
    roomsBlock(institutionId),
    dutyBlock(institutionId),
    studentsBlock(institutionId),
    conflictsBlock(institutionId),
  ]);
  const unallocatedCourses = allocation.reduce((t, e) => t + e.missingCount, 0);
  return {
    generatedAt: new Date().toISOString(),
    calendar, exams, allocation, slots, rooms, duty, students, conflicts,
    summary: {
      exams: exams.length,
      published: exams.filter((e) => e.status === 'PUBLISHED' || e.status === 'RESULTS_PUBLISHED').length,
      slots: slots.totals.slots,
      examDays: calendar.examDays,
      firstExamDay: calendar.firstExamDay,
      lastExamDay: calendar.lastExamDay,
      enrolled: slots.totals.enrolled,
      seated: rooms.totals.capacity,
      unallocatedCourses,
      unstaffedSlots: duty.totals.unstaffedSlots,
      conflictCount: conflicts.total,
      highConflictCount: conflicts.high,
      publishable: conflicts.publishable,
    },
  };
}

export async function timetableBlock(institutionId: string, block: string) {
  switch (assertBlock(block)) {
    case 'CALENDAR': return calendarBlock(institutionId);
    case 'EXAMS': return examsBlock(institutionId);
    case 'ALLOCATION': return allocationBlock(institutionId);
    case 'SLOTS': return slotsBlock(institutionId);
    case 'ROOMS': return roomsBlock(institutionId);
    case 'DUTY': return dutyBlock(institutionId);
    case 'STUDENTS': return studentsBlock(institutionId);
    case 'CONFLICTS': return conflictsBlock(institutionId);
  }
}

// ═══ Mutations ══════════════════════════════════════════════════════════
//
// Every one of these ends with the SAME two steps: load the institution's slots,
// run the one conflict engine, and refuse only a blocking clash. The old code
// had a check in `addExamSlot`, no check in `rescheduleSlot`, and a different
// check again in `allocateRoom`. Three implementations of one idea, two of them
// wrong.

/**
 * Load, re-check, and RECORD what the engine finds. This runs AFTER a write and
 * only refreshes the stored conflict rows — it does NOT decide whether the write
 * was allowed. See `preflight`.
 */
async function refreshConflicts(
  institutionId: string,
  actorUserId: string,
  examIds: string[],
): Promise<DetectedConflict[]> {
  const { conflicts } = await detectFor(institutionId);
  await recordConflicts(institutionId, actorUserId, examIds, conflicts);
  return conflicts;
}

/**
 * THE ORDERING THAT MATTERS MOST IN THIS FILE.
 *
 * The clash engine has to run BEFORE the row is written, not after. Writing
 * first and guarding second means a refused write still leaves its row behind:
 * the controller is told 422, the screen shows the paper was not added, and it
 * is in fact sitting in the timetable creating a clash nobody can now see.
 *
 * So every mutation builds the PROPOSED state, runs the same pure engine over
 * it, and only then writes. `proposed` is a list of slot rows as they WOULD be
 * once the change lands — a copy of the real row with the change applied, or a
 * fresh row for something that does not exist yet.
 */
async function preflight(
  institutionId: string,
  proposed: SlotRow[],
  touchedSlotId: string,
): Promise<void> {
  const existing = await loadSlots(institutionId);
  const capacities = await loadCapacities([...existing, ...proposed]);
  // Replaced by the proposal where the two describe the same slot.
  const byId = new Map(existing.map((row) => [row.id, row]));
  for (const row of proposed) byId.set(row.id, row);
  const conflicts = detectConflicts([...byId.values()], capacities);
  assertNoBlockingClash(conflicts, touchedSlotId);
}

/** A copy of a slot row with `changes` applied. Never mutates the original. */
const proposeSlot = (row: SlotRow, changes: Partial<SlotRow>): SlotRow => ({
  ...row,
  ...changes,
  roomAllocations: changes.roomAllocations ?? row.roomAllocations,
  offering: changes.offering ?? row.offering,
});

export async function createExam(
  institutionId: string,
  actorUserId: string,
  body: { name: string; type: string; semester: number; academicYearId?: string },
) {
  const ayId = body.academicYearId
    ?? (await prisma.academicYear.findFirst({ where: { institutionId, isCurrent: true } }))?.id;
  if (!ayId) {
    throw badRequest('This institution has no current academic year, so an exam cannot be dated');
  }
  // Scoped by id AND institution. An academic year id from another college would
  // otherwise hang an exam off a foreign year.
  const ay = await prisma.academicYear.findFirst({ where: { id: ayId, institutionId } });
  if (!ay) throw notFound('Academic year not found');

  const existing = await prisma.exam.findFirst({
    where: { institutionId, semester: body.semester, type: body.type, name: body.name },
  });
  if (existing) {
    throw conflict('An exam with this name, type and semester already exists');
  }
  const exam = await prisma.exam.create({
    data: {
      institutionId,
      academicYearId: ay.id,
      semester: body.semester,
      type: body.type,
      name: body.name,
      createdByUserId: actorUserId,
      status: 'DRAFT',
    },
  });
  await writeAudit({
    institutionId, actorUserId, action: 'exam.created', entityType: 'Exam', entityId: exam.id,
  });
  return exam;
}

export async function updateExam(
  institutionId: string,
  actorUserId: string,
  examId: string,
  body: { name?: string; semester?: number; academicYearId?: string; status?: string },
) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, institutionId } });
  if (!exam) throw notFound('Exam not found');

  if (body.academicYearId) {
    const ay = await prisma.academicYear.findFirst({ where: { id: body.academicYearId, institutionId } });
    if (!ay) throw notFound('Academic year not found');
  }
  if (body.status) {
    const allowed = EXAM_STATUSES as readonly string[];
    const next = String(body.status).toUpperCase();
    if (!allowed.includes(next)) {
      throw unprocessable(`Unknown exam status "${body.status}"`, { allowed: EXAM_STATUSES });
    }
    // A COMPLETED or RESULTS_PUBLISHED exam cannot be edited back into shape:
    // the papers have been sat and marked.
    if ((exam.status === 'COMPLETED' || exam.status === 'RESULTS_PUBLISHED')
      && next !== exam.status && next !== 'COMPLETED') {
      throw unprocessable(
        `A ${exam.status} exam cannot be moved back to ${next} — the papers have already been sat`,
        { current: exam.status, requested: next },
      );
    }
  }
  const updated = await prisma.exam.update({
    where: { id: examId },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.semester ? { semester: body.semester } : {}),
      ...(body.academicYearId ? { academicYearId: body.academicYearId } : {}),
      ...(body.status ? { status: String(body.status).toUpperCase() } : {}),
    },
  });
  await writeAudit({
    institutionId, actorUserId, action: 'exam.updated', entityType: 'Exam', entityId: examId,
  });
  return updated;
}

export async function addSlot(
  institutionId: string,
  actorUserId: string,
  examId: string,
  body: { offeringId: string; date: string; startTime: string; endTime: string; seats?: number },
) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, institutionId } });
  if (!exam) throw notFound('Exam not found');
  if (exam.status === 'COMPLETED' || exam.status === 'RESULTS_PUBLISHED') {
    throw unprocessable(`Cannot add a slot to a ${exam.status} exam`, { status: exam.status });
  }

  // THE TENANT FIX. The old lookup was `where: { id: body.offeringId }` with no
  // institution filter, so another college's offering could be scheduled here.
  const offering = await prisma.courseOffering.findFirst({
    where: offeringWhere(institutionId, body.offeringId),
    include: { course: true, section: true, enrollments: true },
  });
  if (!offering) throw notFound('Course offering not found');

  const { minutes } = validateWindow(body.startTime, body.endTime);
  const date = parseExamDate(body.date);

  // Default the seat count to the number of students actually enrolled, not to
  // a constant. The old code wrote `offering.enrollments.length ?? 30` against an
  // include that never fetched enrollments — so it was always `undefined ?? 30`,
  // and every paper was declared to seat 30 people regardless of its roll.
  const enrolled = offering.enrollments.filter((e) => e.status === 'ACTIVE').length;

  // The row AS IT WOULD BE, pre-checked before anything is written. The id is a
  // placeholder that only has to be stable and unique within this call.
  const proposedId = `pending-${offering.id}-${body.date}-${body.startTime}`;
  await preflight(institutionId, [{
    id: proposedId,
    examId,
    offeringId: offering.id,
    date,
    startTime: body.startTime,
    endTime: body.endTime,
    room: null,
    seats: body.seats ?? Math.max(enrolled, 1),
    status: 'SCHEDULED',
    exam: {
      id: exam.id, institutionId, name: exam.name, semester: exam.semester,
      type: exam.type, status: exam.status, academicYearId: exam.academicYearId,
    },
    offering: {
      id: offering.id, teacherUserId: offering.teacherUserId,
      course: offering.course, section: offering.section,
      enrollments: offering.enrollments.map((e) => ({
        id: e.id, studentProfileId: e.studentProfileId, status: e.status,
      })),
    },
    roomAllocations: [],
  }], proposedId);

  const slot = await prisma.examSlot.create({
    data: {
      examId,
      offeringId: offering.id,
      date,
      startTime: body.startTime,
      endTime: body.endTime,
      seats: body.seats ?? Math.max(enrolled, 1),
      status: 'SCHEDULED',
    },
  });
  // Guarded by exactly the same engine as every other write, and BEFORE the
  // write, so a refused slot leaves nothing behind.
  await refreshConflicts(institutionId, actorUserId, [examId]);
  await writeAudit({
    institutionId, actorUserId, action: 'exam.slot.added', entityType: 'ExamSlot', entityId: slot.id,
      after: { durationMinutes: minutes, examId },
  });
  return slot;
}

/**
 * Move a slot.
 *
 * This is the function the old module got most wrong: it had NO conflict check
 * at all, so the operation a controller reaches for precisely when something is
 * wrong was the one operation that could make it worse — including moving a
 * paper outside its exam, which nothing checked either.
 */
export async function rescheduleSlot(
  institutionId: string,
  actorUserId: string,
  slotId: string,
  body: { date?: string; startTime?: string; endTime?: string; seats?: number },
) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: examWhere(institutionId) },
    include: { exam: true },
  });
  if (!slot) throw notFound('Exam slot not found');
  if (slot.exam.status === 'COMPLETED' || slot.exam.status === 'RESULTS_PUBLISHED') {
    throw unprocessable(`Cannot reschedule a slot on a ${slot.exam.status} exam`, {
      status: slot.exam.status,
    });
  }

  const startTime = body.startTime ?? slot.startTime;
  const endTime = body.endTime ?? slot.endTime;
  // Validated even when the caller changed only the date: a slot that already
  // holds an inverted window must not survive a move.
  validateWindow(startTime, endTime);
  const date = body.date ? parseExamDate(body.date) : slot.date;

  const current = (await loadSlots(institutionId)).find((x) => x.id === slotId);
  if (!current) throw notFound('Exam slot not found');
  await preflight(
    institutionId,
    [proposeSlot(current, {
      date,
      startTime,
      endTime,
      status: 'RESCHEDULED',
      ...(body.seats ? { seats: body.seats } : {}),
    })],
    slotId,
  );

  const updated = await prisma.examSlot.update({
    where: { id: slotId },
    data: {
      date,
      startTime,
      endTime,
      ...(body.seats ? { seats: body.seats } : {}),
      status: 'RESCHEDULED',
    },
  });
  await refreshConflicts(institutionId, actorUserId, [slot.examId]);
  await writeAudit({
    institutionId, actorUserId, action: 'exam.slot.rescheduled', entityType: 'ExamSlot',
    entityId: slotId, after: { from: { date: dayKey(slot.date), startTime: slot.startTime }, to: { date: dayKey(date), startTime } },
  });
  return updated;
}

export async function deleteSlot(
  institutionId: string,
  actorUserId: string,
  slotId: string,
) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: examWhere(institutionId) },
    include: { exam: true, roomAllocations: true, hallTickets: true, results: true },
  });
  if (!slot) throw notFound('Exam slot not found');
  if (slot.results.length > 0) {
    throw unprocessable('This slot has results against it and cannot be deleted', {
      results: slot.results.length,
    });
  }
  // Explicit order: these relations do not cascade.
  await prisma.examRoomAllocation.deleteMany({ where: { examSlotId: slotId } });
  await prisma.hallTicket.deleteMany({ where: { examSlotId: slotId } });
  await prisma.examSlot.delete({ where: { id: slotId } });
  await refreshConflicts(institutionId, actorUserId, [slot.examId]);
  await writeAudit({
    institutionId, actorUserId, action: 'exam.slot.deleted', entityType: 'ExamSlot', entityId: slotId,
  });
  return { deleted: true, slotId };
}

/**
 * Allocate a venue to a slot.
 *
 * The old version took `roomId` as an opaque string and created the row without
 * checking the venue existed, belonged to this institution, or was free. All
 * three are checked here, and the capacity shortfall is recorded as a MEDIUM
 * clash rather than refused — the agreed policy, because splitting a large
 * paper across two venues has to remain a thing the controller can actually do.
 */
export async function allocateVenue(
  institutionId: string,
  actorUserId: string,
  slotId: string,
  body: { venueId: string; invigilatorUserId?: string | null },
) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: examWhere(institutionId) },
    include: { exam: true },
  });
  if (!slot) throw notFound('Exam slot not found');

  const venue = await prisma.venue.findFirst({ where: { id: body.venueId, institutionId } });
  if (!venue) {
    throw notFound('Venue not found for this institution');
  }

  if (body.invigilatorUserId) {
    const invigilator = await prisma.user.findFirst({
      where: { id: body.invigilatorUserId, institutionId, deletedAt: null },
      select: { id: true },
    });
    if (!invigilator) throw notFound('Invigilator not found for this institution');
  }

  const existing = await prisma.examRoomAllocation.findFirst({
    where: { examSlotId: slotId, roomId: body.venueId },
  });
  if (existing) throw conflict('This venue is already allocated to this slot');

  const current = (await loadSlots(institutionId)).find((x) => x.id === slotId);
  if (!current) throw notFound('Exam slot not found');
  await preflight(institutionId, [proposeSlot(current, {
    roomAllocations: [...current.roomAllocations, {
      id: 'pending-allocation', roomId: body.venueId,
      invigilatorUserId: body.invigilatorUserId ?? null,
    }],
  })], slotId);

  const allocation = await prisma.examRoomAllocation.create({
    data: {
      examSlotId: slotId,
      roomId: body.venueId,
      invigilatorUserId: body.invigilatorUserId ?? null,
    },
  });
  await refreshConflicts(institutionId, actorUserId, [slot.examId]);
  await writeAudit({
    institutionId, actorUserId, action: 'exam.venue.allocated', entityType: 'ExamRoomAllocation',
    entityId: allocation.id, after: { slotId, venueId: body.venueId },
  });
  return allocation;
}

/** Assign or change an invigilator on an existing allocation. */
export async function assignInvigilator(
  institutionId: string,
  actorUserId: string,
  allocationId: string,
  body: { invigilatorUserId?: string | null },
) {
  const allocation = await prisma.examRoomAllocation.findFirst({
    where: { id: allocationId, examSlot: { exam: examWhere(institutionId) } },
    include: { examSlot: { include: { exam: true } } },
  });
  if (!allocation) throw notFound('Room allocation not found');

  if (body.invigilatorUserId) {
    const invigilator = await prisma.user.findFirst({
      where: { id: body.invigilatorUserId, institutionId, deletedAt: null },
      select: { id: true },
    });
    if (!invigilator) throw notFound('Invigilator not found for this institution');
  }
  const current = (await loadSlots(institutionId)).find((x) => x.id === allocation.examSlotId);
  if (!current) throw notFound('Exam slot not found');
  await preflight(institutionId, [proposeSlot(current, {
    roomAllocations: current.roomAllocations.map((a) => (
      a.id === allocationId ? { ...a, invigilatorUserId: body.invigilatorUserId ?? null } : a
    )),
  })], allocation.examSlotId);

  const updated = await prisma.examRoomAllocation.update({
    where: { id: allocationId },
    data: { invigilatorUserId: body.invigilatorUserId ?? null },
  });
  await refreshConflicts(institutionId, actorUserId, [allocation.examSlot.examId]);
  await writeAudit({
    institutionId, actorUserId, action: 'exam.invigilator.assigned', entityType: 'ExamRoomAllocation',
    entityId: allocationId, after: { invigilatorUserId: body.invigilatorUserId ?? null },
  });
  return updated;
}

/**
 * Publish an exam — REFUSED while any HIGH clash is unresolved.
 *
 * The agreed policy: a hard clash stops the timetable going out, because a
 * student told to sit two papers at once is a real person losing an afternoon.
 * MEDIUM and LOW are shown on the calendar and do not block, because a room
 * overlap is usually the next step of splitting a paper rather than a mistake.
 */
export async function publishExam(
  institutionId: string,
  actorUserId: string,
  examId: string,
) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, institutionId },
    include: { examSlots: true },
  });
  if (!exam) throw notFound('Exam not found');
  if (exam.examSlots.length === 0) {
    throw unprocessable('This exam has no slots yet, so there is nothing to publish', {
      slots: 0,
    });
  }
  //
  // NO EARLY RETURN ON `alreadyPublished`.
  //
  // The obvious shortcut — "it is already PUBLISHED, nothing to do, return ok" —
  // makes the endpoint answer a question it is not being asked. The realistic
  // sequence is: the timetable goes out, then somebody is pulled off duty. That
  // caller asks "can this go out?" and gets "yes it already did", which is a
  // true statement about the past and useless about the present. So the gate is
  // re-evaluated every time, and `alreadyPublished` is reported ALONGSIDE the
  // real answer rather than instead of it.
  const blocks = await conflictsBlock(institutionId, examId);
  if (!blocks.publishable) {
    throw unprocessable(blocks.blockReason ?? 'Unresolved clashes', {
      policy: THRESHOLDS.publishPolicy,
      high: blocks.kinds
        .filter((k) => k.severity === 'HIGH' && k.count > 0)
        .map((k) => ({ kind: k.kind, count: k.count, items: k.items })),
    });
  }

  const alreadyPublished = exam.status === 'PUBLISHED';
  const updated = alreadyPublished
    ? exam
    : await prisma.exam.update({ where: { id: examId }, data: { status: 'PUBLISHED' } });
  if (!alreadyPublished) {
    await prisma.examSlot.updateMany({ where: { examId }, data: { status: 'SCHEDULED' } });
  }
  await writeAudit({
    institutionId, actorUserId, action: 'exam.published', entityType: 'Exam', entityId: examId,
      after: { slots: exam.examSlots.length },
  });
  return { ...updated, publishable: true, alreadyPublished };
}

/** Mark a slot done. Exam-level so the paper cannot be sat twice. */
export async function completeSlot(
  institutionId: string,
  actorUserId: string,
  slotId: string,
) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: examWhere(institutionId) },
    include: { exam: true },
  });
  if (!slot) throw notFound('Exam slot not found');
  if (slot.status === 'CANCELLED') {
    throw unprocessable('A cancelled slot cannot be completed', { status: slot.status });
  }
  const updated = await prisma.examSlot.update({ where: { id: slotId }, data: { status: 'COMPLETED' } });
  await writeAudit({
    institutionId, actorUserId, action: 'exam.slot.completed', entityType: 'ExamSlot', entityId: slotId,
  });
  return updated;
}