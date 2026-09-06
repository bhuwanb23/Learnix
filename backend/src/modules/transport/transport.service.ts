import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

// ── helpers ──────────────────────────────────────────────────
const rupees = (minor: number) => minor / 100;

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

// ── R-01 Dashboard ───────────────────────────────────────────
export async function getDashboard(_userId: string, institutionId: string) {
  const [vehicles, routes, students, positions, serviceQueue] = await Promise.all([
    prisma.vehicle.findMany({ where: { institutionId }, select: { id: true, status: true, fuelPct: true, regNo: true } }),
    prisma.route.findMany({
      where: { institutionId },
      include: {
        vehicle: { select: { regNo: true } },
        positions: { select: { status: true } },
        _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
      },
    }),
    prisma.routeEnrollment.count({ where: { route: { institutionId }, status: 'ACTIVE' } }),
    prisma.busPosition.findMany({
      where: { route: { institutionId } },
      include: { route: { select: { name: true } }, vehicle: { select: { regNo: true } }, currentStop: { select: { stopName: true } } },
    }),
    prisma.serviceRecord.findMany({
      where: { vehicle: { institutionId }, status: { not: 'COMPLETED' } },
      include: { vehicle: { select: { regNo: true } } },
      orderBy: { serviceDate: 'asc' },
    }),
  ]);

  const onRoad = vehicles.filter((v) => v.status === 'ON_ROAD').length;
  const inService = vehicles.filter((v) => v.status === 'SERVICE').length;
  const delayedRoutes = routes.filter((r) => r.positions.some((p) => p.status === 'DELAYED')).length;
  const livePositions = positions.filter((p) => p.status === 'ON_TIME');
  const onTimePct = positions.length === 0 ? 100 : Math.round((livePositions.length / positions.length) * 100);

  // Alerts: service queue + low fuel (< 30%)
  const lowFuel = vehicles.filter((v) => v.fuelPct < 30);
  const alerts = [
    ...serviceQueue.map((s) => ({
      type: 'SERVICE' as const,
      severity: s.status === 'IN_PROGRESS' ? 'HIGH' : 'MEDIUM',
      message: `${s.vehicle.regNo} — ${s.type.toLowerCase()} service ${s.status.replace('_', ' ').toLowerCase()} (₹${rupees(s.costMinor)})`,
    })),
    ...lowFuel.map((v) => ({
      type: 'FUEL' as const,
      severity: 'HIGH' as const,
      message: `${v.regNo} fuel at ${v.fuelPct}% — refuel before the next trip`,
    })),
  ];

  return {
    stats: {
      vehicles: vehicles.length,
      onRoad,
      inService,
      routes: routes.length,
      students,
      delayedRoutes,
      onTimePct,
      servicePending: serviceQueue.length,
    },
    todayRoutes: routes.map((r) => ({
      id: r.id,
      name: r.name,
      students: r._count.enrollments,
      bus: r.vehicle?.regNo ?? null,
      status: r.positions[0]?.status ?? null, // ON_TIME | DELAYED | null (not live)
    })),
    alerts,
  };
}

// ── R-02 Routes + stops + enrollment ─────────────────────────
export async function listRoutes(institutionId: string) {
  const routes = await prisma.route.findMany({
    where: { institutionId },
    include: {
      vehicle: { select: { id: true, regNo: true } },
      stops: { orderBy: { order: 'asc' } },
      enrollments: { where: { status: 'ACTIVE' }, include: { studentProfile: { include: { user: { select: { fullName: true } } } } } },
      positions: { select: { status: true, etaMin: true } },
    },
    orderBy: { name: 'asc' },
  });

  return routes.map((r) => ({
    id: r.id,
    name: r.name,
    distanceKm: r.distanceKm,
    stops: r.stops.length,
    students: r.enrollments.length,
    bus: r.vehicle?.regNo ?? null,
    driver: null,
    status: r.positions[0]?.status ?? 'IDLE',
    etaMin: r.positions[0]?.etaMin ?? null,
    firstPickup: r.stops[0]?.time ?? null,
    lastDrop: r.stops[r.stops.length - 1]?.time ?? null,
  }));
}

