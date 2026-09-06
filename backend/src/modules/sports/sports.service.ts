import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

// ── SP-01 Dashboard ──────────────────────────────────────────
export async function getDashboard(_userId: string, institutionId: string) {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    eventsUpcoming,
    eventsThisWeek,
    activeTeams,
    pendingRegs,
    equipmentOut,
    equipmentOverdue,
  ] = await Promise.all([
    prisma.event.count({
      where: { institutionId, status: { in: ['APPROVED', 'PUBLISHED'] }, endDate: { gte: now } },
    }),
    prisma.event.count({
      where: { institutionId, status: { in: ['APPROVED', 'PUBLISHED'] }, startDate: { lte: weekAhead, gte: now } },
    }),
    prisma.team.count({ where: { institutionId } }),
    prisma.eventRegistration.count({ where: { event: { institutionId }, status: 'PENDING' } }),
    prisma.equipmentIssue.count({ where: { item: { institutionId }, status: 'ISSUED' } }),
    prisma.equipmentIssue.count({ where: { item: { institutionId }, status: 'OVERDUE' } }),
  ]);

  // Today's schedule: events running today + latest fixtures
  const todaysEvents = await prisma.event.findMany({
    where: { institutionId, startDate: { lte: now }, endDate: { gte: now }, status: { in: ['APPROVED', 'PUBLISHED'] } },
    include: { venue: { select: { name: true } } },
    take: 3,
    orderBy: { startDate: 'asc' },
  });

  const upcomingFixtures = await prisma.fixture.findMany({
    where: { tournament: { institutionId }, status: { in: ['UPCOMING', 'TODAY'] } },
    include: {
      teamA: { select: { name: true } },
      teamB: { select: { name: true } },
      tournament: { select: { name: true, sport: true } },
    },
    orderBy: { fixtureDate: 'asc' },
    take: 3,
  });

  // Pending approval previews
  const pendingPreview = await prisma.eventRegistration.findMany({
    where: { event: { institutionId }, status: 'PENDING' },
    include: {
      registrant: { select: { fullName: true } },
      event: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const todayEvents = [
    ...todaysEvents.map((e) => ({
      kind: 'EVENT' as const,
      id: e.id,
      name: e.title,
      venue: e.venue?.name ?? 'TBD',
    })),
    ...upcomingFixtures.map((f) => ({
      kind: 'FIXTURE' as const,
      id: f.id,
      name: `${f.teamA.name} vs ${f.teamB.name}`,
      venue: f.tournament.sport,
      date: f.fixtureDate,
    })),
  ];

  return {
    stats: {
      eventsUpcoming,
      eventsThisWeek,
      activeTeams,
      pendingRegistrations: pendingRegs,
      equipmentOut,
      equipmentOverdue,
    },
    todayEvents,
    pendingApprovals: pendingPreview.map((r) => ({
      id: r.id,
      student: r.registrant.fullName,
      event: r.event.title,
      at: r.createdAt,
    })),
  };
}

// ── SP-02 Events ─────────────────────────────────────────────
export async function listEvents(institutionId: string) {
  const events = await prisma.event.findMany({
    where: { institutionId, category: { not: 'ALUMNI' } },
    include: {
      venue: { select: { name: true } },
      _count: { select: { registrations: true, volunteers: true } },
    },
    orderBy: { startDate: 'desc' },
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category, // TECH | SPORTS | CULTURAL | OTHER
    startDate: e.startDate,
    endDate: e.endDate,
    venue: e.venue?.name ?? null,
    registrations: e._count.registrations,
    capacity: e.capacity,
    status: e.status,
  }));
}

export async function getEventDetail(_userId: string, institutionId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, institutionId },
    include: {
      venue: { select: { name: true } },
      scheduleItems: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
      volunteers: {
        include: { studentProfile: { include: { user: { select: { fullName: true } } } } },
      },
      registrations: {
        include: { registrant: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!event) throw notFound('Event not found');

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    startDate: event.startDate,
    endDate: event.endDate,
    venue: event.venue?.name ?? null,
    capacity: event.capacity,
    status: event.status,
    registrations: event.registrations.length,
    schedule: event.scheduleItems.map((s) => ({
      id: s.id,
      day: s.day,
      item: s.item,
      isDone: s.isDone,
      order: s.order,
    })),
    volunteers: event.volunteers.map((v) => ({
      id: v.id,
      name: v.studentProfile.user.fullName,
      role: v.role,
    })),
    registrationList: event.registrations.map((r) => ({
      id: r.id,
      name: r.registrant.fullName,
      status: r.status, // PENDING | APPROVED | REJECTED | CONFIRMED | DECLINED
      at: r.createdAt,
    })),
    pendingCount: event.registrations.filter((r) => r.status === 'PENDING').length,
  };
}

export async function decideRegistration(
  userId: string,
  institutionId: string,
  registrationId: string,
  decision: 'APPROVED' | 'REJECTED',
) {
  const reg = await prisma.eventRegistration.findFirst({
    where: { id: registrationId, event: { institutionId } },
    include: { event: { select: { id: true, title: true } }, registrant: { select: { id: true, fullName: true } } },
  });
  if (!reg) throw notFound('Registration not found');
  if (reg.status !== 'PENDING') throw conflict(`Registration already decided (${reg.status})`);

  const updated = await prisma.eventRegistration.update({
    where: { id: reg.id },
    data: { status: decision },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: reg.registrant.id,
      type: 'EVENT',
      title: decision === 'APPROVED' ? `Registration approved: ${reg.event.title}` : `Registration rejected: ${reg.event.title}`,
      body:
        decision === 'APPROVED'
          ? `Your registration for ${reg.event.title} is confirmed. See you there!`
          : `Your registration for ${reg.event.title} was not approved this time.`,
      sourceModule: 'sports',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'event.registration.decide',
    entityType: 'EventRegistration',
    entityId: reg.id,
    before: { status: 'PENDING' },
    after: { status: decision },
  });

  return { id: updated.id, status: updated.status };
}

export async function addScheduleItem(
  _userId: string,
  institutionId: string,
  eventId: string,
  body: { day: number; item: string },
) {
  const event = await prisma.event.findFirst({ where: { id: eventId, institutionId } });
  if (!event) throw notFound('Event not found');

  const last = await prisma.eventScheduleItem.findFirst({
    where: { eventId, day: body.day },
    orderBy: { order: 'desc' },
  });

  const item = await prisma.eventScheduleItem.create({
    data: { eventId, day: body.day, item: body.item, order: (last?.order ?? 0) + 1 },
  });
  return { id: item.id, day: item.day, item: item.item, isDone: item.isDone, order: item.order };
}

export async function toggleScheduleItem(
  _userId: string,
  institutionId: string,
  itemId: string,
  isDone: boolean,
) {
  const item = await prisma.eventScheduleItem.findFirst({
    where: { id: itemId, event: { institutionId } },
  });
  if (!item) throw notFound('Schedule item not found');
  const updated = await prisma.eventScheduleItem.update({ where: { id: item.id }, data: { isDone } });
  return { id: updated.id, isDone: updated.isDone };
}

export async function addVolunteer(
  userId: string,
  institutionId: string,
  eventId: string,
  body: { rollNo: string; role?: string },
) {
  const event = await prisma.event.findFirst({ where: { id: eventId, institutionId } });
  if (!event) throw notFound('Event not found');

  const profile = await prisma.studentProfile.findFirst({
    where: { rollNo: body.rollNo, user: { institutionId, deletedAt: null } },
    include: { user: { select: { fullName: true } } },
  });
  if (!profile) throw notFound(`No student with roll no ${body.rollNo}`);

  const existing = await prisma.eventVolunteer.findFirst({
    where: { eventId, studentProfileId: profile.id },
  });
  if (existing) throw conflict('Student is already a volunteer for this event');

  const vol = await prisma.eventVolunteer.create({
    data: { eventId, studentProfileId: profile.id, role: body.role ?? null },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: profile.userId,
      type: 'EVENT',
      title: `Volunteer assignment: ${event.title}`,
      body: `You've been assigned as a volunteer${body.role ? ` (${body.role})` : ''} for ${event.title}.`,
      sourceModule: 'sports',
    },
  });

  return { id: vol.id, name: profile.user.fullName, role: vol.role };
}

