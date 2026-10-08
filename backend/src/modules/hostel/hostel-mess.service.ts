/**
 * Mess: menu, meal attendance, feedback, analytics and mess spend.
 *
 * WHY THIS IS ITS OWN FILE
 * ------------------------
 * `hostel.service.ts` held a 50-line `getMess` that read three tables and computed two wrong
 * numbers. The interesting parts of this feature - what counts as "today", what a participation
 * rate means, who is allowed to mark a roll - belong next to the rules in `hostel-mess.rules.ts`,
 * the same way gate passes and visitors do. The dashboard still needs one aggregate of mess
 * feedback, so `hostel.service.ts` re-exports a narrow `getMess` rather than duplicating queries.
 *
 * THE WRITE PATH THAT DID NOT EXIST
 * ---------------------------------
 * `MealAttendance` and `MessFeedback` were WRITE-NEVER across the whole backend: nothing outside
 * the seeder created them, so "meal participation" and "student feedback" were two tables that
 * could only ever hold demo data. Every write in this file is new, which is why the roll is
 * careful about three things - whose students may be marked, what happens on a re-mark, and that a
 * mark records who made it.
 */
import { prisma } from '../../db/prisma.js';
import { notFound, unprocessable, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
// The fiscal-year rule belongs to Accounts (`expenses.money.ts`), which is the module that owns
// money. Imported here so the mess screen and the budget screen cannot disagree about which year a
// claim falls in.
import { fiscalYearOf } from '../accounts/expenses.money.js';
import {
  MEALS,
  type Meal,
  dayRange,
  localToday,
  parseDay,
  dayIndex,
  dayKey,
  clampWindow,
  participationRate,
  windowedRating,
  isMeal,
} from './hostel-mess.rules.js';

/** Residents are the denominator of every participation figure, so they come from bed inventory. */
async function residentsOf(institutionId: string) {
  return prisma.hostelAllocation.findMany({
    where: {
      status: 'ACTIVE',
      bed: { room: { block: { institutionId } } },
    },
    select: {
      studentProfileId: true,
      studentProfile: {
        select: {
          id: true,
          rollNo: true,
          user: { select: { id: true, fullName: true } },
        },
      },
      bed: { select: { room: { select: { block: { select: { name: true } } } } } },
    },
  });
}

/** One menu row as the client receives it. `itemsJson` is stored, never trusted on read. */
function shapeMenu(m: { id: string; dayOfWeek: number; meal: string; itemsJson: string; isVeg: boolean }) {
  let items: string[] = [];
  try {
    const parsed = JSON.parse(m.itemsJson);
    if (Array.isArray(parsed)) items = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    // A hand-edited or corrupted row must not take the whole week's menu down.
    items = [];
  }
  return { id: m.id, dayOfWeek: m.dayOfWeek, meal: m.meal, items, isVeg: m.isVeg };
}

// ── Read: the warden's mess screen ──────────────────────────────

export async function getMess(institutionId: string) {
  const today = localToday();
  const range = dayRange(today);

  const [menu, residents, todayAttendance, ratingAgg, recentFeedback] = await Promise.all([
    prisma.messMenuItem.findMany({
      where: { institutionId },
      orderBy: [{ dayOfWeek: 'asc' }, { meal: 'asc' }],
    }),
    residentsOf(institutionId),
    // RANGE, never `date: today` equality. This is the bug this file exists to not repeat.
    prisma.mealAttendance.findMany({
      where: { institutionId, date: { gte: range.gte, lt: range.lt } },
      select: { meal: true, studentProfileId: true },
    }),
    // The average is an aggregate over the whole window, NOT an average of the page of comments
    // below. Averaging `take: 15` rows is what produced the old "Weekly Rating" that was actually
    // "however many opinions arrived most recently".
    prisma.messFeedback.aggregate({
      where: { institutionId, mealDate: { gte: range.gte, lt: range.lt } },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.messFeedback.findMany({
      where: { institutionId, mealDate: { gte: range.gte, lt: range.lt } },
      orderBy: { mealDate: 'desc' },
      take: 15,
    }),
  ]);

  const residentCount = residents.length;
  const attendanceToday = MEALS.map((meal) => {
    const present = todayAttendance.filter((a) => a.meal === meal).length;
    return {
      meal,
      present,
      residents: residentCount,
      // null (not 0) for an empty hostel - 0/0 is not 0%.
      ratePct: participationRate(present, residentCount),
    };
  });

  const rating = {
    average: ratingAgg._avg.rating == null ? null : Math.round(ratingAgg._avg.rating * 10) / 10,
    responses: ratingAgg._count,
  };

  return {
    today: dayKey(today),
    todayDayOfWeek: dayIndex(today),
    menu: menu.map(shapeMenu),
    // From bed inventory, unconditionally. Not `attendance.length > 0 ? ... : 0`.
    residents: residentCount,
    attendanceToday,
    ratingWindowDays: 1,
    avgRating: rating.average,
    ratingResponses: rating.responses,
    feedback: recentFeedback.slice(0, 15).map((f) => ({
      id: f.id,
      studentProfileId: f.studentProfileId,
      meal: f.meal,
      mealDate: f.mealDate,
      rating: f.rating,
      comment: f.comment,
    })),
  };
}

/** The weekly menu on its own, for the editor. */
export async function getMessMenu(institutionId: string) {
  const rows = await prisma.messMenuItem.findMany({
    where: { institutionId },
    orderBy: [{ dayOfWeek: 'asc' }, { meal: 'asc' }],
  });
  return rows.map(shapeMenu);
}

export async function setMessMenu(
  userId: string,
  institutionId: string,
  body: { dayOfWeek: number; meal: Meal; items: string[]; isVeg: boolean },
) {
  if (body.dayOfWeek < 0 || body.dayOfWeek > 6) throw badRequest('dayOfWeek must be 0 (Sun) to 6 (Sat)');
  if (body.items.length === 0) throw unprocessable('A meal needs at least one dish');
  // A menu of only non-veg dishes cannot honestly be flagged vegetarian. Without this the
  // `isVeg` flag is a free-text label the cook cannot trust, which is worse than not having it.
  if (body.isVeg && body.items.some((i) => /\b(chicken|mutton|beef|pork|fish|egg|prawn)\b/i.test(i))) {
    throw unprocessable('A vegetarian menu cannot list chicken, mutton, beef, pork, fish, egg or prawn');
  }

  const itemsJson = JSON.stringify(body.items);
  const existing = await prisma.messMenuItem.findFirst({
    where: { institutionId, dayOfWeek: body.dayOfWeek, meal: body.meal },
  });

  // `isVeg` was previously never written on update, so the flag silently kept its seeded value
  // forever and the UI toggle did nothing.
  const row = existing
    ? await prisma.messMenuItem.update({
        where: { id: existing.id },
        data: { itemsJson, isVeg: body.isVeg },
      })
    : await prisma.messMenuItem.create({
        data: { institutionId, dayOfWeek: body.dayOfWeek, meal: body.meal, itemsJson, isVeg: body.isVeg },
      });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.mess.menu.set',
    entityType: 'MessMenuItem',
    entityId: row.id,
    after: { dayOfWeek: body.dayOfWeek, meal: body.meal, items: body.items, isVeg: body.isVeg },
  });

  return shapeMenu(row);
}

// ── Write: the roll ─────────────────────────────────────────────

/**
 * Mark one meal for a set of residents. Authoritative, warden-side, idempotent.
 *
 * Three decisions worth stating:
 *
 * 1. THE MARKER IS NOT A CLAIM. Residents do not tap in; mess staff call the roll. So this is a
 *    measurement, and it records `markedByUserId` so a disputed count has an author.
 * 2. A RE-MARK REPLACES, it does not accumulate. Marking a roll twice (a late arrival, a
 *    correction) must not need the caller to diff against what was already there. Absent students
 *    have their rows deleted for that meal; present ones are upserted. That makes the endpoint
 *    safe to retry, which matters because it is the one write a warden may repeat while standing
 *    at a counter.
 * 3. ONLY THIS INSTITUTION'S RESIDENTS MAY BE MARKED. The ids come from the body, so without an
 *    explicit check a warden could mark an arbitrary student - including one from another college -
 *    present for a meal they never attended. Unknown ids are rejected rather than skipped: a
 *    silent skip would let a roll save "23 of 24" because one id was wrong, which reads as a real
 *    number.
 */
export async function markMealAttendance(
  userId: string,
  institutionId: string,
  body: { date?: string; meal: Meal; presentStudentProfileIds: string[] },
) {
  const day = body.date ? parseDay(body.date) : localToday();
  if (!day) throw unprocessable('Give a real calendar date as YYYY-MM-DD');

  const ids = [...new Set(body.presentStudentProfileIds)];
  if (ids.length === 0) throw unprocessable('Mark at least one resident, or clear the meal explicitly');

  const residents = await residentsOf(institutionId);
  const valid = new Set(residents.map((r) => r.studentProfileId));
  const unknown = ids.filter((id) => !valid.has(id));
  if (unknown.length > 0) {
    throw unprocessable(
      `${unknown.length} of those ${ids.length} students are not residents of this hostel`,
      { unknown },
    );
  }

  const range = dayRange(day);

  // Replace semantics, one transaction: the result is the caller's list, whatever was there.
  const marked = await prisma.$transaction(async (tx) => {
    await tx.mealAttendance.deleteMany({
      where: { institutionId, date: { gte: range.gte, lt: range.lt }, meal: body.meal, studentProfileId: { notIn: ids } },
    });
    for (const id of ids) {
      await tx.mealAttendance.upsert({
        where: { institutionId_date_meal_studentProfileId: { institutionId, date: range.gte, meal: body.meal, studentProfileId: id } },
        create: { institutionId, date: range.gte, meal: body.meal, studentProfileId: id, count: 1, markedByUserId: userId },
        update: { count: 1, markedByUserId: userId },
      });
    }
    return ids.length;
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.mess.attendance.mark',
    entityType: 'MealAttendance',
    entityId: `${dayKey(day)}:${body.meal}`,
    after: { date: dayKey(day), meal: body.meal, present: marked, residents: residents.length },
  });

  return {
    date: dayKey(day),
    meal: body.meal,
    present: marked,
    residents: residents.length,
    ratePct: participationRate(marked, residents.length),
  };
}

/**
 * The roll for one meal: residents, who is present, and who is not.
 *
 * RETURNED BY `getRoll` AND `getAbsent` SO THEY CANNOT DISAGREE. They used to compute `present`
 * two different ways — `getRoll` counted the INTERSECTION of residents and marked rows while
 * `getAbsent` reported the raw size of the marked set — so on a meal where attendance existed for
 * a student who had since vacated their bed, the roll screen said 22 and the absent screen said 24
 * for the same meal on the same day. Two screens disagreeing about one fact is worse than either
 * number being wrong, because the warden cannot tell which to trust.
 *
 * `unmatched` is why that can happen, so it is REPORTED rather than folded away. It counts
 * attendance rows for students who are not currently allocated a bed - stale history from before
 * they moved out. `markMealAttendance` refuses non-resident ids, so this can only shrink over time,
 * and the count tells a warden the ledger needs attention rather than letting it quietly inflate a
 * participation figure.
 */
async function rollFor(institutionId: string, day: Date, meal: Meal) {
  const range = dayRange(day);
  const [residents, marked] = await Promise.all([
    residentsOf(institutionId),
    prisma.mealAttendance.findMany({
      where: { institutionId, date: { gte: range.gte, lt: range.lt }, meal },
      select: { studentProfileId: true },
    }),
  ]);
  const present = new Set(marked.map((m) => m.studentProfileId));
  const presentResidentIds = new Set(
    residents.map((r) => r.studentProfileId).filter((id) => present.has(id)),
  );
  const unmatched = [...present].filter((id) => !presentResidentIds.has(id));

  return { residents, presentResidentIds, unmatched };
}

/** The residents a warden marks from, with who already ate this meal. One call for the roll screen. */
export async function getRoll(
  institutionId: string,
  date: string | undefined,
  meal: Meal,
) {
  const day = date ? parseDay(date) : localToday();
  if (!day) throw unprocessable('Give a real calendar date as YYYY-MM-DD');

  const { residents, presentResidentIds, unmatched } = await rollFor(institutionId, day, meal);
  const present = presentResidentIds.size;

  return {
    date: dayKey(day),
    meal,
    residents: residents.length,
    present,
    ratePct: participationRate(present, residents.length),
    // Stale rows for students who have vacated. 0 in normal operation.
    unmatchedAttendance: unmatched.length,
    rows: residents.map((r) => ({
      studentProfileId: r.studentProfileId,
      name: r.studentProfile.user.fullName,
      rollNo: r.studentProfile.rollNo,
      block: r.bed.room.block.name,
      present: presentResidentIds.has(r.studentProfileId),
    })),
  };
}

/** Who ate what, day by day. The log behind the roll, so a warden can answer "who skipped Tuesday". */
export async function getAttendanceLog(
  institutionId: string,
  from: string | undefined,
  to: string | undefined,
) {
  const window = clampWindow(from, to);
  const residents = (await residentsOf(institutionId)).length;
  const rows = await prisma.mealAttendance.findMany({
    where: { institutionId, date: { gte: window.gte, lt: window.lt } },
    select: { date: true, meal: true, studentProfileId: true },
  });

  // Grouped in memory by day key: the row count is small (residents × meals × days) and this
  // avoids a second aggregation query that would have to normalise the same dates again.
  const byDay = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const key = dayKey(r.date);
    let meals = byDay.get(key);
    if (!meals) {
      meals = { BREAKFAST: 0, LUNCH: 0, DINNER: 0 };
      byDay.set(key, meals);
    }
    meals[r.meal] = (meals[r.meal] ?? 0) + 1;
  }

  const days = [...byDay.entries()]
    .map(([date, meals]) => ({
      date,
      meals: MEALS.map((meal) => ({
        meal,
        present: meals[meal] ?? 0,
        ratePct: participationRate(meals[meal] ?? 0, residents),
      })),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totals = MEALS.map((meal) => {
    const total = days.reduce((n, d) => n + (d.meals.find((m) => m.meal === meal)?.present ?? 0), 0);
    return { meal, present: total, ratePct: participationRate(total, residents * days.length) };
  });

  return { from: dayKey(window.gte), to: dayKey(window.lt), residents, days, totals };
}

/**
 * Participation and satisfaction over a window.
 *
 * Every rate here is `present / (residents × days)`, i.e. against the OPPORTUNITY to eat, not
 * against "however many days had data". Dividing by the number of days that happen to have rows
 * would make a sparsely-marked fortnight look like a busier mess than a fully-marked one.
 */
export async function getMessAnalytics(
  institutionId: string,
  from: string | undefined,
  to: string | undefined,
) {
  const window = clampWindow(from, to);
  const residents = (await residentsOf(institutionId)).length;

  const [attendance, feedback] = await Promise.all([
    prisma.mealAttendance.findMany({
      where: { institutionId, date: { gte: window.gte, lt: window.lt } },
      select: { date: true, meal: true },
    }),
    prisma.messFeedback.findMany({
      where: { institutionId, mealDate: { gte: window.gte, lt: window.lt } },
      select: { mealDate: true, meal: true, rating: true },
    }),
  ]);

  const opportunities = residents * window.days;

  const byMeal = MEALS.map((meal) => {
    const present = attendance.filter((a) => a.meal === meal).length;
    const ratings = feedback.filter((f) => f.meal === meal).map((f) => ({ rating: f.rating }));
    const r = windowedRating(ratings);
    return {
      meal,
      present,
      ratePct: participationRate(present, opportunities),
      avgRating: r.average,
      ratingResponses: r.responses,
    };
  });

  // Which day of the week is worst. A mess is staffed and stocked by weekday, so this is the
  // question the analytics exist to answer.
  const byWeekday = Array.from({ length: 7 }, () => ({ present: 0, days: 0, ratings: [] as number[] }));
  for (const a of attendance) {
    byWeekday[dayIndex(a.date)].present++;
    byWeekday[dayIndex(a.date)].days++;
  }
  for (const f of feedback) byWeekday[dayIndex(f.mealDate)].ratings.push(f.rating);

  const weekdaySummary = byWeekday.map((w, idx) => {
    const r = windowedRating(w.ratings.map((rating) => ({ rating })));
    return {
      dayOfWeek: idx,
      present: w.present,
      // A weekday with no ratings reports none rather than a flattering 0.
      avgRating: r.average,
      ratingResponses: r.responses,
      ratePct: participationRate(w.present, w.days),
    };
  });

  const overall = windowedRating(feedback.map((f) => ({ rating: f.rating })));

  return {
    from: dayKey(window.gte),
    to: dayKey(window.lt),
    days: window.days,
    residents,
    opportunities,
    byMeal,
    byWeekday: weekdaySummary,
    overall: { avgRating: overall.average, responses: overall.responses },
  };
}

/** The residents of one day who did NOT eat a given meal. The "who do I chase" list. */
export async function getAbsent(
  institutionId: string,
  date: string | undefined,
  meal: Meal,
) {
  const day = date ? parseDay(date) : localToday();
  if (!day) throw unprocessable('Give a real calendar date as YYYY-MM-DD');

  // Same helper as `getRoll`, so `present` here is the SAME number the roll screen shows.
  const { residents, presentResidentIds, unmatched } = await rollFor(institutionId, day, meal);
  const absent = residents.filter((r) => !presentResidentIds.has(r.studentProfileId));

  return {
    date: dayKey(day),
    meal,
    absent: absent.length,
    present: presentResidentIds.size,
    residents: residents.length,
    ratePct: participationRate(presentResidentIds.size, residents.length),
    unmatchedAttendance: unmatched.length,
    rows: absent.map((r) => ({
      studentProfileId: r.studentProfileId,
      name: r.studentProfile.user.fullName,
      rollNo: r.studentProfile.rollNo,
      block: r.bed.room.block.name,
    })),
  };
}

// ── Feedback ───────────────────────────────────────────────────

/** Every rating this hostel has received in a window, newest first, with the rater's name. */
export async function listMessFeedback(
  institutionId: string,
  from: string | undefined,
  to: string | undefined,
  take = 50,
) {
  const window = clampWindow(from, to);

  // The average is an AGGREGATE over the whole window, computed by the database, and it is
  // deliberately a separate query from the page of rows.
  //
  // This is the exact bug the original `getMess` had, one level down: it took `take: 15` and then
  // averaged those 15 rows, so the "weekly rating" was really "the average of whichever opinions
  // happened to arrive last". Doing it here would mean the same average changes depending on how
  // many rows the client asked for — paging 5 rows would report a different kitchen from paging 50.
  const [agg, rows] = await Promise.all([
    prisma.messFeedback.aggregate({
      where: { institutionId, mealDate: { gte: window.gte, lt: window.lt } },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.messFeedback.findMany({
      where: { institutionId, mealDate: { gte: window.gte, lt: window.lt } },
      include: { studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } } },
      orderBy: [{ mealDate: 'desc' }, { createdAt: 'desc' }],
      take,
    }),
  ]);

  return {
    from: dayKey(window.gte),
    to: dayKey(window.lt),
    // `null` when nobody answered, not 0 - "rated 0 out of 5" would be a false statement.
    avgRating: agg._avg.rating == null ? null : Math.round(agg._avg.rating * 10) / 10,
    responses: agg._count,
    returned: rows.length,
    rows: rows.map((f) => ({
      id: f.id,
      student: f.studentProfile.user.fullName,
      rollNo: f.studentProfile.rollNo,
      meal: f.meal,
      mealDate: f.mealDate,
      rating: f.rating,
      comment: f.comment,
    })),
  };
}

/** Ask every resident for their opinion. Deep-links to the student's own mess screen. */
export async function sendMessSurvey(userId: string, institutionId: string, meal?: Meal) {
  const residents = await residentsOf(institutionId);
  const recipientIds = residents.map((r) => r.studentProfile.user.id);
  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'HOSTEL',
        title: 'Rate your meal',
        body: meal
          ? `Tell us what you thought of ${meal.toLowerCase()}. Your rating shapes next week's menu.`
          : "Tell us what you thought of today's meals. Your rating shapes next week's menu.",
        sourceModule: 'hostel',
        dataJson: JSON.stringify({ screen: 'Mess', action: 'rate', meal: meal ?? null }),
      })),
    });
  }
  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.mess.survey.send',
    entityType: 'Notification',
    entityId: meal ?? 'ALL',
    after: { recipients: recipientIds.length, meal: meal ?? 'ALL' },
  });
  return { recipients: recipientIds.length };
}

