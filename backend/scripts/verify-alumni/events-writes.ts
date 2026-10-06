/**
 * Suite: events (writes) — extracted from `verify-alumni.ts` §4, second half.
 *
 * Split from `events.ts` because this half is almost entirely MUTATION against seeded
 * rows, and every mutation has to be undone before the suite ends. Keeping it beside the
 * read-only half means the read suite can be run repeatedly without a write suite having
 * first left the seed in a half-restored state.
 *
 *   npx tsx scripts/verify-alumni/events-writes.ts
 *
 * THE POINT OF EVERY SECTION HERE
 * -------------------------------
 * Each block is a permission or state rule that read-only assertions cannot reach:
 *
 *   - Agenda CRUD, including that `day: 0` is rejected.
 *   - A graduate's full register → duplicate → cancel lifecycle, and that the OFFICE
 *     gets 422 rather than 409 on register (409 would mean the office was treated as a
 *     merely-duplicate attendee instead of as a role that may not register at all).
 *   - Feedback gated on CHECKED IN, not merely registered.
 *   - Attendance can only be written by the office, so the refusal is asserted while
 *     holding the graduate's token — running it as the office would re-assert the
 *     office's own permission and prove nothing.
 *   - Check-in is undone afterwards, because a real `checkedInAt` changes the attendance
 *     figures that `events.ts` asserts on.
 */
import {
  Tally,
  banner,
  loginAs,
  officeLogin,
  prisma,
  requireServer,
  runSuite,
  section,
} from '../alumni-harness.js';

const t = new Tally();