async function fanOutToStudents(
  institutionId: string,
  recipientIds: string[],
  title: string,
  body: string,
) {
  if (recipientIds.length === 0) return 0;
  await prisma.notification.createMany({
    data: recipientIds.map((rid) => ({
      institutionId,
      recipientUserId: rid,
      type: 'BROADCAST',
      title,
      body,
      sourceModule: 'sports',
    })),
  });
  return recipientIds.length;
}

export async function announceEvent(
  userId: string,
  institutionId: string,
  eventId: string,
) {
  const event = await prisma.event.findFirst({ where: { id: eventId, institutionId } });
  if (!event) throw notFound('Event not found');

  const students = await prisma.studentProfile.findMany({
    where: { user: { institutionId, deletedAt: null } },
    select: { userId: true },
  });
  const recipients = await fanOutToStudents(
    institutionId,
    students.map((s) => s.userId),
    `Announcement: ${event.title}`,
    event.description ?? `${event.title} is coming up. Check the events tab for details!`,
  );

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'event.announce',
    entityType: 'Event',
    entityId: event.id,
    after: { recipients },
  });
  return { recipients };
}

// ── SP-03 Teams ──────────────────────────────────────────────
export async function listTeams(institutionId: string) {
  const teams = await prisma.team.findMany({
    where: { institutionId },
    include: {
      _count: { select: { members: true } },
      tournament: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // captains resolved separately (scalar id, no relation)
  const captainIds = teams.map((t) => t.captainStudentProfileId).filter((x): x is string => x !== null);
  const captains = await prisma.studentProfile.findMany({
    where: { id: { in: captainIds } },
    include: { user: { select: { fullName: true } } },
  });
  const captainNames = new Map(captains.map((c) => [c.id, c.user.fullName]));

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    sport: t.sport,
    members: t._count.members,
    captain: t.captainStudentProfileId ? captainNames.get(t.captainStudentProfileId) ?? null : null,
    tournament: t.tournament?.name ?? null,
  }));
}