export async function getRouteDetail(institutionId: string, routeId: string) {
  const route = await prisma.route.findFirst({
    where: { id: routeId, institutionId },
    include: {
      vehicle: { select: { id: true, regNo: true, model: true, status: true } },
      stops: {
        orderBy: { order: 'asc' },
        include: {
          enrollments: { where: { status: 'ACTIVE' }, include: { studentProfile: { include: { user: { select: { fullName: true } } } } } },
        },
      },
      positions: {
        include: { currentStop: { select: { stopName: true } } },
        orderBy: { pingedAt: 'desc' },
        take: 1,
      },
    },
  });
  if (!route) throw notFound('Route not found');

  // driver of the route's bus via drivers table match on name isn't possible —
  // drivers carry staffUserId; routes carry driverUserId scalar mirror
  let driverName: string | null = null;
  if (route.driverUserId) {
    const drv = await prisma.driver.findFirst({
      where: { institutionId, staffUserId: route.driverUserId },
    });
    driverName = drv?.name ?? null;
  }
  if (!driverName) {
    const anyDriver = await prisma.driver.findFirst({ where: { institutionId, dutyStatus: 'ON_DUTY' } });
    driverName = anyDriver?.name ?? null;
  }

  const position = route.positions[0] ?? null;
  const passedOrder = position?.currentStopId
    ? route.stops.find((s) => s.id === position.currentStopId)?.order ?? 0
    : 0;

  return {
    id: route.id,
    name: route.name,
    distanceKm: route.distanceKm,
    bus: route.vehicle ? { id: route.vehicle.id, regNo: route.vehicle.regNo, model: route.vehicle.model, status: route.vehicle.status } : null,
    driver: driverName,
    students: route.stops.reduce((s, st) => s + st.enrollments.length, 0),
    live: position
      ? {
          status: position.status,
          speedKmh: position.speedKmh,
          etaMin: position.etaMin,
          at: position.currentStop?.stopName ?? null,
          pingedAt: position.pingedAt,
        }
      : null,
    timeline: route.stops.map((s) => ({
      id: s.id,
      order: s.order,
      stopName: s.stopName,
      time: s.time,
      students: s.enrollments.map((e) => e.studentProfile.user.fullName),
      passed: s.order <= passedOrder,
    })),
  };
}

export async function createRoute(
  userId: string,
  institutionId: string,
  body: { name: string; distanceKm: number; vehicleId?: string },
) {
  const existing = await prisma.route.findFirst({ where: { institutionId, name: body.name } });
  if (existing) throw conflict(`Route "${body.name}" already exists`);

  if (body.vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: body.vehicleId, institutionId } });
    if (!vehicle) throw notFound('Vehicle not found');
  }

  const route = await prisma.route.create({
    data: {
      institutionId,
      name: body.name,
      distanceKm: body.distanceKm,
      vehicleId: body.vehicleId ?? null,
      driverUserId: userId,
    },
    include: { vehicle: { select: { regNo: true } } },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'route.create',
    entityType: 'Route',
    entityId: route.id,
    after: { name: route.name, distanceKm: route.distanceKm },
  });

  return { id: route.id, name: route.name, bus: route.vehicle?.regNo ?? null };
}

export async function addStop(
  _userId: string,
  institutionId: string,
  routeId: string,
  body: { stopName: string; time: string },
) {
  const route = await prisma.route.findFirst({ where: { id: routeId, institutionId } });
  if (!route) throw notFound('Route not found');

  const last = await prisma.routeStop.findFirst({ where: { routeId }, orderBy: { order: 'desc' } });
  const stop = await prisma.routeStop.create({
    data: { routeId, order: (last?.order ?? 0) + 1, stopName: body.stopName, time: body.time },
  });
  return { id: stop.id, order: stop.order, stopName: stop.stopName, time: stop.time };
}

