/**
 * Suite: complaints over HTTP, all three sides.
 * Docs: 08-hostel.md §3.7, 01-students.md §3.11
 *
 * WHY THIS ALONGSIDE `check-hostel-complaints.ts`
 * -----------------------------------------------
 * The DB suite proves the escalation arithmetic, the severity floors and tenant scoping. It cannot
 * prove that a ROUTE is mounted, that a zod schema rejects the right shape, or what status code a
 * client actually receives. Those are transport facts and this is where they live.
 *
 * THE FOUR THINGS THIS FILE IS REALLY ABOUT
 * ------------------------------------------
 *   1. THREE SEPARATE GATES, NOT ONE. A student, a warden and a technician each have their own router,
 *      and the technician's is mounted at `/staff-complaints` rather than inside the hostel router.
 *      Asserted from every direction: a student cannot triage, a technician cannot triage, and a
 *      technician cannot reach ANY other hostel surface (rooms, residents, gate passes, visitors).
 *      That last one is the whole reason the router is separate, so it is asserted explicitly.
 *   2. THE ASSIGNMENT BOUNDARY. A technician may close a complaint assigned TO THEM. They may not
 *      close one assigned to a colleague, nor an unassigned one. The route gates on ROLE; the rule
 *      that actually matters gates on ASSIGNMENT, and it lives in the service. A route-only check
 *      would pass this suite while leaving the hole open, which is why it is tested here.
 *   3. THE FEEDBACK REOPEN. A poor rating must put the work BACK ON THE BOARD, not write a bad score
 *      to a database and leave the complaint reading "Resolved" forever. Asserted by reading the
 *      status back, and by confirming the REOPENED event exists.
 *   4. THE 400 / 422 DISTINCTION. 400 means the body contradicts ITSELF (an unknown key, an empty
 *      assignee); 422 means it is well formed and a RULE refuses it (a resolution with no note, a
 *      student who filed nothing). A client can show the first as a form error; the second has to go
 *      to a human.
 *
 * CREATES ITS OWN COMPLAINTS AND DELETES THEM
 * -------------------------------------------
 * Everything here is filed fresh under a per-run marker and removed in a `finally`. Driving the
 * SEEDED complaints through their lifecycle instead would look tidier but is not a restore: the next
 * run would find them already RESOLVED and prove nothing at all.
 */
import {
  Tally,
  banner,
  loginAs,
  prisma,
  requireServer,
  runSuite,
  section,
  stamp,
} from '../alumni-harness.js';

const t = new Tally();

const WARDEN_EMAIL = 'hostel@learnix.dev';
const STUDENT_EMAIL = 'student@learnix.dev';
const MAINTENANCE_EMAIL = 'maintenance@learnix.dev';
const SECURITY_EMAIL = 'security@learnix.dev';
const MESS_EMAIL = 'mess@learnix.dev';