export async function getTeamDetail(institutionId: string, teamId: string) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, institutionId },
    include: {
      members: {
        include: { studentProfile: { include: { user: { select: { fullName: true } } } } },
        orderBy: { joinedAt: 'asc' },
      },
      fixturesA: { include: { teamB: { select: { name: true } } }, orderBy: { fixtureDate: 'desc' } },
      fixturesB: { include: { teamA: { select: { name: true } } }, orderBy: { fixtureDate: 'desc' } },
      standings: { select: { played: true, won: true, lost: true, points: true } },
    },
  });
  if (!team) throw notFound('Team not found');

  // captainStudentProfileId is a scalar — resolve the captain separately
  const captainProfile = team.captainStudentProfileId
    ? await prisma.studentProfile.findFirst({
        where: { id: team.captainStudentProfileId },
        include: { user: { select: { fullName: true } } },
      })
    : null;

  const standing = team.standings[0];
  const fixtures = [
    ...team.fixturesA.map((f) => ({ f, opponent: f.teamB.name })),
    ...team.fixturesB.map((f) => ({ f, opponent: f.teamA.name })),
  ]
    .sort((a, b) => b.f.fixtureDate.getTime() - a.f.fixtureDate.getTime())
    .map(({ f, opponent }) => ({
      id: f.id,
      opponent,
      date: f.fixtureDate,
      status: f.status, // UPCOMING | TODAY | COMPLETED
      result: f.resultJson ? (JSON.parse(f.resultJson) as { winner: string; scoreA: number; scoreB: number }) : null,
      side: f.teamAId === team.id ? 'A' : 'B',
    }));

  return {
    id: team.id,
    name: team.name,
    sport: team.sport,
    captain: captainProfile?.user.fullName ?? null,
    tournament: null,
    members: team.members.map((m) => ({
      id: m.id,
      name: m.studentProfile.user.fullName,
      role: m.role, // PLAYER | CAPTAIN
    })),
    record: standing ? { played: standing.played, won: standing.won, lost: standing.lost, points: standing.points } : null,
    fixtures,
  };
}