export async function enrollStudent(
  userId: string,
  institutionId: string,
  routeId: string,
  body: { rollNo: string; order: number },
) {
  const route = await prisma.route.findFirst({
    where: { id: routeId, institutionId },
    include: { stops: { orderBy: { order: 'asc' } } },
  });
  if (!route) throw notFound('Route not found');

  const stop = route.stops.find((s) => s.order === body.order);
  if (!stop) throw unprocessable(`Route has no stop #${body.order}`);

  const profile = await prisma.studentProfile.findFirst({
    where: { rollNo: body.rollNo, user: { institutionId, deletedAt: null } },
    include: { user: { select: { fullName: true } } },
  });
  if (!profile) throw notFound(`No student with roll no ${body.rollNo}`);

  const existing = await prisma.routeEnrollment.findFirst({
    where: { studentProfileId: profile.id, routeId },
  });
  if (existing) {
    if (existing.status === 'ACTIVE') throw conflict(`${profile.user.fullName} is already enrolled on ${route.name}`);
    await prisma.routeEnrollment.update({ where: { id: existing.id }, data: { status: 'ACTIVE', stopId: stop.id } });
  } else {
    await prisma.routeEnrollment.create({
      data: { routeId, stopId: stop.id, studentProfileId: profile.id, status: 'ACTIVE' },
    });
  }

  // Fee due for the current academic year if none exists (auto-generate on enrollment)
  const ay = await prisma.academicYear.findFirst({ where: { institutionId, isCurrent: true } });
  if (ay) {
    const due = await prisma.transportFeeDue.findUnique({
      where: { studentProfileId_academicYearId: { studentProfileId: profile.id, academicYearId: ay.id } },
    });
    if (!due) {
      await prisma.transportFeeDue.create({
        data: { studentProfileId: profile.id, academicYearId: ay.id, amountMinor: 1800000, status: 'UNPAID' },
      });
    }
  }

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: profile.userId,
      type: 'TRANSPORT',
      title: `Enrolled on ${route.name}`,
      body: `You've been enrolled on ${route.name}, pickup at ${stop.stopName} (${stop.time}).`,
      sourceModule: 'transport',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'route.enroll',
    entityType: 'RouteEnrollment',
    entityId: route.id,
    after: { route: route.name, rollNo: body.rollNo, stop: stop.stopName },
  });

  return { ok: true, student: profile.user.fullName, stop: stop.stopName };
}

export async function removeEnrollment(_userId: string, institutionId: string, enrollmentId: string) {
  const enrollment = await prisma.routeEnrollment.findFirst({
    where: { id: enrollmentId, route: { institutionId } },
    include: { studentProfile: { include: { user: { select: { fullName: true } } } }, route: { select: { name: true } } },
  });
  if (!enrollment) throw notFound('Enrollment not found');
  if (enrollment.status === 'REMOVED') throw conflict('Already removed');

  await prisma.routeEnrollment.update({ where: { id: enrollment.id }, data: { status: 'REMOVED' } });
  return { id: enrollment.id, student: enrollment.studentProfile.user.fullName };
}

// ── R-03 Fleet ───────────────────────────────────────────────
export async function listFleet(institutionId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { institutionId },
    include: {
      document: true,
      routes: { select: { name: true } },
      position: { select: { status: true } },
    },
    orderBy: { regNo: 'asc' },
  });

  return vehicles.map((v) => {
    const doc = v.document;
    const expiringDocs = doc
      ? [
          { kind: 'Registration', date: doc.registrationExpiry, days: daysUntil(doc.registrationExpiry) },
          { kind: 'Insurance', date: doc.insuranceExpiry, days: daysUntil(doc.insuranceExpiry) },
          { kind: 'Fitness', date: doc.fitnessExpiry, days: daysUntil(doc.fitnessExpiry) },
        ].filter((d) => d.days <= 60)
      : [];
    return {
      id: v.id,
      regNo: v.regNo,
      model: v.model,
      capacity: v.capacity,
      odometerKm: v.odometerKm,
      fuelPct: v.fuelPct,
      status: v.status, // ON_ROAD | IDLE | SERVICE
      route: v.routes[0]?.name ?? null,
      liveStatus: v.position?.status ?? null,
      docsExpiring: expiringDocs,
    };
  });
}

