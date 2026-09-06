/**
 * Spine verification — proves the FK chain joins end-to-end on the seeded DB.
 * Run: npm run verify:spine
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main(): Promise<void> {
  const inst = await db.institution.findFirst({ where: { code: 'DEMO' } });
  if (!inst) throw new Error('Demo institution not found — run seed');

  const offerings = await db.courseOffering.findMany({
    where: { academicYear: { institutionId: inst.id } },
    include: {
      course: true,
      section: { include: { batch: true } },
      enrollments: { include: { studentProfile: { include: { user: true } } } },
      lectureNotes: true,
      assignments: { include: { rubricCriteria: true } },
    },
  });

  console.log('── Domain B spine ──');
  for (const o of offerings) {
    const enrolled = o.enrollments.map((e) => e.studentProfile.user.fullName).join(', ') || '-';
    const rubric = o.assignments.reduce((s, a) => s + a.rubricCriteria.length, 0);
    console.log(
      `OFFERING ${o.course.code} ${o.course.name} | ${o.section.batch.name} ${o.section.name} | sem${o.semester} | enrolled: ${enrolled} | notes:${o.lectureNotes.length} assignments:${o.assignments.length} rubric:${rubric}`,
    );
  }

  const syl = await db.syllabusVersion.findFirst({
    include: { course: true, units: { include: { topics: true } } },
  });
  if (syl) {
    const topics = syl.units.reduce((s, u) => s + u.topics.length, 0);
    console.log(`SYLLABUS ${syl.course.code} v${syl.version} [${syl.status}] units:${syl.units.length} topics:${topics}`);
  }

  const att = await db.attendanceSession.count();
  console.log(`attendance_sessions: ${att} (0 expected until attendance piece)`);

  console.log('── Domain C spine ──');
  const attempt = await db.quizAttempt.findFirst({
    include: { quiz: { include: { offering: { include: { course: true } } } }, answers: true },
  });
  if (attempt) {
    console.log(
      `QUIZ ${attempt.quiz.title} (${attempt.quiz.offering.course.code}) | attempt ${attempt.status} score:${attempt.scoreMarks}/${attempt.answers.length}`,
    );
  }
  const exam = await db.exam.findFirst({
    include: {
      examSlots: {
        include: {
          offering: { include: { course: true } },
          hallTickets: { include: { studentProfile: { include: { user: true } } } },
          evaluations: { include: { papers: true } },
          cheatingCases: true,
        },
      },
      gradingDeadline: true,
    },
  });
  if (exam) {
    for (const s of exam.examSlots) {
      const ht = s.hallTickets[0];
      const ev = s.evaluations[0];
      console.log(
        `EXAM ${exam.name} [${exam.status}] | slot ${s.offering.course.code} ${s.startTime}-${s.endTime} ${s.room ?? ''} | hallTicket:${ht ? `${ht.seatNo}(${ht.status}) for ${ht.studentProfile.user.fullName}` : '-'} | eval:${ev ? `${ev.status} papers ${ev.completedPapers}/${ev.totalPapers}` : '-'} | cheating:${s.cheatingCases.length}`,
      );
    }
    console.log(`grading deadline: ${exam.gradingDeadline ? exam.gradingDeadline.dueAt.toISOString().slice(0, 10) : '-'}`);
  }

  console.log('── Domain D spine ──');
  const apps = await db.jobApplication.findMany({
    include: {
      job: { include: { company: true } },
      drive: { include: { company: true } },
      studentProfile: { include: { user: true } },
      offers: true,
    },
  });
  for (const a of apps) {
    const target = a.job ? `JOB ${a.job.role} @ ${a.job.company.name}` : `DRIVE ${a.drive?.title} @ ${a.drive?.company.name}`;
    const offer = a.offers[0];
    console.log(
      `APPLICATION ${target} | ${a.studentProfile.user.fullName} | ${a.status}${offer ? ` | offer ${offer.status} ₹${(offer.ctcMinor / 1e7).toFixed(1)}L` : ''}`,
    );
  }
  const reg = await db.driveRegistration.findFirst({ include: { drive: true, studentProfile: { include: { user: true } } } });
  if (reg) {
    console.log(`DRIVE REG ${reg.drive.title} | ${reg.studentProfile.user.fullName} | ${reg.status}`);
  }
  const elig = await db.placementEligibility.findFirst({ include: { studentProfile: { include: { user: true } } } });
  if (elig) {
    console.log(`ELIGIBILITY ${elig.studentProfile.user.fullName} | eligible:${elig.isEligible} registered:${elig.registeredForDrives}`);
  }

  console.log('── Domain E spine ──');
  const inr = (paise: number): string => `₹${(paise / 1e7).toFixed(2)}L`;
  const payment = await db.payment.findFirst({ include: { studentProfile: { include: { user: true } }, receipt: true } });
  if (payment) {
    console.log(
      `PAYMENT ${payment.referenceNo} ${payment.category} ${inr(payment.amountMinor)} via ${payment.method} [${payment.status}] | ${payment.studentProfile?.user.fullName ?? '-'} | receipt:${payment.receipt?.receiptNo ?? '-'}`,
    );
  }
  const dues = await db.feeDue.findMany({ include: { studentProfile: { include: { user: true } } } });
  for (const d of dues) {
    console.log(`FEE DUE ${d.title} ${inr(d.amountMinor)} due ${d.dueDate.toISOString().slice(0, 10)} [${d.status}] | ${d.studentProfile.user.fullName}`);
  }
  const run = await db.payrollRun.findFirst({ include: { entries: true } });
  if (run) {
    console.log(`PAYROLL ${run.month} [${run.status}] total:${inr(run.totalMinor)} entries:${run.entries.length} (net ${inr(run.entries[0]?.netMinor ?? 0)})`);
  }
  const exp = await db.expense.findFirst({ include: { budget: true } });
  if (exp) {
    console.log(`EXPENSE ${exp.category} ${exp.vendor ?? '-'} ${inr(exp.amountMinor)} [${exp.status}] | budget ${exp.budget?.category ?? '-'} planned:${exp.budget ? inr(exp.budget.plannedMinor) : '-'}`);
  }
  const award = await db.scholarshipAward.findFirst({ include: { scholarship: true, studentProfile: { include: { user: true } } } });
  if (award) {
    console.log(`SCHOLARSHIP ${award.scholarship.name} (${award.scholarship.coveragePercent}%) ${inr(award.amountMinor)} [${award.status}] | ${award.studentProfile.user.fullName}`);
  }

  console.log('── Domain F+G spine ──');
  const fineRow = await db.fine.findFirst({
    include: {
      bookIssue: { include: { book: true, studentProfile: { include: { user: true } }, finePayments: { include: { payment: { include: { receipt: true } } } } } },
    },
  });
  if (fineRow) {
    const fp = fineRow.bookIssue.finePayments[0];
    console.log(
      `FINE ${fineRow.bookIssue.book.title} | ${fineRow.bookIssue.studentProfile.user.fullName} | overdue ${fineRow.daysOverdue}d ₹${fineRow.amountMinor / 100} [${fineRow.status}]${fp ? ` → PAYMENT ${fp.payment.referenceNo} receipt:${fp.payment.receipt?.receiptNo ?? '-'}` : ''}`,
    );
  }
  const bookCount = await db.book.count();
  const req = await db.bookRequest.findFirst({ include: { studentProfile: { include: { user: true } } } });
  console.log(`BOOKS total:${bookCount} | request: ${req ? `${req.title} [${req.status}] by ${req.studentProfile.user.fullName}` : '-'}`);

  const allocation = await db.hostelAllocation.findFirst({
    include: {
      studentProfile: { include: { user: true } },
      bed: { include: { room: { include: { block: true } } } },
      rentDues: true,
    },
  });
  if (allocation) {
    console.log(
      `ALLOCATION ${allocation.studentProfile.user.fullName} → ${allocation.bed.room.block.name} ${allocation.bed.room.number} bed${allocation.bed.bedNo} | rent dues:${allocation.rentDues.length} (${allocation.rentDues.map((d) => `${d.month}:${d.status}`).join(', ')})`,
    );
  }
  const room = await db.room.findFirst({ include: { beds: true } });
  if (room) {
    console.log(`ROOM ${room.number} occupied:${room.occupiedCount}/${room.capacity} beds:[${room.beds.map((b) => `${b.bedNo}:${b.status}`).join(', ')}]`);
  }
  const gp = await db.gatePass.findFirst({ include: { studentProfile: { include: { user: true } } } });
  const complaint = await db.hostelComplaint.findFirst({ include: { studentProfile: { include: { user: true } } } });
  const visitor = await db.visitor.findFirst({ include: { visitingStudent: { include: { user: true } } } });
  if (gp) console.log(`GATE PASS ${gp.studentProfile.user.fullName} [${gp.status}] out:${gp.outAt.toISOString().slice(0, 10)}`);
  if (complaint) console.log(`COMPLAINT ${complaint.category} [${complaint.status}] sev:${complaint.severity} | ${complaint.studentProfile.user.fullName}`);
  if (visitor) console.log(`VISITOR ${visitor.name} (${visitor.relation}) [${visitor.status}] for ${visitor.visitingStudent.user.fullName}`);

  console.log('── Domain H spine ──');
  const bus = await db.busPosition.findFirst({
    include: {
      vehicle: true,
      route: { include: { stops: { orderBy: { order: 'asc' } }, enrollments: { include: { studentProfile: { include: { user: true } }, stop: true } } } },
      currentStop: true,
    },
  });
  if (bus) {
    const rider = bus.route.enrollments[0];
    console.log(
      `LIVE BUS ${bus.vehicle.regNo} on ${bus.route.name} near ${bus.currentStop?.stopName ?? '-'} | ${bus.speedKmh}km/h eta:${bus.etaMin ?? '-'}min [${bus.status}] pinged:${bus.pingedAt.toISOString().slice(11, 16)}`,
    );
    if (rider) {
      console.log(`  └ rider ${rider.studentProfile.user.fullName} boards @ stop ${rider.stop.order} ${rider.stop.stopName} (${rider.stop.time})`);
    }
  }
  const v2 = await db.vehicle.findFirst({ where: { status: 'SERVICE' }, include: { serviceRecords: true, document: true } });
  if (v2) {
    console.log(`FLEET ${v2.regNo} [${v2.status}] fuel:${v2.fuelPct}% odometer:${v2.odometerKm}km | services:${v2.serviceRecords.length} | reg expires:${v2.document?.registrationExpiry.toISOString().slice(0, 10) ?? '-'}`);
  }
  const tfd = await db.transportFeeDue.findFirst({ include: { studentProfile: { include: { user: true } }, academicYear: true } });
  if (tfd) {
    console.log(`TRANSPORT FEE ${tfd.studentProfile.user.fullName} AY ${tfd.academicYear.name} ₹${tfd.amountMinor / 100} [${tfd.status}]`);
  }

  console.log('── Domain I spine ──');
  const techfest = await db.event.findFirst({
    include: {
      venue: true,
      registrations: { include: { registrant: true } },
      scheduleItems: true,
      volunteers: { include: { studentProfile: { include: { user: true } } } },
    },
  });
  if (techfest) {
    const reg = techfest.registrations[0];
    console.log(`EVENT ${techfest.title} [${techfest.status}] @ ${techfest.venue?.name ?? '-'} | reg:${reg ? `${reg.registrant.fullName} ${reg.status}` : '-'} | schedule:${techfest.scheduleItems.length} volunteers:${techfest.volunteers.map((v) => v.studentProfile.user.fullName).join(',') || '-'}`);
  }
  const alumniMeet = await db.event.findFirst({ where: { category: 'ALUMNI' } });
  if (alumniMeet) console.log(`EVENT ${alumniMeet.title} [${alumniMeet.status}] (${alumniMeet.category})`);
  const cup = await db.tournament.findFirst({
    include: {
      teams: { include: { members: { include: { studentProfile: { include: { user: true } } } } } },
      fixtures: { include: { teamA: true, teamB: true } },
      standings: { include: { team: true } },
    },
  });
  if (cup) {
    const fx = cup.fixtures[0];
    const table = cup.standings.map((s) => `${s.team.name}:${s.points}pts`).join(' | ');
    const arjunTeam = cup.teams.find((t) => t.members.some((m) => m.studentProfile.user.fullName === 'Arjun Kumar'));
    console.log(`TOURNAMENT ${cup.name} [${cup.status}] | fixture: ${fx.teamA.name} vs ${fx.teamB.name} [${fx.status}] | ${table}`);
    console.log(`  └ Arjun plays for ${arjunTeam?.name ?? '-'}`);
  }
  const booking = await db.venueBooking.findFirst({ include: { venue: true } });
  if (booking) console.log(`VENUE BOOKING ${booking.venue.name} ${booking.eventTitle} ${booking.timeSlot} [${booking.status}]`);
  const equip = await db.equipmentIssue.findFirst({ include: { item: true, studentProfile: { include: { user: true } } } });
  if (equip) console.log(`EQUIPMENT ${equip.item.name} → ${equip.studentProfile.user.fullName} due:${equip.dueAt.toISOString().slice(0, 10)} [${equip.status}] (available:${equip.item.availableUnits}/${equip.item.totalUnits})`);

  console.log('── Domain J+K spine ──');
 const receivedDonation = await db.donation.findFirst({
    where: { status: 'RECEIVED' },
    include: { alumniUser: true, paymentLinks: { include: { payment: { include: { receipt: true } } } } },
  });
  if (receivedDonation) {
    const link = receivedDonation.paymentLinks[0];
    console.log(`DONATION ${receivedDonation.alumniUser.fullName} ${receivedDonation.fund} ₹${receivedDonation.amountMinor / 100} [RECEIVED] → ${link ? `${link.payment.referenceNo} receipt:${link.payment.receipt?.receiptNo}` : '-'}`);
  }
  const campaign = await db.fundraisingCampaign.findFirst();
  if (campaign) {
    console.log(`CAMPAIGN ${campaign.name} ₹${(campaign.raisedMinor / 1e7).toFixed(1)}L / ₹${(campaign.targetMinor / 1e7).toFixed(1)}L [${campaign.status}]`);
  }
  const pairRow = await db.mentorshipPair.findFirst({
    include: { mentorAlumniUser: true, menteeStudentProfile: { include: { user: true } }, sessions: true },
  });
  if (pairRow) {
    console.log(`MENTORSHIP ${pairRow.mentorAlumniUser.fullName} → ${pairRow.menteeStudentProfile.user.fullName} (${pairRow.field}) [${pairRow.status}] sessions:${pairRow.sessions.length}`);
  }
  const chapterRow = await db.alumniChapter.findFirst({ include: { members: true } });
  if (chapterRow) {
    console.log(`CHAPTER ${chapterRow.city} members:${chapterRow.memberCount} (profiles linked:${chapterRow.members.length})`);
  }
  const unread = await db.notification.count({ where: { readAt: null } });
  const total = await db.notification.count();
  console.log(`NOTIFICATIONS total:${total} unread:${unread}`);
  const bc = await db.broadcast.findFirst();
  if (bc) console.log(`BROADCAST "${bc.title}" audience:${bc.audienceJson} channels:${bc.channels}`);
  const anns = await db.announcement.findMany();
  console.log(`ANNOUNCEMENTS ${anns.map((a) => `${a.status.toLowerCase()}`).join(', ')}`);
  const aiRow = await db.aiInteraction.findFirst({ include: { user: true } });
  if (aiRow) console.log(`AI ${aiRow.user.fullName} ${aiRow.feature} tokens:${aiRow.tokensUsed ?? '-'}`);

  console.log('── Domain L spine ──');
  const configRows = await db.systemConfig.findMany({ orderBy: { key: 'asc' } });
  console.log(`SYSTEM_CONFIG ${configRows.length} keys: ${configRows.map((c) => c.key).join(', ')}`);
  const flags = await db.featureFlag.findMany();
  console.log(`FEATURE_FLAGS ${flags.map((f) => `${f.key}:${f.enabled ? 'on' : 'off'}`).join(', ')}`);
  const pa = await db.platformAdmin.findFirst({ include: { user: true } });
  if (pa) console.log(`PLATFORM ADMIN ${pa.user.fullName} level:${pa.level}`);
  const avatar = await db.file.findFirst({ where: { purpose: 'AVATAR' } });
  if (avatar) {
    const owner = await db.user.findFirst({ where: { avatarFileId: avatar.id } });
    console.log(`FILE ${avatar.originalName} ${avatar.mimeType} ${avatar.sizeBytes}B → linked to ${owner?.fullName ?? '-'} via avatarFileId`);
  }
  const audits = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 3 });
  for (const a of audits) {
    console.log(`AUDIT ${a.action} ${a.entityType}:${(a.entityId ?? '-').slice(0, 8)}…`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
