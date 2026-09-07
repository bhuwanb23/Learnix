import { PrismaClient } from '@prisma/client';
import { notFound, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

const prisma = new PrismaClient();

// Helper to get company IDs for an institution
async function getCompanyIds(institutionId: string) {
  const companies = await prisma.company.findMany({ where: { institutionId }, select: { id: true } });
  return companies.map((c) => c.id);
}

// ─────────────────────────────────────────────────────────────
// P-01 — Dashboard
// ─────────────────────────────────────────────────────────────
export async function getDashboard(institutionId: string) {
  const companyIds = await getCompanyIds(institutionId);

  const [
    totalCompanies,
    openJobs,
    activeDrives,
    totalApplications,
    shortlisted,
    interviewed,
    offersExtended,
    offersAccepted,
  ] = await Promise.all([
    prisma.company.count({ where: { institutionId } }),
    prisma.job.count({ where: { status: 'OPEN', companyId: { in: companyIds } } }),
    prisma.placementDrive.count({ where: { status: { in: ['APPROVED', 'SCHEDULED'] }, companyId: { in: companyIds } } }),
    prisma.jobApplication.count({ where: { OR: [{ job: { companyId: { in: companyIds } } }, { drive: { companyId: { in: companyIds } } }] } }),
    prisma.jobApplication.count({ where: { status: 'SHORTLISTED', OR: [{ job: { companyId: { in: companyIds } } }, { drive: { companyId: { in: companyIds } } }] } }),
    prisma.jobApplication.count({ where: { status: 'INTERVIEW', OR: [{ job: { companyId: { in: companyIds } } }, { drive: { companyId: { in: companyIds } } }] } }),
    prisma.placementOffer.count({ where: { application: { OR: [{ job: { companyId: { in: companyIds } } }, { drive: { companyId: { in: companyIds } } }] } } }),
    prisma.placementOffer.count({ where: { status: 'ACCEPTED', application: { OR: [{ job: { companyId: { in: companyIds } } }, { drive: { companyId: { in: companyIds } } }] } } }),
  ]);

  const activeDriveList = await prisma.placementDrive.findMany({
    where: { status: { in: ['APPROVED', 'SCHEDULED'] }, companyId: { in: companyIds } },
    include: { company: true, applications: true, registrations: true },
    orderBy: { driveDate: 'asc' },
    take: 5,
  });

  const pendingApps = await prisma.jobApplication.findMany({
    where: { status: 'APPLIED', OR: [{ job: { companyId: { in: companyIds } } }, { drive: { companyId: { in: companyIds } } }] },
    include: { studentProfile: { include: { user: { select: { fullName: true } } } }, job: { include: { company: true } }, drive: { include: { company: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return {
    hero: { activeDrives, totalCompanies, totalApplications, offersAccepted },
    stats: { totalCompanies, openJobs, activeDrives, totalApplications, shortlisted, interviewed, offersExtended, offersAccepted },
    activeDrives: activeDriveList.map((d) => ({
      id: d.id, title: d.title, company: d.company.name, role: d.role,
      packagePerAnnum: d.packageMinorPerAnnum, driveDate: d.driveDate, mode: d.mode,
      applications: d.applications.length, registrations: d.registrations.length,
    })),
    pendingApplications: pendingApps.map((a) => ({
      id: a.id, student: a.studentProfile.user.fullName, rollNo: a.studentProfile.rollNo,
      company: a.job?.company?.name || a.drive?.company?.name || '',
      role: a.job?.role || a.drive?.role || '',
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// P-02 — Companies CRUD
// ─────────────────────────────────────────────────────────────
export async function listCompanies(institutionId: string) {
  const companies = await prisma.company.findMany({
    where: { institutionId },
    include: { jobs: true, drives: true },
    orderBy: { createdAt: 'desc' },
  });
  return companies.map((c) => ({
    id: c.id, name: c.name, sector: c.sector, website: c.website, hrContact: c.hrContact, rating: c.rating,
    jobsCount: c.jobs.length, drivesCount: c.drives.length, createdAt: c.createdAt,
  }));
}

export async function addCompany(institutionId: string, userId: string, body: { name: string; sector?: string; website?: string; hrContact?: string; rating?: number }) {
  const existing = await prisma.company.findFirst({ where: { institutionId, name: body.name } });
  if (existing) throw badRequest('A company with this name already exists');
  const company = await prisma.company.create({ data: { institutionId, ...body } });
  await writeAudit({ institutionId, actorUserId: userId, action: 'COMPANY_CREATED', entityType: 'Company', entityId: company.id });
  return company;
}

export async function updateCompany(institutionId: string, userId: string, companyId: string, body: { name?: string; sector?: string; website?: string; hrContact?: string; rating?: number }) {
  const company = await prisma.company.findFirst({ where: { id: companyId, institutionId } });
  if (!company) throw notFound('Company not found');
  const updated = await prisma.company.update({ where: { id: companyId }, data: body });
  await writeAudit({ institutionId, actorUserId: userId, action: 'COMPANY_UPDATED', entityType: 'Company', entityId: companyId });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// P-03 — Jobs
// ─────────────────────────────────────────────────────────────
export async function listJobs(institutionId: string) {
  const companyIds = await getCompanyIds(institutionId);
  const jobs = await prisma.job.findMany({
    where: { companyId: { in: companyIds } },
    include: { company: true, applications: true },
    orderBy: { createdAt: 'desc' },
  });
  return jobs.map((j) => ({
    id: j.id, company: j.company.name, companyId: j.companyId, role: j.role,
    packagePerAnnum: j.packageMinorPerAnnum, location: j.location, openings: j.openings,
    deadline: j.deadline, description: j.description, status: j.status,
    applications: j.applications.length, createdAt: j.createdAt,
  }));
}

export async function postJob(institutionId: string, userId: string, body: { companyId: string; role: string; packageMinorPerAnnum: number; location?: string; openings: number; deadline?: string; description?: string }) {
  const company = await prisma.company.findFirst({ where: { id: body.companyId, institutionId } });
  if (!company) throw notFound('Company not found');
  const job = await prisma.job.create({
    data: {
      companyId: body.companyId, postedByUserId: userId, role: body.role,
      packageMinorPerAnnum: body.packageMinorPerAnnum, location: body.location,
      openings: body.openings, deadline: body.deadline ? new Date(body.deadline) : undefined,
      description: body.description, status: 'OPEN',
    },
  });
  await writeAudit({ institutionId, actorUserId: userId, action: 'JOB_POSTED', entityType: 'Job', entityId: job.id });
  return job;
}

export async function closeJob(institutionId: string, userId: string, jobId: string) {
  const job = await prisma.job.findFirst({ where: { id: jobId, company: { institutionId } } });
  if (!job) throw notFound('Job not found');
  const updated = await prisma.job.update({ where: { id: jobId }, data: { status: 'CLOSED' } });
  await writeAudit({ institutionId, actorUserId: userId, action: 'JOB_CLOSED', entityType: 'Job', entityId: jobId });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// P-04 — Drives
// ─────────────────────────────────────────────────────────────
export async function listDrives(institutionId: string) {
  const companyIds = await getCompanyIds(institutionId);
  const drives = await prisma.placementDrive.findMany({
    where: { companyId: { in: companyIds } },
    include: { company: true, applications: true, registrations: true },
    orderBy: { createdAt: 'desc' },
  });
  return drives.map((d) => ({
    id: d.id, title: d.title, company: d.company.name, companyId: d.companyId, role: d.role,
    packagePerAnnum: d.packageMinorPerAnnum, driveDate: d.driveDate, mode: d.mode,
    eligibility: d.eligibilityJson, status: d.status,
    applications: d.applications.length, registrations: d.registrations.length, createdAt: d.createdAt,
  }));
}

export async function createDrive(institutionId: string, userId: string, body: { companyId: string; title: string; role: string; packageMinorPerAnnum: number; driveDate: string; mode: string; eligibilityJson: string }) {
  const company = await prisma.company.findFirst({ where: { id: body.companyId, institutionId } });
  if (!company) throw notFound('Company not found');
  const drive = await prisma.placementDrive.create({
    data: {
      companyId: body.companyId, title: body.title, role: body.role,
      packageMinorPerAnnum: body.packageMinorPerAnnum, driveDate: new Date(body.driveDate),
      mode: body.mode, eligibilityJson: body.eligibilityJson, status: 'DRAFT', createdByUserId: userId,
    },
  });
  await writeAudit({ institutionId, actorUserId: userId, action: 'DRIVE_CREATED', entityType: 'PlacementDrive', entityId: drive.id });
  return drive;
}

export async function submitDriveForApproval(institutionId: string, userId: string, driveId: string) {
  const drive = await prisma.placementDrive.findFirst({ where: { id: driveId, company: { institutionId } } });
  if (!drive) throw notFound('Drive not found');
  if (drive.status !== 'DRAFT') throw badRequest('Only DRAFT drives can be submitted for approval');
  const updated = await prisma.placementDrive.update({ where: { id: driveId }, data: { status: 'PENDING_ADMIN' } });
  await writeAudit({ institutionId, actorUserId: userId, action: 'DRIVE_SUBMITTED', entityType: 'PlacementDrive', entityId: driveId });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// P-05 — Applications pipeline
// ─────────────────────────────────────────────────────────────
export async function listApplications(institutionId: string, driveId?: string, status?: string) {
  const companyIds = await getCompanyIds(institutionId);
  const where: any = { OR: [{ job: { companyId: { in: companyIds } } }, { drive: { companyId: { in: companyIds } } }] };
  if (driveId) where.driveId = driveId;
  if (status) where.status = status;

  const applications = await prisma.jobApplication.findMany({
    where,
    include: {
      studentProfile: { include: { user: { select: { fullName: true } } } },
      job: { include: { company: true } }, drive: { include: { company: true } }, offers: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return applications.map((a) => ({
    id: a.id, student: a.studentProfile.user.fullName, rollNo: a.studentProfile.rollNo,
    company: a.job?.company?.name || a.drive?.company?.name || '',
    role: a.job?.role || a.drive?.role || '',
    status: a.status, appliedAt: a.appliedAt,
    offers: a.offers.map((o) => ({ id: o.id, ctcMinor: o.ctcMinor, status: o.status })),
  }));
}

export async function decideApplication(institutionId: string, userId: string, applicationId: string, decision: string) {
  const app = await prisma.jobApplication.findFirst({
    where: { id: applicationId, OR: [{ job: { company: { institutionId } } }, { drive: { company: { institutionId } } }] },
  });
  if (!app) throw notFound('Application not found');
  if (app.status === 'REJECTED') throw badRequest('Cannot change a rejected application');

  const updated = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status: decision, decidedByUserId: userId, decidedAt: new Date() },
  });
  await writeAudit({ institutionId, actorUserId: userId, action: `APPLICATION_${decision}`, entityType: 'JobApplication', entityId: applicationId });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// P-06 — Offers
// ─────────────────────────────────────────────────────────────
export async function extendOffer(institutionId: string, userId: string, applicationId: string, ctcMinor: number) {
  const app = await prisma.jobApplication.findFirst({
    where: { id: applicationId, OR: [{ job: { company: { institutionId } } }, { drive: { company: { institutionId } } }] },
  });
  if (!app) throw notFound('Application not found');
  if (app.status !== 'SHORTLISTED' && app.status !== 'INTERVIEW') throw badRequest('Application must be SHORTLISTED or INTERVIEW to extend an offer');

  const existing = await prisma.placementOffer.findFirst({ where: { applicationId } });
  if (existing) throw badRequest('An offer already exists for this application');

  await prisma.jobApplication.update({ where: { id: applicationId }, data: { status: 'OFFERED', decidedByUserId: userId, decidedAt: new Date() } });
  const offer = await prisma.placementOffer.create({ data: { applicationId, ctcMinor } });
  await writeAudit({ institutionId, actorUserId: userId, action: 'OFFER_EXTENDED', entityType: 'PlacementOffer', entityId: offer.id });
  return offer;
}

export async function decideOffer(institutionId: string, userId: string, offerId: string, decision: string) {
  const offer = await prisma.placementOffer.findFirst({
    where: { id: offerId, application: { OR: [{ job: { company: { institutionId } } }, { drive: { company: { institutionId } } }] } },
  });
  if (!offer) throw notFound('Offer not found');
  if (offer.status !== 'EXTENDED') throw badRequest('Only EXTENDED offers can be decided');
  const updated = await prisma.placementOffer.update({ where: { id: offerId }, data: { status: decision } });
  await writeAudit({ institutionId, actorUserId: userId, action: `OFFER_${decision}`, entityType: 'PlacementOffer', entityId: offerId });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// P-07 — Student eligibility pool
// ─────────────────────────────────────────────────────────────
export async function listEligibleStudents(_institutionId: string) {
  const students = await prisma.placementEligibility.findMany({
    include: { studentProfile: { include: { user: { select: { fullName: true, email: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return students.map((s) => ({
    id: s.id, name: s.studentProfile.user.fullName, rollNo: s.studentProfile.rollNo,
    email: s.studentProfile.user.email, isEligible: s.isEligible,
    blockedReason: s.blockedReason, registeredForDrives: s.registeredForDrives,
  }));
}

// ─────────────────────────────────────────────────────────────
// P-08 — Notifications + profile
// ─────────────────────────────────────────────────────────────
export async function listNotifications(userId: string, institutionId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { recipientUserId: userId, institutionId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.notification.count({ where: { recipientUserId: userId, institutionId, readAt: null } }),
  ]);
  return {
    unread,
    notifications: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, read: n.readAt !== null, createdAt: n.createdAt })),
  };
}

export async function markAllRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({ where: { recipientUserId: userId, institutionId, readAt: null }, data: { readAt: new Date() } });
  return { updated: res.count };
}

export async function createBroadcast(institutionId: string, _senderUserId: string, body: { audience: string; title: string; body: string }) {
  let recipientIds: string[] = [];

  if (body.audience === 'ALL_STUDENTS') {
    const students = await prisma.studentProfile.findMany({ where: { user: { institutionId, deletedAt: null } }, select: { userId: true } });
    recipientIds = students.map((s) => s.userId);
  } else if (body.audience === 'FINAL_YEAR') {
    const students = await prisma.studentProfile.findMany({ where: { user: { institutionId, deletedAt: null }, currentSemester: { gte: 7 } }, select: { userId: true } });
    recipientIds = students.map((s) => s.userId);
  } else if (body.audience === 'THIRD_YEAR') {
    const students = await prisma.studentProfile.findMany({ where: { user: { institutionId, deletedAt: null }, currentSemester: { gte: 5, lte: 6 } }, select: { userId: true } });
    recipientIds = students.map((s) => s.userId);
  } else if (body.audience === 'PLACED_STUDENTS') {
    const companyIds = await getCompanyIds(institutionId);
    const placedApps = await prisma.jobApplication.findMany({ where: { status: 'OFFERED', OR: [{ job: { companyId: { in: companyIds } } }, { drive: { companyId: { in: companyIds } } }] }, select: { studentProfileId: true } });
    const profileIds = [...new Set(placedApps.map((a) => a.studentProfileId))];
    const profiles = await prisma.studentProfile.findMany({ where: { id: { in: profileIds } }, select: { userId: true } });
    recipientIds = profiles.map((p) => p.userId);
  }

  if (recipientIds.length === 0) {
    const allStudents = await prisma.studentProfile.findMany({ where: { user: { institutionId, deletedAt: null } }, select: { userId: true } });
    recipientIds = allStudents.map((s) => s.userId);
  }

  if (recipientIds.length === 0) return { created: 0 };

  await prisma.notification.createMany({
    data: recipientIds.map((id) => ({ recipientUserId: id, institutionId, type: 'PLACEMENT_BROADCAST', title: body.title, body: body.body })),
  });
  return { created: recipientIds.length };
}

export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId },
    include: { roles: true, staffProfile: { select: { designation: true, employeeNo: true } } },
  });
  if (!user) throw notFound('User not found');

  const companyIds = await getCompanyIds(institutionId);
  const [totalDrives, totalCompanies, totalOffers] = await Promise.all([
    prisma.placementDrive.count({ where: { companyId: { in: companyIds } } }),
    prisma.company.count({ where: { institutionId } }),
    prisma.placementOffer.count({ where: { application: { OR: [{ job: { companyId: { in: companyIds } } }, { drive: { companyId: { in: companyIds } } }] } } }),
  ]);

  return {
    id: user.id, name: user.fullName, email: user.email,
    roles: user.roles.map((r) => r.role),
    designation: user.staffProfile?.designation, employeeNo: user.staffProfile?.employeeNo,
    stats: { totalDrives, totalCompanies, totalOffers },
  };
}