export async function getVehicleDetail(institutionId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, institutionId },
    include: {
      document: true,
      routes: { select: { id: true, name: true } },
      serviceRecords: { orderBy: { serviceDate: 'desc' } },
      fuelLogs: { orderBy: { filledAt: 'desc' }, take: 10 },
      position: { include: { route: { select: { name: true } }, currentStop: { select: { stopName: true } } } },
    },
  });
  if (!vehicle) throw notFound('Vehicle not found');

  return {
    id: vehicle.id,
    regNo: vehicle.regNo,
    model: vehicle.model,
    capacity: vehicle.capacity,
    odometerKm: vehicle.odometerKm,
    fuelPct: vehicle.fuelPct,
    status: vehicle.status,
    route: vehicle.routes[0]?.name ?? null,
    documents: vehicle.document
      ? {
          registrationExpiry: vehicle.document.registrationExpiry,
          insuranceExpiry: vehicle.document.insuranceExpiry,
          fitnessExpiry: vehicle.document.fitnessExpiry,
        }
      : null,
    serviceHistory: vehicle.serviceRecords.map((s) => ({
      id: s.id,
      type: s.type,
      costMinor: s.costMinor,
      serviceDate: s.serviceDate,
      status: s.status,
    })),
    fuelLogs: vehicle.fuelLogs.map((f) => ({
      id: f.id,
      litres: f.litres,
      amountMinor: f.amountMinor,
      filledAt: f.filledAt,
    })),
    live: vehicle.position
      ? {
          route: vehicle.position.route.name,
          status: vehicle.position.status,
          at: vehicle.position.currentStop?.stopName ?? null,
        }
      : null,
  };
}

export async function recordService(
  userId: string,
  institutionId: string,
  vehicleId: string,
  body: { type: 'PERIODIC' | 'REPAIR' | 'INSPECTION'; costMinor: number; serviceDate: Date },
) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, institutionId } });
  if (!vehicle) throw notFound('Vehicle not found');

  const record = await prisma.serviceRecord.create({
    data: { vehicleId, type: body.type, costMinor: body.costMinor, serviceDate: body.serviceDate, status: 'SCHEDULED' },
    include: { vehicle: { select: { regNo: true } } },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'vehicle.service.record',
    entityType: 'ServiceRecord',
    entityId: record.id,
    after: { vehicle: vehicle.regNo, type: body.type, cost: body.costMinor },
  });

  return { id: record.id, vehicle: vehicle.regNo, status: record.status };
}

export async function completeService(
  userId: string,
  institutionId: string,
  serviceId: string,
  odometerKm?: number,
) {
  const record = await prisma.serviceRecord.findFirst({
    where: { id: serviceId, vehicle: { institutionId } },
    include: { vehicle: { select: { id: true, regNo: true } } },
  });
  if (!record) throw notFound('Service record not found');
  if (record.status === 'COMPLETED') throw conflict('Service already completed');

  const updated = await prisma.serviceRecord.update({
    where: { id: record.id },
    data: { status: 'COMPLETED' },
  });

  if (odometerKm !== undefined && odometerKm > 0) {
    await prisma.vehicle.update({
      where: { id: record.vehicle.id },
      data: { odometerKm, status: 'IDLE' },
    });
  } else if (record.vehicle) {
    await prisma.vehicle.update({ where: { id: record.vehicle.id }, data: { status: 'IDLE' } });
  }

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'vehicle.service.complete',
    entityType: 'ServiceRecord',
    entityId: record.id,
    after: { vehicle: record.vehicle.regNo, odometerKm: odometerKm ?? null },
  });

  return { id: updated.id, status: updated.status, vehicle: record.vehicle.regNo };
}