// ── Student side ───────────────────────────────────────────────

/** Today (or a named day) of the menu, plus this student's own ratings for it. */
export async function getStudentMess(userId: string, institutionId: string, date?: string) {
  const studentProfile = await prisma.studentProfile.findFirst({
    where: { userId, institutionId },
    select: { id: true },
  });
  if (!studentProfile) throw notFound('No student profile for this account');

  const day = date ? parseDay(date) : localToday();
  if (!day) throw unprocessable('Give a real calendar date as YYYY-MM-DD');

  const range = dayRange(day);
  const dow = dayIndex(day);

  const [menu, mine] = await Promise.all([
    prisma.messMenuItem.findMany({
      where: { institutionId, dayOfWeek: dow },
      orderBy: { meal: 'asc' },
    }),
    prisma.messFeedback.findMany({
      where: { studentProfileId: studentProfile.id, mealDate: { gte: range.gte, lt: range.lt } },
    }),
  ]);

  const byMeal = new Map(mine.map((f) => [f.meal, f]));
  return {
    date: dayKey(day),
    dayOfWeek: dow,
    meals: MEALS.map((meal) => {
      const row = menu.find((m) => m.meal === meal);
      const rated = byMeal.get(meal);
      return {
        meal,
        items: row ? shapeMenu(row).items : [],
        isVeg: row?.isVeg ?? true,
        // Lets the screen show "you rated this" instead of an empty form the student has to
        // wonder about after their tap failed.
        myRating: rated?.rating ?? null,
        myComment: rated?.comment ?? null,
        ratedAt: rated?.updatedAt ?? null,
      };
    }),
  };
}