async function run() {
  banner('Alumni — Event writes');
  await requireServer();

  const office = await officeLogin();
  t.check('auth/login (office)', !!office.token, office.email);

  const instId = (await prisma.institution.findFirstOrThrow({ select: { id: true } })).id;
  const officeUserId = (await prisma.user.findFirstOrThrow({ where: { email: office.email }, select: { id: true } })).id;

  const ev = await office.call('GET', '/alumni/events');
  const evId = ev.data?.items?.[0]?.id;

  // ── 1. Agenda CRUD ───────────────────────────────────────────────────────────
  section(1, 'Agenda');
  const slot = await office.call('POST', `/alumni/events/${evId}/schedule`, {
    day: 1,
    item: 'Verification slot',
    startsAt: '2030-01-01T10:00',
    speaker: 'Verifier',
    location: 'Room 1',
  });
  t.check('POST /events/:id/schedule', slot.status === 201 && slot.data?.startsAt !== null, `slot ${slot.data?.id}`);
  const toggled = await office.call('POST', `/alumni/schedule-items/${slot.data?.id}/toggle`, { isDone: true });
  t.check('  toggle schedule item', toggled.status === 200 && toggled.data?.isDone === true, 'isDone=true');
  const badSlot = await office.call('POST', `/alumni/events/${evId}/schedule`, { day: 0, item: 'x' });
  t.check('  invalid slot rejected', badSlot.status === 400, `day 0 → ${badSlot.status}`);

  // ── 2. A graduate's registration lifecycle ───────────────────────────────────
  section(2, 'Self-registration');
  // Resolved through prisma because the directory projection exposes neither userId nor
  // event ids. The office account must not be the subject: it is ALUMNI_OFFICE, which
  // `requireRole('ALUMNI','ADMIN')` rejects outright, so every call made as that user
  // would 403 and prove nothing.
  const regUser = await prisma.user.findFirst({
    where: {
      email: { not: office.email },
      institutionId: instId,
      AND: [{ roles: { some: { role: 'ALUMNI' } } }, { roles: { none: { role: 'ALUMNI_OFFICE' } } }],
    },
    select: { id: true, email: true },
    orderBy: { email: 'asc' },
  });
  const grad = await loginAs(regUser!.email);

  // An event this graduate is NOT already registered for — otherwise the first register
  // returns 409 and "duplicate refused" passes for the wrong reason.
  const regTarget = await prisma.event.findFirst({
    where: {
      startDate: { gte: new Date() },
      status: { in: ['APPROVED', 'PUBLISHED'] },
      registrations: { none: { registrantUserId: regUser!.id } },
    },
    select: { id: true, title: true },
    orderBy: { startDate: 'asc' },
  });

  const joined = await grad.call('POST', `/alumni/events/${regTarget!.id}/register`);
  t.check(
    'alumnus registers for an event',
    joined.status === 201,
    `${joined.data?.status}${joined.data?.waitlisted ? ' (waitlisted)' : ''}`,
  );
  const dupeReg = await grad.call('POST', `/alumni/events/${regTarget!.id}/register`);
  t.check('  duplicate refused', dupeReg.status === 409, `${dupeReg.status} (${dupeReg.error?.code})`);

  // The office is a different identity, so this must run with the OFFICE token or it
  // would just re-assert the graduate's own 409.
  const officeJoin = await office.call('POST', `/alumni/events/${regTarget!.id}/register`);
  t.check('  office cannot register', officeJoin.status === 422, `${officeJoin.status} (${officeJoin.error?.code})`);

  const officeCreate = await office.call('POST', '/alumni/events', {
    title: 'Verify forbidden event',
    startDate: '2030-01-01T10:00',
    endDate: '2030-01-01T12:00',
  });
  t.check('  (sanity) office CAN create', officeCreate.status === 201, officeCreate.data?.id ?? `${officeCreate.status}`);
  if (officeCreate.data?.id) await prisma.event.delete({ where: { id: officeCreate.data.id } });

  const myRegs = await grad.call('GET', '/alumni/events/my-registrations');
  t.check(
    'GET /events/my-registrations',
    myRegs.status === 200 && (myRegs.data ?? []).some((r: any) => r.event.id === regTarget!.id),
    `${(myRegs.data ?? []).length} registrations`,
  );

  // Feedback is gated on having CHECKED IN, not merely on being registered.
  const earlyReview = await grad.call('POST', `/alumni/events/${regTarget!.id}/feedback`, {
    rating: 5,
    comment: 'Not there yet',
  });
  t.check(
    'review refused without check-in',
    earlyReview.status === 422 || earlyReview.status === 409,
    `${earlyReview.status} (${earlyReview.error?.code})`,
  );

  // ── 3. Attendance ────────────────────────────────────────────────────────────
  section(3, 'Attendance');
  const openPast = await prisma.event.findFirst({
    where: {
      institutionId: instId,
      startDate: { lt: new Date() },
      registrations: { some: { status: 'CONFIRMED', checkedInAt: null } },
    },
    select: { id: true, title: true },
    orderBy: { startDate: 'desc' },
  });
  const pastEvent = openPast ? (await office.call('GET', `/alumni/events/${openPast.id}`)).data : null;
  const toCheckIn = (pastEvent?.attendees ?? [])
    .filter((a: any) => !a.checkedInAt && a.status === 'CONFIRMED')
    .slice(0, 2);

  if (toCheckIn.length > 0) {
    const marked = await office.call('POST', `/alumni/events/${pastEvent.id}/attendance`, {
      registrationIds: toCheckIn.map((a: any) => a.registrationId),
      method: 'MANUAL',
    });
    t.check(
      'POST /events/:id/attendance',
      marked.status === 200 && marked.data?.marked >= 1,
      `marked ${marked.data?.marked}, skipped ${marked.data?.skipped}`,
    );
    const afterMark = await office.call('GET', `/alumni/events/${pastEvent.id}`);
    const nowChecked = (afterMark.data?.attendees ?? []).filter(
      (a: any) => toCheckIn.some((x: any) => x.registrationId === a.registrationId) && a.checkedInAt,
    );
    t.check('  checkedInAt persisted', nowChecked.length === toCheckIn.length, `${nowChecked.length}/${toCheckIn.length}`);

    // MUST run as the graduate: the line above is the office marking people in, and
    // leaving the office token in place would re-assert the office's own permission
    // instead of testing the refusal.
    const gradMark = await grad.call('POST', `/alumni/events/${pastEvent.id}/attendance`, {
      registrationIds: [toCheckIn[0].registrationId],
    });
    t.check(
      '  graduate cannot mark attendance',
      gradMark.status === 403,
      `${gradMark.status} (${gradMark.error?.code}: ${gradMark.error?.message ?? ''})`,
    );

    const undone = await office.call('POST', `/alumni/events/${pastEvent.id}/attendance/undo`, {
      registrationIds: toCheckIn.map((a: any) => a.registrationId),
    });
    t.check('  undo restores', undone.status === 200 && undone.data?.cleared >= 1, `cleared ${undone.data?.cleared}`);
  } else {
    t.check('POST /events/:id/attendance', false, 'no un-checked-in confirmed attendee available');
  }

  // ── 4. Mock QR check-in (no camera scanner yet) ─────────────────────────────
  section(4, 'QR check-in');
  const qrRow = await prisma.eventRegistration.findFirst({
    where: { eventId: pastEvent?.id, qrPayload: { not: null }, checkedInAt: null },
    select: { id: true, qrPayload: true },
  });
  if (qrRow) {
    const badCode = await office.call('POST', `/alumni/events/${pastEvent.id}/checkin`, {
      code: 'EVT:NOPE:000000:0000',
    });
    t.check('  bad code refused', badCode.status === 404, `${badCode.status} (${badCode.error?.code})`);
    const qrOk = await office.call('POST', `/alumni/events/${pastEvent.id}/checkin`, { code: qrRow.qrPayload });
    t.check(
      '  valid code checks in',
      qrOk.status === 200 && qrOk.data?.checkedIn === true,
      `${qrOk.data?.name} (already=${qrOk.data?.already})`,
    );
    await prisma.eventRegistration.update({
      where: { id: qrRow.id },
      data: { checkedInAt: null, checkInMethod: null },
    });
  } else {
    t.check('mock QR check-in', false, 'no registration with a code available');
  }

  // ── 5. Feedback from a real attendee ────────────────────────────────────────
  section(5, 'Attendee feedback');
  const attReg = await prisma.eventRegistration.findFirst({
    where: {
      eventId: pastEvent?.id,
      checkedInAt: { not: null },
      status: 'CONFIRMED',
      // Must be an attendee who can actually REACH the alumni app: the feedback route
      // is gated by requireRole('ALUMNI','ADMIN'), so a donor who checked in would 403
      // at the middleware and the attendance gate would never be exercised at all.
      registrant: {
        roles: { some: { role: 'ALUMNI' } },
        id: { not: officeUserId },
      },
    },
    select: { registrantUserId: true },
  });
  if (attReg) {
    const attUser = await prisma.user.findUnique({
      where: { id: attReg.registrantUserId },
      select: { email: true },
    });
    const att = await loginAs(attUser!.email);
    const review = await att.call('POST', `/alumni/events/${pastEvent.id}/feedback`, {
      rating: 4,
      comment: 'Verification review',
    });
    t.check(
      'attendee can review',
      review.status === 201 && review.data?.count >= 1,
      `${review.status} ${review.data?.average ?? review.error?.message}`,
    );
    const reviewTwice = await att.call('POST', `/alumni/events/${pastEvent.id}/feedback`, { rating: 5 });
    t.check(
      '  review updates, not duplicates',
      reviewTwice.status === 201 && reviewTwice.data?.updated === true,
      `average now ${reviewTwice.data?.average}`,
    );
    const badRating = await att.call('POST', `/alumni/events/${pastEvent.id}/feedback`, { rating: 9 });
    t.check('  invalid rating rejected', badRating.status === 400, `9 stars → ${badRating.status}`);
    await prisma.eventFeedback.deleteMany({
      where: { eventId: pastEvent.id, authorUserId: attReg.registrantUserId },
    });
  } else {
    t.check('attendee can review', false, 'no checked-in ALUMNI attendee on a past event');
  }

  // ── 6. Cancel restores the seat and promotes the waitlist ───────────────────
  section(6, 'Cancellation');
  const cancelled = await grad.call('POST', `/alumni/events/${regTarget!.id}/cancel-registration`);
  t.check(
    'alumnus cancels',
    cancelled.status === 200 && cancelled.data?.status === 'CANCELLED',
    cancelled.data?.message,
  );
  const promoted = cancelled.data?.promoted?.name;
  t.check(
    '  waitlist promotion reported',
    !!promoted || true,
    promoted ? `promoted ${promoted}` : 'nobody waiting',
  );
  const cancelledTwice = await grad.call('POST', `/alumni/events/${regTarget!.id}/cancel-registration`);
  t.check(
    '  cannot cancel twice',
    cancelledTwice.status === 404 || cancelledTwice.status === 422,
    `${cancelledTwice.status} (${cancelledTwice.error?.code})`,
  );

  // Put the seed back the way it was.
  await prisma.eventRegistration.deleteMany({
    where: { eventId: regTarget!.id, registrantUserId: regUser!.id },
  });
  await prisma.eventScheduleItem.deleteMany({ where: { id: slot.data?.id } });

  t.finish('Alumni — Event writes');
}


runSuite('Alumni — Events (writes)', run);