export async function addFuelLog(
  _userId: string,
  institutionId: string,
  vehicleId: string,
  body: { litres: number; amountMinor: number },
) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, institutionId } });
  if (!vehicle) throw notFound('Vehicle not found');

  const log = await prisma.fuelLog.create({
    data: { vehicleId, litres: body.litres, amountMinor: body.amountMinor, filledAt: new Date() },
  });

  // refuel raises fuel level (capped 100)
  const newFuel = Math.min(100, vehicle.fuelPct + Math.round(body.litres));

  await prisma.vehicle.update({ where: { id: vehicleId }, data: { fuelPct: newFuel } });

  return { id: log.id, vehicle: vehicle.regNo, fuelPct: newFuel };
}

// ── R-04 Drivers ─────────────────────────────────────────────
export async function listDrivers(institutionId: string) {
  const drivers = await prisma.driver.findMany({
    where: { institutionId },
    orderBy: { name: 'asc' },
  });

  // map drivers to routes via driverUserId mirror
  const routes = await prisma.route.findMany({
    where: { institutionId, driverUserId: { not: null } },
    select: { name: true, driverUserId: true },
  });
  const routeByUser = new Map(routes.map((r) => [r.driverUserId!, r.name]));

  return drivers.map((d) => ({
    id: d.id,
    name: d.name,
    licenseNo: d.licenseNo,
    licenseExpiry: d.licenseExpiry,
    licenseDaysLeft: daysUntil(d.licenseExpiry),
    experienceYears: d.experienceYears,
    dutyStatus: d.dutyStatus, // ON_DUTY | OFF_DUTY | ON_LEAVE
    route: d.staffUserId ? routeByUser.get(d.staffUserId) ?? null : null,
  }));
}

export async function setDutyStatus(
  userId: string,
  institutionId: string,
  driverId: string,
  dutyStatus: 'ON_DUTY' | 'OFF_DUTY' | 'ON_LEAVE',
) {
  const driver = await prisma.driver.findFirst({ where: { id: driverId, institutionId } });
  if (!driver) throw notFound('Driver not found');
  const updated = await prisma.driver.update({ where: { id: driver.id }, data: { dutyStatus } });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'driver.duty.set',
    entityType: 'Driver',
    entityId: driver.id,
    after: { driver: driver.name, dutyStatus },
  });

  return { id: updated.id, name: updated.name, dutyStatus: updated.dutyStatus };
}

// ── R-05 enrollment list (per route) — covered in getRouteDetail

// ── R-06 Live tracking ───────────────────────────────────────
export async function getTracking(institutionId: string) {
  const positions = await prisma.busPosition.findMany({
    where: { route: { institutionId } },
    include: {
      vehicle: { select: { regNo: true, model: true } },
      route: { select: { id: true, name: true, stops: { orderBy: { order: 'asc' } } } },
      currentStop: { select: { stopName: true, order: true } },
    },
    orderBy: { pingedAt: 'desc' },
  });

  return positions.map((p) => {
    const totalStops = p.route.stops.length;
    const passedStops = p.currentStop?.order ?? 0;
    return {
      id: p.id,
      vehicleId: p.vehicleId,
      routeId: p.routeId,
      route: p.route.name,
      bus: p.vehicle.regNo,
      model: p.vehicle.model,
      currentStop: p.currentStop?.stopName ?? null,
      speedKmh: p.speedKmh,
      etaMin: p.etaMin,
      status: p.status, // ON_TIME | DELAYED
      pingedAt: p.pingedAt,
      progressPct: totalStops === 0 ? 0 : Math.round((passedStops / totalStops) * 100),
    };
  });
}