/**
 * Rate one meal. One rating per student per meal per day, and it can be edited.
 *
 * `upsert` rather than create-then-409, because a student who mis-taps should be able to correct it
 * and because a retried request over a flaky connection must not look like a duplicate. The unique
 * key on `(institutionId, mealDate, meal, studentProfileId)` is what makes this safe, and it is
 * why the previous `[mealDate, meal, studentProfileId]` key was widened.
 *
 * A day may only be rated if the meal is actually on the menu - otherwise the kitchen can be
 * reviewing opinions about a dish it never served.
 */
export async function rateMeal(
  userId: string,
  institutionId: string,
  body: { mealDate?: string; meal: Meal; rating: number; comment?: string },
) {
  const studentProfile = await prisma.studentProfile.findFirst({
    where: { userId, institutionId },
    select: { id: true },
  });
  if (!studentProfile) throw notFound('No student profile for this account');
  if (!isMeal(body.meal)) throw badRequest('meal must be BREAKFAST, LUNCH or DINNER');
  if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    throw unprocessable('Rate the meal from 1 to 5');
  }

  const day = body.mealDate ? parseDay(body.mealDate) : localToday();
  if (!day) throw unprocessable('Give a real calendar date as YYYY-MM-DD');

  const range = dayRange(day);
  const menuRow = await prisma.messMenuItem.findFirst({
    where: { institutionId, dayOfWeek: dayIndex(day), meal: body.meal },
    select: { id: true },
  });
  if (!menuRow) throw unprocessable('There is no menu for that meal on that day, so there is nothing to rate');

  const row = await prisma.messFeedback.upsert({
    where: {
      institutionId_mealDate_meal_studentProfileId: {
        institutionId,
        mealDate: range.gte,
        meal: body.meal,
        studentProfileId: studentProfile.id,
      },
    },
    create: {
      institutionId,
      studentProfileId: studentProfile.id,
      mealDate: range.gte,
      meal: body.meal,
      rating: body.rating,
      comment: body.comment?.trim() || null,
    },
    update: { rating: body.rating, comment: body.comment?.trim() || null },
  });

  return {
    id: row.id,
    date: dayKey(day),
    meal: row.meal,
    rating: row.rating,
    comment: row.comment,
    updatedAt: row.updatedAt,
  };
}