export async function addPlayer(
  userId: string,
  institutionId: string,
  teamId: string,
  body: { rollNo: string; role: 'PLAYER' | 'CAPTAIN' },
) {
  const team = await prisma.team.findFirst({ where: { id: teamId, institutionId } });
  if (!team) throw notFound('Team not found');

  const profile = await prisma.studentProfile.findFirst({
    where: { rollNo: body.rollNo, user: { institutionId, deletedAt: null } },
    include: { user: { select: { fullName: true } } },
  });
  if (!profile) throw notFound(`No student with roll no ${body.rollNo}`);

  const existing = await prisma.teamMember.findFirst({
    where: { teamId, studentProfileId: profile.id },
  });
  if (existing) throw conflict(`${profile.user.fullName} is already on the ${team.name} roster`);

  await prisma.teamMember.create({
    data: { teamId, studentProfileId: profile.id, role: body.role },
  });

  if (body.role === 'CAPTAIN') {
    await prisma.team.update({ where: { id: team.id }, data: { captainStudentProfileId: profile.id } });
  }

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: profile.userId,
      type: 'TEAM',
      title: `Added to ${team.name}`,
      body: `You've been added to the ${team.name} roster${body.role === 'CAPTAIN' ? ' as CAPTAIN' : ''}.`,
      sourceModule: 'sports',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'team.add_player',
    entityType: 'TeamMember',
    entityId: team.id,
    after: { team: team.name, rollNo: body.rollNo, role: body.role },
  });

  return { ok: true, name: profile.user.fullName };
}

async function syncStanding(tournamentId: string, teamId: string, won: boolean, played = 1) {
  const standing = await prisma.standing.findFirst({ where: { tournamentId, teamId } });
  if (standing) {
    await prisma.standing.update({
      where: { id: standing.id },
      data: {
        played: { increment: played },
        won: won ? { increment: 1 } : undefined,
        lost: won ? undefined : { increment: 1 },
        points: won ? { increment: 3 } : { increment: 1 },
      },
    });
  } else {
    await prisma.standing.create({
      data: {
        tournamentId,
        teamId,
        played,
        won: won ? 1 : 0,
        lost: won ? 0 : 1,
        points: won ? 3 : 1,
      },
    });
  }
}

export async function scheduleFixture(
  _userId: string,
  institutionId: string,
  body: { tournamentId: string; teamAId: string; teamBId: string; fixtureDate: Date },
) {
  const tournament = await prisma.tournament.findFirst({
    where: { id: body.tournamentId, institutionId },
  });
  if (!tournament) throw notFound('Tournament not found');
  if (body.teamAId === body.teamBId) throw unprocessable('A team cannot play itself');

  const [a, b] = await Promise.all([
    prisma.team.findFirst({ where: { id: body.teamAId, institutionId } }),
    prisma.team.findFirst({ where: { id: body.teamBId, institutionId } }),
  ]);
  if (!a || !b) throw notFound('Both teams must exist');
  if (a.tournamentId !== tournament.id || b.tournamentId !== tournament.id) {
    throw unprocessable('Teams must belong to the tournament');
  }

  const fixture = await prisma.fixture.create({
    data: {
      tournamentId: tournament.id,
      teamAId: a.id,
      teamBId: b.id,
      fixtureDate: body.fixtureDate,
      status: 'UPCOMING',
    },
    include: { teamA: { select: { name: true } }, teamB: { select: { name: true } } },
  });

  return { id: fixture.id, match: `${fixture.teamA.name} vs ${fixture.teamB.name}`, date: fixture.fixtureDate };
}