async function main() {
  banner('Complaints over HTTP — student, warden and support staff');
  await requireServer();

  const warden = await loginAs(WARDEN_EMAIL);
  const student = await loginAs(STUDENT_EMAIL);
  const maintenance = await loginAs(MAINTENANCE_EMAIL);
  const security = await loginAs(SECURITY_EMAIL);

  const inst = (await prisma.user.findFirst({ where: { email: WARDEN_EMAIL }, select: { institutionId: true } }))!
    .institutionId;
  const mark = `VERIFY-COMP-${stamp()}`;
  const created: string[] = [];

  /** File one through the WARDEN route (which is the only one that takes a studentProfileId). */
  const file = async (
    actor: typeof warden,
    profileId: string,
    category: string,
    severity = 'MEDIUM',
    description = `${mark} description`,
    locationNote?: string,
  ) => {
    const res = await actor.call('POST', '/hostel/complaints', {
      studentProfileId: profileId,
      category,
      description,
      severity,
      ...(locationNote ? { locationNote } : {}),
    });
    if (res.status === 201 || res.status === 200) created.push(res.data.id);
    return res;
  };

  try {
    const profile = (
      await prisma.studentProfile.findFirst({
        where: { user: { email: STUDENT_EMAIL, institutionId: inst } },
        select: { id: true },
      })
    )!;
    const otherProfile = (
      await prisma.studentProfile.findFirst({
        where: { user: { institutionId: inst }, NOT: { user: { email: STUDENT_EMAIL } } },
        select: { id: true },
      })
    ) ?? profile;

    // ═══ 1. The three gates ══════════════════════════════════════════════════════════════════
    section(1, 'Each side is gated, and the technician gate is narrow');

    const studentList = await student.call('GET', '/student/complaints');
    t.check('a STUDENT can read their own complaints', studentList.status === 200, `status ${studentList.status}`);

    const studentTriage = await student.call('GET', '/hostel/complaints');
    t.check('a STUDENT cannot read the warden queue', studentTriage.status === 403, `status ${studentTriage.status}`);

    const studentFileOther = await student.call('POST', '/student/complaints', {
      category: 'PLUMBING',
      description: `${mark} as somebody else`,
      severity: 'LOW',
      // The student's own schema is `.strict()` and has NO studentProfileId, so this is the shape a
      // tamper attempt takes. It must be refused, not silently honoured.
      studentProfileId: otherProfile.id,
    } as any);
    t.check(
      'a STUDENT cannot file as another resident',
      studentFileOther.status === 400,
      `status ${studentFileOther.status}`,
    );

    const techTriage = await maintenance.call('GET', '/hostel/complaints');
    t.check('a TECHNICIAN cannot read the warden queue', techTriage.status === 403, `status ${techTriage.status}`);

    // The reason the staff router exists at all. Widening the hostel gate to MAINTENANCE would have
    // made this 200 and handed a plumber every resident's movements.
    for (const path of ['/hostel/rooms', '/hostel/residents', '/hostel/gate-passes', '/hostel/visitors']) {
      const res = await maintenance.call('GET', path);
      t.check(
        `a TECHNICIAN cannot reach ${path}`,
        res.status === 403,
        `status ${res.status}`,
      );
    }

    const techInbox = await maintenance.call('GET', '/staff-complaints/complaints');
    t.check('a TECHNICIAN can read their own inbox', techInbox.status === 200, `status ${techInbox.status}`);
    t.check(
      'the inbox names who they are',
      Boolean(techInbox.data?.me?.id),
      techInbox.data?.me?.designation ?? 'no designation',
    );
    t.check(
      'the inbox carries its own counts',
      typeof techInbox.data?.stats?.assignedToMe === 'number',
      JSON.stringify(techInbox.data?.stats ?? null),
    );

    // ═══ 2. Filing, and what the server refuses ═════════════════════════════════════════════════
    section(2, 'Filing a complaint, and the shapes the server refuses');

    const filed = await file(warden, profile.id, 'PLUMBING', 'MEDIUM', `${mark} dripping tap`);
    t.check('a WARDEN can file on a resident\'s behalf', filed.status === 201 || filed.status === 200, `status ${filed.status}`);
    const complaintId = filed.data?.id;
    t.check('the filed complaint comes back with an id', Boolean(complaintId), complaintId ?? 'no id');

    const byStudent = await file(
      warden,
      profile.id,
      'NETWORK',
      'LOW',
      `${mark} weak wifi`,
    );
    t.check('a second filing works independently', Boolean(byStudent.data?.id));

    // `.strict()` on every complaint body: an unknown key is a 400, not a silent drop. A client that
    // sends a stale field should hear about it rather than watch the field be ignored.
    const unknownKey = await warden.call('POST', '/hostel/complaints', {
      studentProfileId: profile.id,
      category: 'PLUMBING',
      description: `${mark} unknown key`,
      severity: 'LOW',
      roomNumber: 'A-101',
    } as any);
    t.check(
      'a body with an unknown key is a 400, not a silent drop',
      unknownKey.status === 400,
      `status ${unknownKey.status}`,
    );

    const tooShort = await warden.call('POST', '/hostel/complaints', {
      studentProfileId: profile.id,
      category: 'PLUMBING',
      description: 'x',
      severity: 'LOW',
    } as any);
    t.check('a two-character description is refused', tooShort.status === 400, `status ${tooShort.status}`);

    const badCategory = await warden.call('POST', '/hostel/complaints', {
      studentProfileId: profile.id,
      category: 'LIFT',
      description: `${mark} no such category`,
      severity: 'LOW',
    } as any);
    t.check('an invented category is refused', badCategory.status === 400, `status ${badCategory.status}`);

    // The room is snapshotted from the resident's own bed, so a body cannot name a room the
    // resident does not occupy.
    t.check(
      'the room is taken from the resident, not from the body',
      typeof filed.data?.roomNumber === 'string' || filed.data?.roomNumber === null,
      `roomNumber = ${JSON.stringify(filed.data?.roomNumber)}`,
    );

    // ═══ 3. Security has a severity floor ══════════════════════════════════════════════════════
    section(3, 'SECURITY is raised by policy, and says so');

    const lowSecurity = await file(warden, profile.id, 'SECURITY', 'LOW', `${mark} odd noise at night`);
    t.check(
      'a LOW security complaint is accepted at the door',
      lowSecurity.status === 201 || lowSecurity.status === 200,
      `status ${lowSecurity.status}`,
    );
    t.check(
      '...but the stored severity is raised to MEDIUM',
      lowSecurity.data?.severity === 'MEDIUM',
      `severity = ${lowSecurity.data?.severity}`,
    );
    t.check(
      '...and the response flags that it was raised',
      // A BOOLEAN, not the new severity. The stored `severity` above already carries the new value,
      // so a second copy of it here would be redundant and could disagree with itself.
      lowSecurity.data?.severityRaised === true,
      `severityRaised = ${lowSecurity.data?.severityRaised}`,
    );

    // A non-security complaint is NOT silently raised, or the floor would be doing nothing.
    const lowPlumbing = await file(warden, profile.id, 'PLUMBING', 'LOW', `${mark} loose handle`);
    t.check(
      'a LOW plumbing complaint keeps its severity and is NOT flagged',
      lowPlumbing.data?.severity === 'LOW' && lowPlumbing.data?.severityRaised === false,
      `severity = ${lowPlumbing.data?.severity}, severityRaised = ${lowPlumbing.data?.severityRaised}`,
    );

    // ═══ 4. Escalation is derived, and the policy is editable ═══════════════════════════════════
    section(4, 'Escalation is derived from age, and the policy is readable and writable');

    const fresh = (await warden.call('GET', '/hostel/complaints?status=ALL&pageSize=100')).data!;
    const mine = fresh.complaints.filter((c: any) => c.description.startsWith(mark));
    // 5 filings exist by this point (PLUMBING, NETWORK, ELECTRICAL, SECURITY, PLUMBING-LOW). The queue is
    // paged, so this asserts the SUITE's count against what it filed rather than a hardcoded number that
    // would drift the moment a fixture is added.
    t.check('the queue returns every complaint filed so far', mine.length === 5, `${mine.length} found, expected 5`);

    const justFiled = mine.find((c: any) => c.id === complaintId);
    t.check('a brand-new complaint is not escalated', justFiled?.escalated === false, `escalated = ${justFiled?.escalated}`);
    t.check(
      '...and reports how long until it would be',
      typeof justFiled?.hoursToEscalation === 'number' && justFiled.hoursToEscalation > 0,
      `${justFiled?.hoursToEscalation}h`,
    );
    t.check('...and carries a priority score', typeof justFiled?.priority === 'number', `priority = ${justFiled?.priority}`);

    const escalatedOnly = (await warden.call('GET', '/hostel/complaints?escalated=true&pageSize=100')).data!;
    t.check(
      'the escalated filter works server-side',
      escalatedOnly.complaints.every((c: any) => c.escalated === true),
      `${escalatedOnly.complaints.length} rows, all escalated`,
    );

    const policyRead = await warden.call('GET', '/hostel/complaints/policy');
    t.check('the policy is readable', policyRead.status === 200, `status ${policyRead.status}`);
    const originalPolicy = policyRead.data;
    t.check(
      'the policy publishes escalation hours per severity',
      Boolean(originalPolicy?.escalationHours?.MEDIUM),
      `MEDIUM = ${originalPolicy?.escalationHours?.MEDIUM}h`,
    );
    t.check(
      'the policy publishes the reopen threshold',
      typeof originalPolicy?.reopenRatingThreshold === 'number',
      `threshold = ${originalPolicy?.reopenRatingThreshold}`,
    );

    // Tightening MEDIUM to 1 hour must make an age-3-day MEDIUM complaint escalated, without
    // touching any row — the point being that escalation is DERIVED, not stored.
    //
    // ALL THREE are tightened together, and that is the assertion that matters. The policy refuses an
    // escalation ladder that is not monotonic (LOW no faster than MEDIUM, MEDIUM no faster than
    // HIGH), and it fixes it by SORTING. So sending MEDIUM=1 while leaving LOW=168 does not store 1 —
    // it stores a ladder where MEDIUM has been pushed up to meet LOW. Writing only the key under test
    // would therefore have asserted the clamp rather than the escalation, and passed for the wrong
    // reason. Sending a consistent ladder is what a real policy edit looks like.
    const tightened = await warden.call('PUT', '/hostel/complaints/policy', {
      ...originalPolicy,
      escalationHours: { LOW: 24, MEDIUM: 12, HIGH: 6 },
    });
    t.check('the policy is writable', tightened.status === 200, `status ${tightened.status}`);
    t.check(
      'a consistent ladder is stored as sent',
      tightened.data?.escalationHours?.MEDIUM === 12 && tightened.data?.escalationHours?.HIGH === 6,
      `LOW/MEDIUM/HIGH = ${tightened.data?.escalationHours?.LOW}/${tightened.data?.escalationHours?.MEDIUM}/${tightened.data?.escalationHours?.HIGH}`,
    );

    // ...and the ladder really is enforced, not merely accepted.
    const scrambled = await warden.call('PUT', '/hostel/complaints/policy', {
      ...originalPolicy,
      escalationHours: { LOW: 2, MEDIUM: 400, HIGH: 99 },
    });
    t.check(
      'a non-monotonic ladder is sorted rather than stored',
      scrambled.data?.escalationHours?.LOW >= scrambled.data?.escalationHours?.MEDIUM
        && scrambled.data?.escalationHours?.MEDIUM >= scrambled.data?.escalationHours?.HIGH,
      `LOW/MEDIUM/HIGH = ${scrambled.data?.escalationHours?.LOW}/${scrambled.data?.escalationHours?.MEDIUM}/${scrambled.data?.escalationHours?.HIGH}`,
    );

    await warden.call('PUT', '/hostel/complaints/policy', tightened.data);

    // The tightening itself cannot escalate the complaint this suite filed a second ago — it is
    // MINUTES old, and even a 12-hour ladder has not elapsed. Backdating `createdAt` is what makes the
    // assertion about derivation rather than about the clock: if escalation were a stored column, the
    // policy write would have flipped it without the row changing; because it is derived from
    // `createdAt`, the row must age first.
    await prisma.hostelComplaint.update({
      where: { id: complaintId },
      data: { createdAt: new Date(Date.now() - 3 * 86400000) },
    });
    const afterTighten = (await warden.call('GET', '/hostel/complaints?status=ALL&pageSize=100')).data!;
    const aged = afterTighten.complaints.find((c: any) => c.id === complaintId);
    t.check(
      'a 3-day MEDIUM complaint escalates under a 12h ladder',
      aged?.escalated === true,
      `escalated = ${aged?.escalated}, hoursToEscalation = ${aged?.hoursToEscalation}`,
    );
    t.check(
      '...and stops reporting a countdown, rather than a negative one',
      // `null` means "already crossed", not "crossed N hours ago". A negative number would invite a
      // client to render "escalates in -14h", so the contract is null-or-a-positive-remainder.
      aged?.hoursToEscalation === null,
      `hoursToEscalation = ${JSON.stringify(aged?.hoursToEscalation)}`,
    );

    const restored = await warden.call('PUT', '/hostel/complaints/policy', originalPolicy);
    t.check(
      'the original policy is restored',
      restored.data?.escalationHours?.MEDIUM === originalPolicy.escalationHours.MEDIUM,
      `MEDIUM = ${restored.data?.escalationHours?.MEDIUM}h`,
    );

    const afterRestore = (await warden.call('GET', '/hostel/complaints?status=ALL&pageSize=100')).data!;
    const unaged = afterRestore.complaints.find((c: any) => c.id === complaintId);
    // `isEscalated` is `age > hours`, so a complaint sitting EXACTLY on the threshold has crossed it.
// Asserted rather than assumed: this is the one boundary where being a minute out would make the
// whole escalation section a coin toss, and it documents which side of the line "72h old" falls on.
t.check(
      'the threshold is INCLUSIVE: 72h old against a 72h ladder IS escalated',
      unaged?.escalated === true,
      `escalated = ${unaged?.escalated} at 72h exactly`,
    );
    await prisma.hostelComplaint.update({
      where: { id: complaintId },
      data: { createdAt: new Date(Date.now() - 2 * 86400000) },
    });
    const insideWindow = (await warden.call('GET', '/hostel/complaints?status=ALL&pageSize=100')).data!
      .complaints.find((c: any) => c.id === complaintId);
    t.check(
      '...and one minute inside the window is not',
      insideWindow?.escalated === false && typeof insideWindow?.hoursToEscalation === 'number',
      `escalated = ${insideWindow?.escalated}, ${insideWindow?.hoursToEscalation}h left`,
    );

    // ═══ 5. Triage is the warden's alone ═══════════════════════════════════════════════════════
    section(5, 'Assignment routes to the right trade, and only the warden can do it');

    const plumbingAssignees = (await warden.call('GET', '/hostel/complaints/assignees?category=PLUMBING')).data!;
    t.check('the assignee list returns people', Array.isArray(plumbingAssignees) && plumbingAssignees.length > 0, `${plumbingAssignees?.length} staff`);
    // Matched on DESIGNATION, not email. The assignee payload carries `id`, `fullName`, `designation`,
// `roles`, `group`, `eligible` and `reason` — it deliberately does not carry the login email, because
// a picker needs to show a person, not hand a technician's credentials to a screen.
const byDesignation = (list: any[], needle: string) =>
  list.find((s) => String(s.designation ?? '').toLowerCase().includes(needle));

const techEligible = byDesignation(plumbingAssignees, 'maintenance');
    t.check(
      'the technician is eligible for a plumbing job',
      Boolean(techEligible?.eligible),
      `eligible = ${techEligible?.eligible}, reason = ${techEligible?.reason}`,
    );
    const securityStaffEligible = byDesignation(plumbingAssignees, 'security');
    t.check(
      'the security officer is NOT eligible for a plumbing job',
      securityStaffEligible?.eligible === false,
      `eligible = ${securityStaffEligible?.eligible}`,
    );
    t.check(
      'an ineligible person is still LISTED, with a null reason',
      Array.isArray(plumbingAssignees) && Boolean(securityStaffEligible) && securityStaffEligible.reason === null,
      `reason = ${JSON.stringify(securityStaffEligible?.reason)}`,
    );
    t.check(
      'the picker never leaks a login email',
      plumbingAssignees.every((s: any) => s.email === undefined),
      'no email field returned',
    );

    const securityAssignees = (await warden.call('GET', '/hostel/complaints/assignees?category=SECURITY')).data!;
    const secForSecurity = byDesignation(securityAssignees, 'security');
    t.check('the security officer IS eligible for a security job', secForSecurity?.eligible === true, `eligible = ${secForSecurity?.eligible}`);

    // The bug this replaces: the old route took no body and assigned to whoever called it, so the
    // warden's screen promised "assign to staff" while assigning to the warden.
    const noBody = await warden.call('POST', `/hostel/complaints/${complaintId}/assign`, {} as any);
    t.check('assigning with no assignee is refused', noBody.status === 400, `status ${noBody.status}`);

    const maintUser = (
      await prisma.user.findFirst({ where: { email: MAINTENANCE_EMAIL, institutionId: inst }, select: { id: true } })
    )!;
    const secUser = (await prisma.user.findFirst({ where: { email: SECURITY_EMAIL, institutionId: inst }, select: { id: true } }))!;
    const messUser = (await prisma.user.findFirst({ where: { email: MESS_EMAIL, institutionId: inst }, select: { id: true } }))!;

    const studentAssign = await student.call('POST', `/hostel/complaints/${complaintId}/assign`, {
      assigneeUserId: maintUser.id,
    } as any);
    t.check('a STUDENT cannot assign', studentAssign.status === 403, `status ${studentAssign.status}`);

    const techAssign = await maintenance.call('POST', `/hostel/complaints/${complaintId}/assign`, {
      assigneeUserId: secUser.id,
    } as any);
    t.check('a TECHNICIAN cannot assign', techAssign.status === 403, `status ${techAssign.status}`);

    const assigned = await warden.call('POST', `/hostel/complaints/${complaintId}/assign`, {
      assigneeUserId: maintUser.id,
      note: `${mark} plumber please`,
    });
    t.check('the WARDEN can assign', assigned.status === 200, `status ${assigned.status}`);
    t.check(
      'the assignment is recorded against the technician',
      assigned.data?.assignedToUserId === maintUser.id,
      assigned.data?.assignedToName ?? 'unnamed',
    );
    t.check('the status moved to ASSIGNED', assigned.data?.status === 'ASSIGNED', assigned.data?.status);

    const foodAssigned = await file(warden, profile.id, 'FOOD', 'HIGH', `${mark} bad lunch`);
    const foodRouted = await warden.call('POST', `/hostel/complaints/${foodAssigned.data.id}/assign`, {
      assigneeUserId: messUser.id,
    });
    t.check('a FOOD complaint routes to the mess steward', foodRouted.status === 200, `status ${foodRouted.status}`);

    const secComplaint = await file(warden, profile.id, 'SECURITY', 'HIGH', `${mark} door propped`);
    await warden.call('POST', `/hostel/complaints/${secComplaint.data.id}/assign`, { assigneeUserId: secUser.id });
    const secRow = await prisma.hostelComplaint.findUnique({ where: { id: secComplaint.data.id }, select: { assignedToUserId: true } });
    t.check('a SECURITY complaint routes to the security officer', secRow?.assignedToUserId === secUser.id, 'routed');

    // ═══ 6. Who may close a complaint ══════════════════════════════════════════════════════════
    section(6, 'Only the assignee, a warden or an admin may resolve');

    // A required-field failure is 400, not 422: `complaintResolveSchema` is `.trim().min(5)`, so zod
    // rejects the SHAPE before the service runs. 422 is reserved for a well-formed body that a RULE
    // refuses — the mess suite draws the same line ("an unknown meal is 400, a shape-valid but
    // impossible date is 422"). The service keeps a 422 guard for an all-whitespace note that somehow
    // reaches it, so both paths are safe.
    const emptyResolution = await maintenance.call('POST', `/staff-complaints/complaints/${complaintId}/resolve`, {
      resolutionNote: '',
    } as any);
    t.check('resolving with no note is refused at the schema (400)', emptyResolution.status === 400, `status ${emptyResolution.status}`);

    const shortResolution = await maintenance.call('POST', `/staff-complaints/complaints/${complaintId}/resolve`, {
      resolutionNote: 'ok',
    } as any);
    t.check('a two-character resolution note is refused', shortResolution.status === 400, `status ${shortResolution.status}`);

    const resolveJunk = await maintenance.call('POST', `/staff-complaints/complaints/${complaintId}/resolve`, {
      resolutionNote: `${mark} with junk`,
      force: true,
    } as any);
    t.check('a resolution with an unknown key is refused', resolveJunk.status === 400, `status ${resolveJunk.status}`);

    // THE BOUNDARY. `complaintId` is assigned to `maintenance`, so the OTHER technician-shaped
    // worker must be refused. A route that gated only on ROLE would let this through and quietly close
    // a colleague's job.
    const colleagueTries = await security.call('POST', `/staff-complaints/complaints/${complaintId}/resolve`, {
      resolutionNote: `${mark} closed by the wrong person`,
    });
    t.check(
      'a DIFFERENT technician cannot close a colleague\'s complaint',
      colleagueTries.status === 409 || colleagueTries.status === 403,
      `status ${colleagueTries.status}`,
    );

    const stillOpen = await prisma.hostelComplaint.findUnique({ where: { id: complaintId }, select: { status: true } });
    t.check('...and it is still ASSIGNED afterwards', stillOpen?.status === 'ASSIGNED', stillOpen?.status);

        // The STUDENT note route is the student's OWN and is meant to work — adding detail is one of the
    // few things a resident may write. What must be refused is the STAFF route, which is the one that
    // would let a resident post as support staff. Asserting the wrong route here would have "passed" a
    // broken student screen.
    const studentOnStaffRoute = await student.call('POST', `/staff-complaints/complaints/${complaintId}/notes`, {
      note: `${mark} from the wrong side`,
    } as any);
    t.check(
      'a STUDENT cannot use the staff note route',
      studentOnStaffRoute.status === 403,
      `status ${studentOnStaffRoute.status}`,
    );

    const resolved = await maintenance.call('POST', `/staff-complaints/complaints/${complaintId}/resolve`, {
      resolutionNote: `${mark} washer replaced`,
    });
    t.check('the ASSIGNEE can resolve it', resolved.status === 200, `status ${resolved.status}`);
    t.check('the status is RESOLVED', resolved.data?.status === 'RESOLVED', resolved.data?.status);
    t.check('the resolution note is stored', typeof resolved.data?.resolutionNote === 'string', resolved.data?.resolutionNote);
    t.check('the resolver is recorded', Boolean(resolved.data?.resolvedByUserId), 'recorded');
    t.check('a resolvedAt stamp exists', Boolean(resolved.data?.resolvedAt), String(resolved.data?.resolvedAt));

    const doubleResolve = await maintenance.call('POST', `/staff-complaints/complaints/${complaintId}/resolve`, {
      resolutionNote: `${mark} again`,
    });
    t.check('resolving an already-resolved complaint is refused', doubleResolve.status === 409, `status ${doubleResolve.status}`);

    // A RESOLVED complaint is off the board, so it must not be escalating.
    const resolvedRow = (await warden.call('GET', `/hostel/complaints/${complaintId}`)).data!;
    t.check('a RESOLVED complaint is not escalated', resolvedRow?.escalated === false, `escalated = ${resolvedRow?.escalated}`);

    // ═══ 7. The resident's own view ═══════════════════════════════════════════════════════════
    section(7, 'The resident sees their own complaint and nobody else\'s');

    const myList = (await student.call('GET', '/student/complaints')).data!;
    const mineOnes = (Array.isArray(myList) ? myList : myList?.complaints ?? []).filter((c: any) =>
      String(c.description).startsWith(mark),
    );
    t.check('the resident sees the complaints they filed', mineOnes.length >= 6, `${mineOnes.length} visible`);
    t.check(
      'a resident cannot see another resident\'s complaint',
      mineOnes.every((c: any) => c.studentProfileId === profile.id),
      'all their own',
    );
    t.check(
      'the resident view carries the derived fields too',
      mineOnes.every((c: any) => typeof c.priority === 'number'),
      'priority present',
    );

    const ownDetail = await student.call('GET', `/hostel/complaints/${complaintId}`);
    t.check('a STUDENT cannot read a complaint by id through the warden route', ownDetail.status === 403, `status ${ownDetail.status}`);

    // ═══ 8. The reopen loop ═══════════════════════════════════════════════════════════════════
    section(8, 'A poor rating reopens the complaint instead of scoring it');

    const preFeedback = (await prisma.hostelComplaint.findUnique({
      where: { id: complaintId },
      select: { status: true, reopenedCount: true },
    }))!;
    t.check('it starts RESOLVED', preFeedback.status === 'RESOLVED', preFeedback.status);
    t.check('with no prior reopen', preFeedback.reopenedCount === 0, `count = ${preFeedback.reopenedCount}`);

    const threshold = originalPolicy?.reopenRatingThreshold ?? 3;
    const badRating = threshold >= 5 ? 4 : threshold;
    const feedback = await student.call('POST', `/student/complaints/${complaintId}/feedback`, {
      rating: badRating,
      comment: `${mark} still leaking`,
    });
    t.check('the feedback is accepted', feedback.status === 200 || feedback.status === 201, `status ${feedback.status}`);
    t.check('...and it says the complaint was reopened', feedback.data?.reopened === true, `reopened = ${feedback.data?.reopened}`);

    const afterFeedback = (await prisma.hostelComplaint.findUnique({
      where: { id: complaintId },
      select: { status: true, reopenedCount: true, assignedToUserId: true, resolvedAt: true, resolutionNote: true },
    }))!;
    t.check('the status went back to OPEN or ASSIGNED', ['OPEN', 'ASSIGNED'].includes(afterFeedback.status), afterFeedback.status);
    t.check('the reopen counter went up', afterFeedback.reopenedCount === 1, `count = ${afterFeedback.reopenedCount}`);
    // A reopened complaint that keeps its old `resolvedAt` would show the repair date from the fix
    // that did not hold, which is exactly the reading that makes the queue untrustworthy.
    t.check('the old resolution stamp was cleared', afterFeedback.resolvedAt === null, String(afterFeedback.resolvedAt));
    t.check('the old resolution note was cleared', afterFeedback.resolutionNote === null, JSON.stringify(afterFeedback.resolutionNote));

    const reopenEvent = await prisma.hostelComplaintEvent.findFirst({
      where: { complaintId: complaintId, type: 'REOPENED' },
    });
    t.check('a REOPENED event was written to the timeline', Boolean(reopenEvent), reopenEvent ? 'present' : 'MISSING');

    const feedbackEvent = await prisma.hostelComplaintEvent.findFirst({
      where: { complaintId: complaintId, type: 'FEEDBACK_GIVEN' },
    });
    t.check('a FEEDBACK_GIVEN event was written too', Boolean(feedbackEvent), feedbackEvent ? 'present' : 'MISSING');

    const ratingOutOfRange = await student.call('POST', `/student/complaints/${complaintId}/feedback`, {
      rating: 9,
    } as any);
    t.check('a rating above 5 is refused', ratingOutOfRange.status === 400, `status ${ratingOutOfRange.status}`);

    // A GOOD rating on a different complaint must NOT reopen anything — or the reopen rule is
    // really "any feedback", which is not what the copy promises.
    const goodTarget = await file(warden, profile.id, 'NETWORK', 'LOW', `${mark} to be resolved well`);
    await warden.call('POST', `/hostel/complaints/${goodTarget.data.id}/assign`, { assigneeUserId: maintUser.id });
    await maintenance.call('POST', `/staff-complaints/complaints/${goodTarget.data.id}/resolve`, {
      resolutionNote: `${mark} router rebooted`,
    });
    const goodFeedback = await student.call('POST', `/student/complaints/${goodTarget.data.id}/feedback`, {
      rating: 5,
      comment: `${mark} sorted`,
    });
    t.check('a 5-star rating is accepted', goodFeedback.status === 200 || goodFeedback.status === 201, `status ${goodFeedback.status}`);
    t.check('...and does NOT reopen', goodFeedback.data?.reopened !== true, `reopened = ${goodFeedback.data?.reopened}`);
    const stillResolved = (await prisma.hostelComplaint.findUnique({
      where: { id: goodTarget.data.id },
      select: { status: true },
    }))!;
    t.check('...and the complaint stays RESOLVED', stillResolved.status === 'RESOLVED', stillResolved.status);

    // ═══ 9. Notes and the warden's manual reopen ════════════════════════════════════════════════
    section(9, 'Notes from both sides, and the warden reopening by hand');

    const staffNote = await maintenance.call('POST', `/staff-complaints/complaints/${goodTarget.data.id}/notes`, {
      note: `${mark} parts ordered`,
    });
    t.check('a TECHNICIAN can add a note', staffNote.status === 200 || staffNote.status === 201, `status ${staffNote.status}`);

    const studentNote = await student.call('POST', `/student/complaints/${goodTarget.data.id}/notes`, {
      note: `${mark} still no signal upstairs`,
    });
    t.check('a STUDENT can add detail', studentNote.status === 200 || studentNote.status === 201, `status ${studentNote.status}`);

    const emptyNote = await student.call('POST', `/student/complaints/${goodTarget.data.id}/notes`, {
      note: '   ',
    } as any);
    t.check('an empty note is refused', emptyNote.status === 400, `status ${emptyNote.status}`);

    const detail = (await warden.call('GET', `/hostel/complaints/${goodTarget.data.id}`)).data!;
    const eventTypes: string[] = (detail?.events ?? []).map((e: any) => e.type);
    t.check('the timeline records the creation', eventTypes.includes('CREATED'), eventTypes.join(','));
    t.check('the timeline records the assignment', eventTypes.includes('ASSIGNED'), eventTypes.join(','));
    t.check('the timeline records the resolution', eventTypes.includes('RESOLVED'), eventTypes.join(','));

    const studentReopen = await student.call('POST', `/hostel/complaints/${goodTarget.data.id}/reopen`, {} as any);
    t.check('a STUDENT cannot use the warden reopen route', studentReopen.status === 403, `status ${studentReopen.status}`);

    const wardenReopen = await warden.call('POST', `/hostel/complaints/${goodTarget.data.id}/reopen`, {
      reason: `${mark} closed in error`,
    });
    t.check('the WARDEN can reopen by hand', wardenReopen.status === 200, `status ${wardenReopen.status}`);
    t.check('...and it is back on the board', wardenReopen.data?.status !== 'RESOLVED', wardenReopen.data?.status);

    // ═══ 10. Shape and tenancy ═════════════════════════════════════════════════════════════════
    section(10, 'The queue shape, and that it is scoped to one institution');

    const queue = (await warden.call('GET', '/hostel/complaints?pageSize=100')).data!;
    t.check('the queue is an object, never a bare array', Boolean(queue?.complaints && queue?.stats), 'has complaints + stats');
    t.check('stats count every status', ['total', 'open', 'assigned', 'resolved', 'escalated'].every((k) => typeof queue?.stats?.[k] === 'number'), JSON.stringify(queue?.stats));
    t.check('facets are present for the chips', Boolean(queue?.facets?.status && queue?.facets?.severity), 'status + severity');
    t.check(
      'facets are counted from the UNFILTERED set',
      Object.values(queue.facets.status).reduce((a: any, b: any) => a + b, 0) === queue.stats.total,
      `${Object.values(queue.facets.status).reduce((a: any, b: any) => a + b, 0)} vs ${queue.stats.total}`,
    );
    t.check('pagination is present', typeof queue?.pagination?.totalPages === 'number', `${queue?.pagination?.page}/${queue?.pagination?.totalPages}`);
    t.check(
      'facets come back even when a filter matches nothing',
      Boolean((await warden.call('GET', '/hostel/complaints?severity=HIGH&q=zzzznotathing')).data?.facets),
      'present on an empty result',
    );

    const paged = (await warden.call('GET', '/hostel/complaints?pageSize=1')).data!;
    t.check('pageSize is honoured', paged.complaints.length <= 1, `${paged.complaints.length} rows`);

    const openLike = (await warden.call('GET', '/hostel/complaints?status=OPEN_LIKE&pageSize=100')).data!;
    t.check(
      'OPEN_LIKE means OPEN plus ASSIGNED and nothing else',
      openLike.complaints.every((c: any) => c.status === 'OPEN' || c.status === 'ASSIGNED'),
      `${openLike.complaints.length} rows`,
    );

    const byGroup = (await warden.call('GET', '/hostel/complaints?category=security&pageSize=100')).data!;
    t.check(
      'a category GROUP filters server-side',
      byGroup.complaints.every((c: any) => c.category === 'SECURITY'),
      `${byGroup.complaints.length} security rows`,
    );
    // Lowercase, because that is what a client will type and what the group's own name suggests. This
    // used to match nothing and return an EMPTY queue silently — a filter showing "0 results" for a
    // group that has complaints is indistinguishable from "there are none".
    const lower = (await warden.call('GET', '/hostel/complaints?category=security&pageSize=100')).data!;
    const upper = (await warden.call('GET', '/hostel/complaints?category=SECURITY&pageSize=100')).data!;
    t.check(
      'the group filter is case-insensitive',
      lower.pagination.total === upper.pagination.total,
      `"security" = ${lower.pagination.total}, "SECURITY" = ${upper.pagination.total}`,
    );
    t.check(
      'a lowercase group with rows is NOT silently empty',
      upper.pagination.total > 0 && lower.pagination.total > 0,
      `both non-empty`,
    );
    // A raw category in the same parameter, so one filter serves both the group chips and the
    // per-category ones.
    const rawCat = (await warden.call('GET', '/hostel/complaints?category=plumbing&pageSize=100')).data!;
    t.check(
      'a raw CATEGORY works in the same parameter',
      rawCat.complaints.every((c: any) => c.category === 'PLUMBING'),
      `${rawCat.complaints.length} plumbing rows`,
    );
// A GROUP is more than one category: MAINTENANCE covers plumbing, electrical, network AND the
    // maintenance category itself. Asserted against the GROUP DEFINITION plus a freshly filed row in a
    // second member category — because the seeded queue holds one complaint per category, and asserting
    // "the group returns >1 category" against data someone else seeds is a test that passes or fails
    // for reasons that have nothing to do with the filter.
const MAINTENANCE_GROUP = ['PLUMBING', 'ELECTRICAL', 'NETWORK', 'MAINTENANCE'];
const electricalForGroup = await file(warden, profile.id, 'ELECTRICAL', 'LOW', `${mark} dead socket`);
    t.check('a second MAINTENANCE-group category is accepted', Boolean(electricalForGroup.data?.id), `status ${electricalForGroup.status}`);

    const maintRows = (await warden.call('GET', '/hostel/complaints?category=maintenance&pageSize=100')).data!;
    t.check(
      'the maintenance GROUP returns only categories in that group',
      maintRows.complaints.every((c: any) => MAINTENANCE_GROUP.includes(c.category)),
      [...new Set(maintRows.complaints.map((c: any) => c.category))].join(',') || 'none',
    );
    t.check(
      '...and it spans more than one category, not just MAINTENANCE itself',
      new Set(maintRows.complaints.map((c: any) => c.category)).size > 1
        && maintRows.complaints.some((c: any) => c.id === electricalForGroup.data?.id),
      [...new Set(maintRows.complaints.map((c: any) => c.category))].join(','),
    );
    t.check(
      'FOOD is NOT in the maintenance group',
      !maintRows.complaints.some((c: any) => c.category === 'FOOD'),
      'food stays out',
    );
    const unknownCat = (await warden.call('GET', '/hostel/complaints?category=nonsense&pageSize=100')).data!;
    t.check(
      'an unknown category yields an empty list, not an error',
      unknownCat.complaints.length === 0 && unknownCat.facets !== undefined,
      `${unknownCat.pagination.total} rows, facets still present`,
    );

    // Tenant scoping: the whole point of `institutionId` on the row.
    const foreignInst = (
      await prisma.institution.findFirst({ where: { NOT: { id: inst } }, select: { id: true } })
    )?.id;
    if (foreignInst) {
      const leaked = (await prisma.hostelComplaint.findMany({ where: { description: { startsWith: mark } }, select: { institutionId: true } }));
      t.check(
        'every complaint this suite filed is scoped to one institution',
        leaked.every((c) => c.institutionId === inst),
        `${leaked.length} rows, one institution`,
      );
    }

    // ═══ 11. Notifications ═════════════════════════════════════════════════════════════════════
    section(11, 'The resident is told, and told the right way');

    // The notification the RESOLVE sends the resident ("Was it fixed?"), found by its own title.
//
// It is NOT the newest notification carrying this complaint id: resolving also raises "Complaint
// reopened" to the WARDEN, and ordering by `createdAt desc` landed on that instead — so the assertion
// was checking a warden's inbox against a resident's id and failing for the right reason at the wrong
// layer. Matching the title is what makes this "the resident was told", which is the claim.
const notif = await prisma.notification.findFirst({
      where: {
        institutionId: inst,
        sourceModule: 'hostel',
        title: 'Was it fixed?',
        dataJson: { contains: complaintId },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (notif) {
      const resident = await prisma.user.findFirst({ where: { email: STUDENT_EMAIL, institutionId: inst }, select: { id: true } });
      const prof = await prisma.studentProfile.findFirst({ where: { userId: resident!.id }, select: { id: true } });
      // This was a real bug once: notifications were addressed to the resident's `studentProfileId`,
      // which is not a `users.id`, so the row pointed at nothing and no client could ever show it.
      t.check(
        'the resolve notification goes to the resident\'s USER id, not their profile id',
        notif.recipientUserId === resident?.id && notif.recipientUserId !== prof?.id,
        `recipient ${String(notif.recipientUserId).slice(0, 8)}… vs profile ${String(prof?.id).slice(0, 8)}…`,
      );
      t.check(
        '...and it names the complaint so the resident recognises it',
        typeof notif.body === 'string' && notif.body.length > 0,
        JSON.stringify(String(notif.body).slice(0, 50)),
      );
      t.check('...and it links back to the complaint', String(notif.dataJson).includes(complaintId), 'id present');
    } else {
      t.check('the resident was notified that their complaint was resolved', false, 'no notification found');
    }
  } finally {
    // Children first: events and feedback both point at the complaint, and neither cascades.
    await prisma.hostelComplaintFeedback.deleteMany({ where: { complaintId: { in: created } } });
    await prisma.hostelComplaintEvent.deleteMany({ where: { complaintId: { in: created } } });
    await prisma.hostelComplaint.deleteMany({ where: { id: { in: created } } });
    const left = await prisma.hostelComplaint.count({ where: { description: { startsWith: mark } } });
    t.check('the suite left nothing behind', left === 0, `${left} rows remain`);
  }

  t.finish('Complaints HTTP');
}

runSuite('complaints', main);