export async function pingBus(
  userId: string,
  institutionId: string,
  vehicleId: string,
  body: { currentStopOrder?: number; speedKmh: number; etaMin?: number; status: 'ON_TIME' | 'DELAYED' },
) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, institutionId } });
  if (!vehicle) throw notFound('Vehicle not found');

  const route = await prisma.route.findFirst({ where: { vehicleId, institutionId } });
  if (!route) throw unprocessable(`${vehicle.regNo} is not assigned to a route`);

  let currentStopId: string | null = null;
  if (body.currentStopOrder !== undefined) {
    const stop = await prisma.routeStop.findFirst({ where: { routeId: route.id, order: body.currentStopOrder } });
    if (!stop) throw unprocessable(`Route has no stop #${body.currentStopOrder}`);
    currentStopId = stop.id;
  } else {
    const existing = await prisma.busPosition.findUnique({ where: { vehicleId } });
    currentStopId = existing?.currentStopId ?? null;
  }

  const prev = await prisma.busPosition.findUnique({ where: { vehicleId } });
  const wasDelayed = prev?.status === 'DELAYED';

  const position = await prisma.busPosition.upsert({
    where: { vehicleId },
    update: {
      speedKmh: body.speedKmh,
      etaMin: body.etaMin ?? prev?.etaMin ?? null,
      status: body.status,
      currentStopId,
      pingedAt: new Date(),
    },
    create: {
      vehicleId,
      routeId: route.id,
      currentStopId,
      speedKmh: body.speedKmh,
      lat: 13.0632, // campus default — real GPS coords arrive with the device phase
      lng: 77.6612,
      etaMin: body.etaMin ?? null,
      status: body.status,
      pingedAt: new Date(),
    },
  });

  // First transition to DELAYED notifies enrolled students once
  if (body.status === 'DELAYED' && !wasDelayed) {
    const enrollments = await prisma.routeEnrollment.findMany({
      where: { routeId: route.id, status: 'ACTIVE' },
      include: { studentProfile: { select: { userId: true } } },
    });
    await prisma.notification.createMany({
      data: enrollments.map((e) => ({
        institutionId,
        recipientUserId: e.studentProfile.userId,
        type: 'DELAY',
        title: `${route.name} is delayed`,
        body: `Bus ${vehicle.regNo} is running delayed. Updated ETA: ${position.etaMin ?? '?'} min.`,
        sourceModule: 'transport',
      })),
    });
  }

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'bus.ping',
    entityType: 'BusPosition',
    entityId: position.id,
    after: { vehicle: vehicle.regNo, status: body.status, speed: body.speedKmh },
  });

  return {
    id: position.id,
    bus: vehicle.regNo,
    route: route.name,
    status: position.status,
    etaMin: position.etaMin,
  };
}

// ── R-07 Maintenance queue ───────────────────────────────────
export async function getMaintenance(institutionId: string) {
  const records = await prisma.serviceRecord.findMany({
    where: { vehicle: { institutionId } },
    include: { vehicle: { select: { regNo: true, model: true } } },
    orderBy: [{ status: 'asc' }, { serviceDate: 'desc' }],
  });

  const fuelLogs = await prisma.fuelLog.findMany({
    where: { vehicle: { institutionId } },
    include: { vehicle: { select: { regNo: true } } },
    orderBy: { filledAt: 'desc' },
    take: 15,
  });

  return {
    stats: {
      scheduled: records.filter((r) => r.status === 'SCHEDULED').length,
      inProgress: records.filter((r) => r.status === 'IN_PROGRESS').length,
      completed: records.filter((r) => r.status === 'COMPLETED').length,
      fuelSpendMinor: fuelLogs.reduce((s, f) => s + f.amountMinor, 0),
    },
    queue: records.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      vehicle: r.vehicle.regNo,
      model: r.vehicle.model,
      type: r.type, // PERIODIC | REPAIR | INSPECTION
      costMinor: r.costMinor,
      serviceDate: r.serviceDate,
      status: r.status, // SCHEDULED | IN_PROGRESS | COMPLETED
    })),
    fuelLogs: fuelLogs.map((f) => ({
      id: f.id,
      vehicleId: f.vehicleId,
      vehicle: f.vehicle.regNo,
      litres: f.litres,
      amountMinor: f.amountMinor,
      filledAt: f.filledAt,
    })),
  };
}