export async function recordResult(
  userId: string,
  institutionId: string,
  fixtureId: string,
  body: { winner: 'A' | 'B' | 'DRAW'; scoreA: number; scoreB: number },
) {
  const fixture = await prisma.fixture.findFirst({
    where: { id: fixtureId, tournament: { institutionId } },
    include: { tournament: { select: { id: true, name: true } }, teamA: { select: { name: true } }, teamB: { select: { name: true } } },
  });
  if (!fixture) throw notFound('Fixture not found');
  if (fixture.status === 'COMPLETED') throw conflict('Result already recorded for this fixture');

  const result = { winner: body.winner, scoreA: body.scoreA, scoreB: body.scoreB };
  await prisma.fixture.update({
    where: { id: fixture.id },
    data: { status: 'COMPLETED', resultJson: JSON.stringify(result) },
  });

  // Auto-update standings — draw: 1 pt each; win: 3 pts
  if (body.winner === 'DRAW') {
    await syncStanding(fixture.tournament.id, fixture.teamAId, false);
    await syncStanding(fixture.tournament.id, fixture.teamBId, false);
  } else {
    const winnerId = body.winner === 'A' ? fixture.teamAId : fixture.teamBId;
    const loserId = body.winner === 'A' ? fixture.teamBId : fixture.teamAId;
    await syncStanding(fixture.tournament.id, winnerId, true);
    await syncStanding(fixture.tournament.id, loserId, false);
  }

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'fixture.record_result',
    entityType: 'Fixture',
    entityId: fixture.id,
    after: { tournament: fixture.tournament.name, ...result },
  });

  return { id: fixture.id, status: 'COMPLETED', result };
}