// ── Mess spend ─────────────────────────────────────────────────

/**
 * Mess money, delegated to Accounts rather than reimplemented.
 *
 * `Expense` is the institution's single ledger and it already has an approval workflow, budget
 * tracking, receipt upload and vendor aggregation. This feature needs those exact things for one
 * category, so it CALLS them. A hostel-local `mess_expenses` table would be a second source of
 * financial truth that could disagree with the budget an accountant approved.
 *
 * AUTHORISATION: reading or raising these requires `hostel.mess.expenses` (see the route). That
 * permission exists because the whole Accounts module is behind `requireRole('ACCOUNTS','ADMIN')`,
 * and giving the warden that role would also hand over payroll, fee waivers and scholarships.
 * Raising a claim still lands in `PENDING` for an ACCOUNTS user to approve - a warden proposes
 * spend, the accounts desk authorises it.
 */
export async function getMessExpenses(
  institutionId: string,
  from: string | undefined,
  to: string | undefined,
) {
  // Imported inside the function so this module's dependency on Accounts is explicit and visible,
  // rather than a top-level import that makes the coupling invisible in the file header.
  const { listExpenses, vendorSpend, monthlyTrend } = await import('../accounts/expenses.service.js');

  const window = clampWindow(from, to);
  // Accounts owns the fiscal-year rule; ask it rather than re-deriving a year boundary here, so a
  // change to that rule cannot leave the mess screen and the budget screen disagreeing.
  const fiscalYear = fiscalYearOf(window.gte);

  const [expenses, vendors, trend] = await Promise.all([
    listExpenses(institutionId, { category: 'MESS', take: 100, skip: 0 }),
    vendorSpend(institutionId, fiscalYear, 'MESS'),
    monthlyTrend(institutionId, 6, 'MESS'),
  ]);

  const rows = expenses.expenses ?? [];
  // `stats` comes from Accounts' own aggregation over the WHOLE filtered set, not from summing
  // the page that happens to be in hand - so the totals are right even though the list is paged.
  const stats = expenses.stats;

  return {
    from: dayKey(window.gte),
    to: dayKey(window.lt),
    fiscalYear,
    category: 'MESS',
    totalRupees: stats.totalRupees,
    // Split by status so a warden can see what is still awaiting the accounts desk instead of
    // treating a pending claim as money already spent.
    approvedRupees: stats.approvedRupees,
    pendingRupees: stats.pendingRupees,
    rejectedRupees: stats.rejectedRupees,
    claimCount: stats.approvedCount + stats.pendingCount + stats.rejectedCount,
    vendors: vendors.vendors,
    vendorTotals: vendors.totals,
    trend: trend.months,
    trendTotals: trend.totals,
    rows: rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      vendor: r.vendor,
      amountRupees: r.amountRupees,
      taxRupees: r.taxRupees,
      status: r.status,
      statusLabel: r.statusLabel,
      date: r.date,
      category: r.category,
      categoryLabel: r.categoryLabel,
      requestedBy: r.requestedBy,
      approvedBy: r.approvedBy,
      hasReceipt: r.hasReceipt,
    })),
  };
}

/** Raise a mess expense. Creates a PENDING claim for the accounts desk - see the note above. */
export async function raiseMessExpense(
  userId: string,
  institutionId: string,
  body: {
    amountMinor: number;
    title?: string;
    vendor?: string;
    note?: string;
    paymentMethod?: string;
    date?: string;
  },
) {
  const { createExpense } = await import('../accounts/expenses.service.js');
  // `category` is fixed HERE, not taken from the body. A warden can raise mess spend and nothing
  // else, whatever they put in the request.
  const row = await createExpense(institutionId, userId, { ...body, category: 'MESS' });
  return { ...row, category: 'MESS' };
}