// ── R-08 Transport fees ──────────────────────────────────────
export async function listFees(institutionId: string) {
  const dues = await prisma.transportFeeDue.findMany({
    where: { studentProfile: { user: { institutionId, deletedAt: null } } },
    include: {
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
      academicYear: { select: { name: true } },
      payment: { select: { referenceNo: true, paidAt: true, amountMinor: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const expected = dues.reduce((s, d) => s + d.amountMinor, 0);
  const collected = dues.filter((d) => d.status === 'PAID').reduce((s, d) => s + d.amountMinor, 0);

  return {
    stats: {
      total: dues.length,
      unpaid: dues.filter((d) => d.status === 'UNPAID').length,
      paid: dues.filter((d) => d.status === 'PAID').length,
      expectedMinor: expected,
      collectedMinor: collected,
      collectionPct: expected === 0 ? 0 : Math.round((collected / expected) * 100),
    },
    dues: dues.map((d) => ({
      id: d.id,
      studentId: d.studentProfile.id,
      student: d.studentProfile.user.fullName,
      year: d.academicYear.name,
      amountMinor: d.amountMinor,
      status: d.status, // UNPAID | PARTIAL | PAID
      paidRef: d.payment?.referenceNo ?? null,
      paidAt: d.payment?.paidAt ?? null,
    })),
  };
}

export async function remindDue(userId: string, institutionId: string, dueId: string) {
  const due = await prisma.transportFeeDue.findFirst({
    where: { id: dueId, studentProfile: { user: { institutionId } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } }, academicYear: { select: { name: true } } },
  });
  if (!due) throw notFound('Fee due not found');
  if (due.status === 'PAID') throw conflict('Fee already paid — no reminder needed');

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: due.studentProfile.user.id,
      type: 'FEE',
      title: 'Transport fee reminder',
      body: `Your transport fee for ${due.academicYear.name} (₹${rupees(due.amountMinor)}) is still ${due.status}. Please clear it at the accounts office.`,
      sourceModule: 'transport',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'fee.remind',
    entityType: 'TransportFeeDue',
    entityId: due.id,
    after: { student: due.studentProfile.user.fullName },
  });

  return { id: due.id, student: due.studentProfile.user.fullName, reminded: true };
}

export async function collectFee(
  userId: string,
  institutionId: string,
  dueId: string,
  method: 'UPI' | 'NET_BANKING' | 'CARD' | 'CASH',
) {
  const due = await prisma.transportFeeDue.findFirst({
    where: { id: dueId, studentProfile: { user: { institutionId } } },
    include: { studentProfile: { include: { user: { select: { fullName: true } } } }, academicYear: { select: { name: true } } },
  });
  if (!due) throw notFound('Fee due not found');
  if (due.status === 'PAID') throw conflict('Fee already collected');
  if (due.paymentId) throw conflict('A payment is already linked to this due');

  const year = new Date().getFullYear();
  const count = await prisma.payment.count({ where: { institutionId, referenceNo: { startsWith: `PAY-${year}` } } });
  const referenceNo = `PAY-${year}-${String(count + 1).padStart(4, '0')}`;

  // Unified money-in write-through (R-08 → Domain E)
  const payment = await prisma.payment.create({
    data: {
      institutionId,
      studentProfileId: due.studentProfileId,
      category: 'TRANSPORT',
      referenceNo,
      amountMinor: due.amountMinor,
      method,
      status: 'CLEARED',
      paidAt: new Date(),
      recordedByUserId: userId,
    },
  });

  await prisma.transportFeeDue.update({ where: { id: due.id }, data: { status: 'PAID', paymentId: payment.id } });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'fee.collect',
    entityType: 'Payment',
    entityId: payment.id,
    after: { student: due.studentProfile.user.fullName, amount: due.amountMinor, referenceNo, method },
  });

  return { id: payment.id, referenceNo, student: due.studentProfile.user.fullName, amountMinor: due.amountMinor, status: 'PAID' };
}