// ── SP-04 Tournaments (fixtures + standings) ────────────────
export async function listTournaments(institutionId: string, sport?: string) {
  const tournaments = await prisma.tournament.findMany({
    where: { institutionId, ...(sport ? { sport } : {}) },
    include: {
      fixtures: {
        include: {
          teamA: { select: { id: true, name: true } },
          teamB: { select: { id: true, name: true } },
        },
        orderBy: { fixtureDate: 'asc' },
      },
      standings: {
        include: { team: { select: { name: true } } },
        orderBy: { points: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return tournaments.map((t) => ({
    id: t.id,
    name: t.name,
    sport: t.sport,
    category: t.category,
    status: t.status, // UPCOMING | ONGOING | COMPLETED
    fixtures: t.fixtures.map((f) => ({
      id: f.id,
      teamA: f.teamA.name,
      teamB: f.teamB.name,
      date: f.fixtureDate,
      status: f.status, // UPCOMING | TODAY | COMPLETED
      result: f.resultJson ? (JSON.parse(f.resultJson) as { winner: string; scoreA: number; scoreB: number }) : null,
    })),
    standings: t.standings.map((s, idx) => ({
      pos: idx + 1,
      team: s.team.name,
      played: s.played,
      won: s.won,
      lost: s.lost,
      points: s.points,
    })),
  }));
}

// ── SP-05 Equipment ──────────────────────────────────────────
export async function listEquipment(institutionId: string) {
  const [items, issues] = await Promise.all([
    prisma.equipmentItem.findMany({
      where: { institutionId },
      include: { _count: { select: { issues: { where: { status: { in: ['ISSUED', 'OVERDUE'] } } } } } },
      orderBy: { name: 'asc' },
    }),
    prisma.equipmentIssue.findMany({
      where: { item: { institutionId }, status: { in: ['ISSUED', 'OVERDUE'] } },
      include: {
        item: { select: { name: true } },
        studentProfile: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { dueAt: 'asc' },
    }),
  ]);

  return {
    stats: {
      totalItems: items.length,
      issuedOut: issues.length,
      overdue: issues.filter((i) => i.status === 'OVERDUE').length,
    },
    inventory: items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      total: i.totalUnits,
      available: i.availableUnits,
      out: i._count.issues,
      condition: i.condition, // GOOD | NEEDS_REPAIR
    })),
    issued: issues.map((i) => ({
      id: i.id,
      item: i.item.name,
      student: i.studentProfile.user.fullName,
      issuedAt: i.issuedAt,
      dueAt: i.dueAt,
      status: i.status, // ISSUED | OVERDUE
    })),
  };
}

export async function addEquipment(
  userId: string,
  institutionId: string,
  body: { name: string; category: 'SPORTS' | 'CULTURAL' | 'IT'; totalUnits: number; condition: 'GOOD' | 'NEEDS_REPAIR' },
) {
  const existing = await prisma.equipmentItem.findFirst({
    where: { institutionId, name: body.name },
  });
  if (existing) throw conflict(`Equipment "${body.name}" already exists`);

  const item = await prisma.equipmentItem.create({
    data: { institutionId, name: body.name, category: body.category, totalUnits: body.totalUnits, availableUnits: body.totalUnits, condition: body.condition },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'equipment.create',
    entityType: 'EquipmentItem',
    entityId: item.id,
    after: { name: item.name, totalUnits: item.totalUnits },
  });

  return { id: item.id, name: item.name };
}

export async function issueEquipment(
  _userId: string,
  institutionId: string,
  body: { itemId: string; rollNo: string; dueAt: Date },
) {
  const item = await prisma.equipmentItem.findFirst({ where: { id: body.itemId, institutionId } });
  if (!item) throw notFound('Equipment item not found');
  if (item.availableUnits <= 0) throw unprocessable(`No ${item.name} units available`);

  const profile = await prisma.studentProfile.findFirst({
    where: { rollNo: body.rollNo, user: { institutionId, deletedAt: null } },
    include: { user: { select: { fullName: true } } },
  });
  if (!profile) throw notFound(`No student with roll no ${body.rollNo}`);

  const issue = await prisma.equipmentIssue.create({
    data: { itemId: item.id, studentProfileId: profile.id, dueAt: body.dueAt, status: 'ISSUED' },
  });
  await prisma.equipmentItem.update({
    where: { id: item.id },
    data: { availableUnits: { decrement: 1 } },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: profile.userId,
      type: 'EQUIPMENT',
      title: `Equipment issued: ${item.name}`,
      body: `${item.name} has been issued to you. Due back ${body.dueAt.toDateString()}.`,
      sourceModule: 'sports',
    },
  });

  return { id: issue.id, item: item.name, student: profile.user.fullName };
}

export async function returnEquipment(_userId: string, institutionId: string, issueId: string) {
  const issue = await prisma.equipmentIssue.findFirst({
    where: { id: issueId, item: { institutionId } },
    include: { item: { select: { id: true, name: true } }, studentProfile: { include: { user: { select: { fullName: true } } } } },
  });
  if (!issue) throw notFound('Issue record not found');
  if (issue.status === 'RETURNED') throw conflict('Already returned');

  await prisma.equipmentIssue.update({
    where: { id: issue.id },
    data: { status: 'RETURNED', returnedAt: new Date() },
  });
  await prisma.equipmentItem.update({
    where: { id: issue.item.id },
    data: { availableUnits: { increment: 1 } },
  });

  return { id: issue.id, status: 'RETURNED', item: issue.item.name, student: issue.studentProfile.user.fullName };
}

// ── SP-06 Venues ─────────────────────────────────────────────
export async function listVenues(institutionId: string) {
  const venues = await prisma.venue.findMany({
    where: { institutionId },
    include: { _count: { select: { bookings: { where: { status: 'PENDING' } } } } },
    orderBy: { name: 'asc' },
  });
  const bookings = await prisma.venueBooking.findMany({
    where: { venue: { institutionId }, status: 'PENDING' },
    include: { venue: { select: { name: true } } },
    orderBy: { date: 'asc' },
  });

  return {
    stats: {
      venues: venues.length,
      pending: bookings.length,
    },
    bookings: bookings.map((b) => ({
      id: b.id,
      venue: b.venue.name,
      eventTitle: b.eventTitle,
      date: b.date,
      timeSlot: b.timeSlot,
      status: b.status,
    })),
    venues: venues.map((v) => ({
      id: v.id,
      name: v.name,
      location: v.location,
      capacity: v.capacity,
      status: v.status, // AVAILABLE | BOOKED | MAINTENANCE
      pendingRequests: v._count.bookings,
    })),
  };
}

export async function decideVenueBooking(
  userId: string,
  institutionId: string,
  bookingId: string,
  decision: 'APPROVED' | 'REJECTED',
) {
  const booking = await prisma.venueBooking.findFirst({
    where: { id: bookingId, venue: { institutionId } },
    include: { venue: { select: { id: true, name: true } } },
  });
  if (!booking) throw notFound('Booking not found');
  if (booking.status !== 'PENDING') throw conflict(`Booking already decided (${booking.status})`);

  if (decision === 'APPROVED') {
    // Conflict check: same venue, overlapping date+slot already APPROVED
    const clash = await prisma.venueBooking.findFirst({
      where: {
        venueId: booking.venueId,
        status: 'APPROVED',
        date: booking.date,
        timeSlot: booking.timeSlot,
        id: { not: booking.id },
      },
    });
    if (clash) throw conflict(`${booking.venue.name} already booked ${booking.timeSlot} that day`);
  }

  const updated = await prisma.venueBooking.update({
    where: { id: booking.id },
    data: { status: decision },
  });

  // First approval flips venue status
  if (decision === 'APPROVED') {
    await prisma.venue.update({ where: { id: booking.venueId }, data: { status: 'BOOKED' } });
  }

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'venue.booking.decide',
    entityType: 'VenueBooking',
    entityId: booking.id,
    after: { venue: booking.venue.name, decision, eventTitle: booking.eventTitle },
  });

  return { id: updated.id, status: updated.status };
}

export async function bookVenue(
  userId: string,
  institutionId: string,
  body: { venueId: string; eventTitle: string; date: Date; timeSlot: string },
) {
  const venue = await prisma.venue.findFirst({ where: { id: body.venueId, institutionId } });
  if (!venue) throw notFound('Venue not found');
  if (venue.status === 'MAINTENANCE') throw unprocessable(`${venue.name} is under maintenance`);

  const clash = await prisma.venueBooking.findFirst({
    where: { venueId: venue.id, date: body.date, timeSlot: body.timeSlot, status: { in: ['PENDING', 'APPROVED'] } },
  });
  if (clash) throw conflict(`${venue.name} already has a booking ${body.timeSlot} that day`);

  const booking = await prisma.venueBooking.create({
    data: {
      venueId: venue.id,
      eventTitle: body.eventTitle,
      requestedByUserId: userId,
      date: body.date,
      timeSlot: body.timeSlot,
      status: 'PENDING',
    },
  });

  return { id: booking.id, venue: venue.name, status: booking.status };
}

// ── SP-07 Notifications + broadcast ──────────────────────────
export async function listNotifications(userId: string, institutionId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientUserId: userId, institutionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { recipientUserId: userId, institutionId, readAt: null } }),
  ]);
  return {
    unread,
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.readAt !== null,
      createdAt: n.createdAt,
      data: n.dataJson ? JSON.parse(n.dataJson) : null,
    })),
  };
}

export async function markAllRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({
    where: { recipientUserId: userId, institutionId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

export async function createBroadcast(
  userId: string,
  institutionId: string,
  body: { audience: 'ALL_STUDENTS' | 'ALL_TEAMS' | 'VOLUNTEERS'; title: string; body: string },
) {
  let recipientIds: string[] = [];

  if (body.audience === 'ALL_STUDENTS') {
    const students = await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null } },
      select: { userId: true },
    });
    recipientIds = students.map((s) => s.userId);
  } else if (body.audience === 'ALL_TEAMS') {
    const members = await prisma.teamMember.findMany({
      where: { team: { institutionId } },
      select: { studentProfile: { select: { userId: true } } },
      distinct: ['studentProfileId'],
    });
    recipientIds = members.map((m) => m.studentProfile.userId);
  } else if (body.audience === 'VOLUNTEERS') {
    const vols = await prisma.eventVolunteer.findMany({
      where: { event: { institutionId } },
      select: { studentProfile: { select: { userId: true } } },
      distinct: ['studentProfileId'],
    });
    recipientIds = vols.map((v) => v.studentProfile.userId);
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId: userId,
      audienceJson: JSON.stringify({ audience: body.audience }),
      title: body.title,
      body: body.body,
      channels: 'IN_APP',
      sentAt: new Date(),
    },
  });

  const recipients = await fanOutToStudents(institutionId, recipientIds, body.title, body.body);

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'broadcast.send',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: { audience: body.audience, recipients },
  });

  return { id: broadcast.id, recipients };
}

// ── SP-08 Profile ────────────────────────────────────────────
export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId },
    include: { roles: true, staffProfile: { select: { designation: true, employeeNo: true } } },
  });
  if (!user) throw notFound('User not found');

  const [teams, events, equipment] = await Promise.all([
    prisma.team.count({ where: { institutionId } }),
    prisma.event.count({ where: { institutionId, category: { not: 'ALUMNI' } } }),
    prisma.equipmentItem.count({ where: { institutionId } }),
  ]);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles.map((r) => r.role),
    designation: user.staffProfile?.designation ?? null,
    stats: { teams, events, equipment },
  };
}