export async function requestFeeRevision(
  userId: string,
  institutionId: string,
  body: { requestedMinor: number; reason: string },
) {
  // Transport officer asks Accounts/Admin for a structure change — routed as a
  // notification to ADMIN-role users + audited (fee_structures stays Accounts-owned)
  const admins = await prisma.userRole.findMany({
    where: { role: 'ADMIN', user: { institutionId, deletedAt: null } },
    include: { user: { select: { id: true } } },
  });

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      institutionId,
      recipientUserId: a.user.id,
      type: 'FEE',
      title: 'Transport fee revision requested',
      body: `Requested yearly fee: ₹${rupees(body.requestedMinor)}. Reason: ${body.reason}`,
      sourceModule: 'transport',
    })),
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'fee.revision.request',
    entityType: 'FeeStructure',
    after: { requested: body.requestedMinor, reason: body.reason },
  });

  return { requested: true, notifiedAdmins: admins.length };
}

// ── R-09 Notifications + broadcast ───────────────────────────
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
  body: { audience: 'ALL_STUDENTS' | 'ROUTE' | 'DEFAULTERS'; routeId?: string; title: string; body: string },
) {
  let recipientIds: string[] = [];

  if (body.audience === 'ALL_STUDENTS') {
    const enrolls = await prisma.routeEnrollment.findMany({
      where: { route: { institutionId }, status: 'ACTIVE' },
      select: { studentProfile: { select: { userId: true } } },
      distinct: ['studentProfileId'],
    });
    recipientIds = enrolls.map((e) => e.studentProfile.userId);
  } else if (body.audience === 'ROUTE') {
    if (!body.routeId) throw unprocessable('routeId is required for a route broadcast');
    const route = await prisma.route.findFirst({ where: { id: body.routeId, institutionId } });
    if (!route) throw notFound('Route not found');
    const enrolls = await prisma.routeEnrollment.findMany({
      where: { routeId: route.id, status: 'ACTIVE' },
      select: { studentProfile: { select: { userId: true } } },
    });
    recipientIds = enrolls.map((e) => e.studentProfile.userId);
  } else if (body.audience === 'DEFAULTERS') {
    const dues = await prisma.transportFeeDue.findMany({
      where: { studentProfile: { user: { institutionId, deletedAt: null } }, status: { in: ['UNPAID', 'PARTIAL'] } },
      select: { studentProfile: { select: { userId: true } } },
      distinct: ['studentProfileId'],
    });
    recipientIds = dues.map((d) => d.studentProfile.userId);
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId: userId,
      audienceJson: JSON.stringify({ audience: body.audience, routeId: body.routeId ?? null }),
      title: body.title,
      body: body.body,
      channels: 'IN_APP',
      sentAt: new Date(),
    },
  });

  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'BROADCAST',
        title: body.title,
        body: body.body,
        sourceModule: 'transport',
      })),
    });
  }

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'broadcast.send',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: { audience: body.audience, recipients: recipientIds.length },
  });

  return { id: broadcast.id, recipients: recipientIds.length };
}

// ── R-09 Profile ─────────────────────────────────────────────
export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId },
    include: { roles: true, staffProfile: { select: { designation: true, employeeNo: true } } },
  });
  if (!user) throw notFound('User not found');

  const [vehicles, routes, students] = await Promise.all([
    prisma.vehicle.count({ where: { institutionId } }),
    prisma.route.count({ where: { institutionId } }),
    prisma.routeEnrollment.count({ where: { route: { institutionId }, status: 'ACTIVE' } }),
  ]);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles.map((r) => r.role),
    designation: user.staffProfile?.designation ?? null,
    stats: { vehicles, routes, students },
  };
}
