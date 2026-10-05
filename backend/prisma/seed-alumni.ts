/**
 * Alumni Relations Seed Extension
 * ================================
 * Fills Domain J (alumni, fundraising, mentorship, chapters) with a realistic
 * graduate population so every screen in `learnix/users/alumni/**` has something
 * to render.
 *
 * Run: npx tsx prisma/seed-alumni.ts
 * (requires prisma/seed.ts and prisma/seed-realistic.ts to have run first)
 *
 * ── Why this file exists ────────────────────────────────────────
 * The base seeds created exactly ONE row per alumni table, and the only user
 * holding the ALUMNI role was `priya@learnix.dev` — the Alumni Relations
 * *officer*, who is staff, not a graduate. The directory therefore listed one
 * person (herself), engagement % was 100% or 0% at n=1, and every campaign
 * progress bar sat at a meaningless fraction. The app was not broken; it was
 * empty.
 *
 * ── Conventions this file follows ────────────────────────────────
 * · Money is integer paise (ADR-04). Rupees appear only in comments/labels.
 * · A RECEIVED donation is not a status flip: it carries the Payment +
 *   Receipt + DonationPayment write-through, exactly as
 *   `alumni.service.ts recordDonation` does, so the finance reconciliation
 *   (sum(payments) = sum(receipts), F-09) still holds.
 * · `FundraisingCampaign.raisedMinor` is denormalized. It is RECOMPUTED from
 *   the RECEIVED donations at the end rather than incremented, because a seed
 *   that increments is a seed that drifts the moment it is run twice.
 * · Idempotent. Every write is guarded, so re-running converges instead of
 *   duplicating.
 * · Deterministic. A seeded PRNG replaces Math.random() so two runs produce the
 *   same database — otherwise a "verified" seed is unreproducible.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const db = new PrismaClient();
const PASSWORD = 'Passw0rd!';

// ─────────────────────────────────────────────────────────────
// Deterministic PRNG (mulberry32). A seed that reshuffles on every
// run cannot be reviewed, diffed, or reproduced from a bug report.
// ─────────────────────────────────────────────────────────────
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(20260915);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const intBetween = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (d: number) => new Date(Date.now() + d * DAY);
const daysAgo = (d: number) => new Date(Date.now() - d * DAY);

/**
 * An agenda slot: [day, title, startTime, endTime, speaker, location].
 *
 * The time is a separate field rather than part of the title. The original seed
 * wrote "09:30 — Registration" as a single string, which put the clock time
 * where it could not be sorted, styled, or reasoned about — and there was no
 * column to put it in.
 */
type ScheduleSlot = [number, string, string | null, string | null, string | null, string | null];

/**
 * Stable 0–1 value derived from a registration id.
 *
 * Used instead of the registration's INDEX among the rows still needing work.
 * That index is not stable: the first run stamps ~82% and leaves the rest, then
 * the next run re-indexes only the leftovers starting again at 0 — where every
 * roll is small — so it stamps those too and every past event converges to a
 * fictional 100% attendance. Hashing the id means a row's fate is decided the
 * same way on every run, so the ~18% who did not show up stay un-stamped.
 */
function stableRoll(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return (h % 100) / 100;
}

/**
 * Resolve a "HH:MM" slot time against the event's own start date.
 *
 * Day 1 is the event's start day; later days are offset by whole days so a
 * two-day reunion's day-2 slots land on the second date. `extraMinutes` is used
 * to derive a nominal end time where the spec did not give one.
 */
function slotTime(eventStart: Date, day: number, hhmm: string, extraMinutes?: number): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(eventStart);
  d.setDate(d.getDate() + (day - 1));
  d.setHours(h || 0, m || 0, 0, 0);
  if (extraMinutes) d.setMinutes(d.getMinutes() + extraMinutes);
  return d;
}

/**
 * Recompute a chapter's denormalised memberCount.
 *
 * RECOMPUTED, never incremented: a counter that goes up by one on every join
 * drifts the first time two people join at once, and nothing would notice.
 */
async function recomputeChapterMembers(institutionId: string, chapterId: string) {
  const members = await db.alumniProfile.count({
    where: { institutionId, chapterId, engagementStatus: 'ACTIVE' },
  });
  await db.alumniChapter.update({ where: { id: chapterId }, data: { memberCount: members } });
  return members;
}
/** Rupees → paise. Every amount in this file goes through here. */
const inr = (rupees: number) => rupees * 100;

/**
 * ⚠️ Money ceiling — READ BEFORE EDITING ANY AMOUNT.
 *
 * Every `*Minor` column in the schema is a Prisma `Int`, which maps to a 32-bit
 * signed integer. The maximum storable value is 2,147,483,647 paise =
 * ₹21,474,836.47 (~₹2.14 crore).
 *
 * A ₹2.5 crore campaign target therefore fails at runtime with
 * `P2023: Conversion failed: Value 2500000000 does not fit in an INT column`,
 * which is what the first run of this seed hit. Two consequences worth
 * knowing before this ever bites in production:
 *
 *  · Any SINGLE amount is capped at ~₹2.14 crore — fine for a fee due or a
 *    single donation, marginal for a large capital campaign target.
 *  · `FundraisingCampaign.raisedMinor` ACCUMULATES. An institution whose
 *    lifetime giving crosses ₹2.14 crore on one campaign will fail to record
 *    the donation that crosses it.
 *
 * Targets below are sized with headroom. Widening the columns to `BigInt` is
 * the real fix, but it is not free: Prisma returns BigInt as a JS BigInt,
 * which breaks the `toRupees()` arithmetic and JSON.stringify() in every
 * service that touches money. Treat it as its own task, not a drive-by change.
 */
const MAX_MINOR = 2_147_483_647;
const rupeesToMinor = (rupees: number) => {
  const paise = inr(rupees);
  if (paise > MAX_MINOR) {
    throw new Error(
      `₹${rupees.toLocaleString('en-IN')} = ${paise} paise exceeds the Int32 ceiling ` +
        `(${MAX_MINOR} = ₹${(MAX_MINOR / 100).toLocaleString('en-IN')}). ` +
        `Money columns are Int; see the MAX_MINOR note in this file.`,
    );
  }
  return paise;
};

// ─────────────────────────────────────────────────────────────
// Reference data
// ─────────────────────────────────────────────────────────────

/**
 * Alumni cohorts. `batch` is the graduation year; the Batch row itself is
 * derived (a 4-year B.Tech graduating in 2021 started in 2017), because
 * AlumniProfile.batchId is what lets the directory filter by DEPARTMENT —
 * batch → program → department. There is no departmentId on the profile, and
 * adding one would denormalise a path the schema already has.
 */
const COHORTS = [
  { program: 'BT-CSE', dept: 'CSE', gradYear: 2015 },
  { program: 'BT-CSE', dept: 'CSE', gradYear: 2017 },
  { program: 'BT-CSE', dept: 'CSE', gradYear: 2019 },
  { program: 'BT-CSE', dept: 'CSE', gradYear: 2021 },
  { program: 'BT-CSE', dept: 'CSE', gradYear: 2023 },
  { program: 'BT-CSE', dept: 'CSE', gradYear: 2025 },
  { program: 'BT-ECE', dept: 'ECE', gradYear: 2016 },
  { program: 'BT-ECE', dept: 'ECE', gradYear: 2018 },
  { program: 'BT-ECE', dept: 'ECE', gradYear: 2020 },
  { program: 'BT-ECE', dept: 'ECE', gradYear: 2022 },
  { program: 'BT-ME', dept: 'ME', gradYear: 2015 },
  { program: 'BT-ME', dept: 'ME', gradYear: 2019 },
  { program: 'BT-ME', dept: 'ME', gradYear: 2023 },
  { program: 'MBA', dept: 'MBA', gradYear: 2018 },
  { program: 'MBA', dept: 'MBA', gradYear: 2021 },
  { program: 'MBA', dept: 'MBA', gradYear: 2024 },
] as const;

const COMPANIES = [
  { name: 'Tata Consultancy Services', sector: 'IT', city: 'Mumbai' },
  { name: 'Infosys Technologies', sector: 'IT', city: 'Bengaluru' },
  { name: 'Wipro Technologies', sector: 'IT', city: 'Bengaluru' },
  { name: 'Cognizant Technology', sector: 'IT', city: 'Chennai' },
  { name: 'Amazon Development Centre', sector: 'IT', city: 'Hyderabad' },
  { name: 'Microsoft India', sector: 'IT', city: 'Bengaluru' },
  { name: 'Google India', sector: 'IT', city: 'Bengaluru' },
  { name: 'Flipkart', sector: 'CORE', city: 'Bengaluru' },
  { name: 'Zoho Corporation', sector: 'IT', city: 'Chennai' },
  { name: 'Freshworks', sector: 'IT', city: 'Chennai' },
  { name: 'Swiggy', sector: 'CORE', city: 'Bengaluru' },
  { name: 'Razorpay', sector: 'FINANCE', city: 'Bengaluru' },
  { name: 'Deloitte India', sector: 'CONSULTING', city: 'Mumbai' },
  { name: 'Accenture Solutions', sector: 'CONSULTING', city: 'Pune' },
  { name: 'Goldman Sachs', sector: 'FINANCE', city: 'Mumbai' },
  { name: 'Tata Motors', sector: 'CORE', city: 'Pune' },
  { name: 'Bajaj Auto', sector: 'CORE', city: 'Pune' },
  { name: 'Maruti Suzuki', sector: 'CORE', city: 'Gurgaon' },
] as const;

/**
 * Cities double as chapter names — a chapter IS a city, per
 * `AlumniChapter @@unique([institutionId, city])`.
 *
 * `region` groups chapters for the directory; `tier` separates a big regional
 * hub from a small local chapter. Both are seeded so the region grouping and the
 * tier filter have something to work with.
 */
const CITIES = [
  { city: 'Bengaluru', region: 'Karnataka', tier: 'REGIONAL' },
  { city: 'Mumbai', region: 'Maharashtra', tier: 'REGIONAL' },
  { city: 'Hyderabad', region: 'Telangana', tier: 'REGIONAL' },
  { city: 'Pune', region: 'Maharashtra', tier: 'LOCAL' },
  { city: 'Chennai', region: 'Tamil Nadu', tier: 'REGIONAL' },
  { city: 'Delhi NCR', region: 'Delhi NCR', tier: 'REGIONAL' },
] as const;

/** Chapter committee roles, in the order they are displayed. */
const COMMITTEE = [
  'PRESIDENT',
  'VICE_PRESIDENT',
  'SECRETARY',
  'TREASURER',
  'COORDINATOR',
] as const;

const FIRST_NAMES = [
  'Aditi', 'Akash', 'Ananya', 'Aniket', 'Arjun', 'Ashwin', 'Bhavana', 'Chetan',
  'Deepika', 'Dhruv', 'Farhan', 'Gaurav', 'Harish', 'Ishita', 'Jaya', 'Karthik',
  'Keerthi', 'Kiran', 'Lakshmi', 'Madhav', 'Mahesh', 'Manish', 'Meenakshi', 'Nandini',
  'Neelima', 'Nikhil', 'Pallavi', 'Pranav', 'Priya', 'Rahul', 'Ramya', 'Ravi',
  'Rekha', 'Rohan', 'Sanjay', 'Saranya', 'Shreya', 'Siddharth', 'Sneha', 'Sunil',
  'Swathi', 'Tanvi', 'Tarun', 'Uma', 'Varun', 'Vikram', 'Vinay', 'Yash',
] as const;

const LAST_NAMES = [
  'Aiyappa', 'Balan', 'Banerjee', 'Chawla', 'Deshmukh', 'Gowda', 'Hegde',
  'Iyer', 'Jain', 'Kamath', 'Khanna', 'Kulkarni', 'Menon', 'Nair', 'Pai',
  'Pillai', 'Rao', 'Reddy', 'Sethi', 'Shetty', 'Sinha', 'Sridhar', 'Thakur',
  'Varghese', 'Varma', 'Yadav',
] as const;

/** Roles chosen to fit the department, so a ME graduate is not a frontend dev. */
const ROLES: Record<string, readonly string[]> = {
  CSE: [
    'Senior Software Engineer', 'Backend Engineer', 'Full Stack Developer',
    'Data Engineer', 'Cloud Architect', 'Engineering Manager', 'DevOps Engineer',
    'Machine Learning Engineer', 'Site Reliability Engineer', 'Solutions Architect',
  ],
  ECE: [
    'Embedded Systems Engineer', 'VLSI Design Engineer', 'RF Engineer',
    'Hardware Design Engineer', 'Firmware Engineer', 'Telecom Engineer',
    'Product Engineer', 'Network Engineer',
  ],
  ME: [
    'Design Engineer', 'Manufacturing Engineer', 'Automotive R&D Engineer',
    'Quality Engineer', 'Supply Chain Analyst', 'Mechanical Engineer',
    'Product Development Engineer',
  ],
  MBA: [
    'Management Consultant', 'Business Analyst', 'Product Manager',
    'Investment Analyst', 'Marketing Manager', 'Operations Lead',
    'Strategy Consultant', 'Finance Manager',
  ],
};

/** Mentorship fields — also the vocabulary the skill-matcher will score against. */
const FIELDS = [
  'Career Guidance', 'Higher Studies', 'Entrepreneurship', 'Interview Prep',
  'Global Careers', 'Engineering Management', 'Finance & Investing',
] as const;

/**
 * Skill vocabulary, grouped by department.
 *
 * These strings are the MATCHING vocabulary: `AlumniSkill.skill` is compared
 * literally by the mentor-matcher, so the same concept must always be spelled
 * the same way. "Kubernetes", "kubernetes" and "K8s" as three separate skills
 * would make an exact-match matcher report that nobody knows Kubernetes.
 */
const SKILLS: Record<string, readonly string[]> = {
  CSE: [
    'Backend Engineering', 'Frontend Engineering', 'Data Engineering',
    'Machine Learning', 'Cloud Architecture', 'DevOps', 'Kubernetes',
    'Distributed Systems', 'System Design', 'Databases', 'API Design',
    'Mobile Engineering', 'Security Engineering',
  ],
  ECE: [
    'Embedded Systems', 'VLSI Design', 'Signal Processing', 'Firmware',
    'Hardware Design', 'RF Engineering', 'Telecom', 'Robotics',
    'PCB Layout', 'Analog Design',
  ],
  ME: [
    'CAD', 'FEA', 'Manufacturing', 'Automotive Design', 'Thermodynamics',
    'Supply Chain', 'Quality Engineering', 'Product Design', 'Robotics',
    'Operations Research',
  ],
  MBA: [
    'Financial Modelling', 'Management Consulting', 'Product Management',
    'Marketing Strategy', 'Operations Management', 'Negotiation',
    'Business Valuation', 'Entrepreneurship', 'Change Management',
    'Analytics',
  ],
};

const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

/**
 * Career archetypes per department. `from` is months AFTER graduation, so a
 * career entry is anchored to the cohort rather than to a wall-clock date —
 * which keeps the timeline correct no matter when the seed is run.
 */
const CAREER_STEPS: Record<string, { title: string; offsetMonths: number }[]> = {
  CSE: [
    { title: 'Software Engineer', offsetMonths: 2 },
    { title: 'Senior Software Engineer', offsetMonths: 26 },
    { title: 'Staff Engineer', offsetMonths: 54 },
    { title: 'Engineering Manager', offsetMonths: 82 },
  ],
  ECE: [
    { title: 'Design Engineer', offsetMonths: 3 },
    { title: 'Senior Design Engineer', offsetMonths: 30 },
    { title: 'Principal Engineer', offsetMonths: 60 },
  ],
  ME: [
    { title: 'Graduate Engineer', offsetMonths: 1 },
    { title: 'Design Engineer', offsetMonths: 24 },
    { title: 'Senior Engineer', offsetMonths: 52 },
  ],
  MBA: [
    { title: 'Business Analyst', offsetMonths: 1 },
    { title: 'Senior Consultant', offsetMonths: 22 },
    { title: 'Engagement Manager', offsetMonths: 46 },
    { title: 'Director', offsetMonths: 70 },
  ],
};

// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Alumni Relations Seed — Starting');
  console.log('═══════════════════════════════════════════════════');

  const institution = await db.institution.findFirst({ where: { code: 'DEMO' } });
  if (!institution) throw new Error('Run base seed first (institution missing)');
  const instId = institution.id;

  const programCount = await db.program.count();
  if (programCount === 0) {
    throw new Error('Run seed-realistic.ts first (no programs — alumni need cohorts)');
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── Step 1: historical cohorts (batches) ───────────────────
  // The base seed only created batches for students still enrolled. Alumni
  // graduated in 2015–2025, so their batches have to exist for the directory
  // to filter by department.
  console.log('\n📦 Step 1: Creating alumni cohorts...');

  const programs = await db.program.findMany({
    where: { department: { institutionId: instId } },
    include: { department: true, batches: true },
  });
  const programByCode = new Map(programs.map((p) => [p.code, p]));

  const cohortBatchId = new Map<string, string>(); // `${program}:${gradYear}` → batchId
  for (const c of COHORTS) {
    const program = programByCode.get(c.program);
    if (!program) {
      console.warn(`  ! program ${c.program} missing — skipping cohort`);
      continue;
    }
    const isMba = program.level === 'PG';
    const startYear = c.gradYear - program.durationYears;

    const batch = await db.batch.upsert({
      where: { programId_startYear: { programId: program.id, startYear } },
      update: { name: `${program.code} ${c.gradYear}`, graduationYear: c.gradYear },
      create: {
        programId: program.id,
        name: `${program.code} ${c.gradYear}`,
        startYear,
        graduationYear: c.gradYear,
      },
    });
    cohortBatchId.set(`${c.program}:${c.gradYear}`, batch.id);
  }
  console.log(`  ✓ ${cohortBatchId.size} cohorts`);

  // ── Step 2: companies ──────────────────────────────────────
  console.log('\n🏢 Step 2: Creating companies...');
  const companyId = new Map<string, string>();
  for (const c of COMPANIES) {
    const row = await db.company.upsert({
      where: { institutionId_name: { institutionId: instId, name: c.name } },
      update: { sector: c.sector },
      create: {
        institutionId: instId,
        name: c.name,
        sector: c.sector,
        website: `https://www.${c.name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        rating: Math.round((3.5 + rng() * 1.5) * 10) / 10,
      },
    });
    companyId.set(c.name, row.id);
  }
  console.log(`  ✓ ${companyId.size} companies`);

  // ── Step 3: alumni users + profiles ────────────────────────
  console.log('\n🎓 Step 3: Creating alumni...');

  const officer = await db.user.findFirst({
    where: { email: 'priya@learnix.dev', institutionId: instId },
  });
  if (!officer) throw new Error('Alumni officer (priya@learnix.dev) missing — run base seed');

  type AlumniRow = {
    userId: string;
    email: string;
    profileId: string;
    name: string;
    gradYear: number;
    dept: string;
    program: string;
    role: string | null;
    city: string;
    engagement: string;
    seniority: number; // years since graduation
  };
  const alumni: AlumniRow[] = [];

  const usedEmails = new Set<string>();
  const TARGET = 56;

  for (let i = 0; alumni.length < TARGET; i++) {
    const cohort = COHORTS[i % COHORTS.length];
    const program = programByCode.get(cohort.program);
    const batchId = cohortBatchId.get(`${cohort.program}:${cohort.gradYear}`);
    if (!program || !batchId) continue;

    const first = FIRST_NAMES[(i * 7 + 3) % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 11 + 5) % LAST_NAMES.length];
    const name = `${first} ${last}`;

    // Email must be unique; a collision means two alumni rows collapse into one
    // account, which silently shrinks the directory.
    const slug = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '');
    let email = `alumni.${slug}@learnix.dev`;
    if (usedEmails.has(email)) email = `alumni.${slug}.${cohort.gradYear}@learnix.dev`;
    if (usedEmails.has(email)) email = `alumni.${slug}.${i}@learnix.dev`;
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);

    const city = pick(CITIES).city;
    const role = ROLES[cohort.dept] ? pick(ROLES[cohort.dept]) : null;
    // Older cohorts are more likely to be disengaged — otherwise engagement is
    // a flat 100% and the dashboard hero measures nothing.
    const yearsOut = 2026 - cohort.gradYear;
    const roll = rng();
    const engagement =
      yearsOut > 8 ? (roll < 0.25 ? 'LOST' : roll < 0.5 ? 'INACTIVE' : 'ACTIVE')
      : yearsOut > 4 ? (roll < 0.12 ? 'INACTIVE' : 'ACTIVE')
      : roll < 0.06 ? 'INACTIVE' : 'ACTIVE';

    // Email is unique per INSTITUTION, not globally (User @@unique is
    // [institutionId, email]) — so the upsert key must carry both.
    const user = await db.user.upsert({
      where: { institutionId_email: { institutionId: instId, email } },
      update: { fullName: name },
      create: {
        institutionId: instId,
        email,
        passwordHash,
        fullName: name,
        phone: `+91 ${intBetween(70, 99)}${intBetween(10000000, 99999999)}`,
        status: 'ACTIVE',
        roles: { create: { role: 'ALUMNI' } },
      },
    });
    // Older cohorts may predate the ALUMNI role on an existing row.
    const hasRole = await db.userRole.findFirst({
      where: { userId: user.id, role: 'ALUMNI' },
    });
    if (!hasRole) {
      await db.userRole.create({ data: { userId: user.id, role: 'ALUMNI' } });
    }

    const company = pick(COMPANIES);
    const profile = await db.alumniProfile.upsert({
      where: { userId: user.id },
      update: {
        graduationYear: cohort.gradYear,
        currentRole: role,
        location: city,
        engagementStatus: engagement,
        batchId,
        companyId: companyId.get(company.name) ?? null,
      },
      create: {
        userId: user.id,
        institutionId: instId,
        batchId,
        graduationYear: cohort.gradYear,
        companyId: companyId.get(company.name) ?? null,
        currentRole: role,
        location: city,
        engagementStatus: engagement,
      },
    });

    alumni.push({
      userId: user.id,
      email,
      profileId: profile.id,
      name,
      gradYear: cohort.gradYear,
      dept: cohort.dept,
      program: cohort.program,
      role,
      city,
      engagement,
      seniority: yearsOut,
    });
  }
  console.log(`  ✓ ${alumni.length} alumni across ${cohortBatchId.size} cohorts`);

  // ── Step 4: chapters ───────────────────────────────────────
  // A chapter needs a president, and a president must already be an alumnus —
  // so chapters are created after the alumni, and membership is back-filled
  // afterwards. Doing it the other way round would mean inventing users to
  // satisfy an FK.
  console.log('\n🏙️  Step 4: Creating chapters...');

  const chapterId = new Map<string, string>();
  const chapterPresident = new Map<string, string>();
  for (const spec of CITIES) {
    const { city, region, tier } = spec;
    const members = alumni.filter((a) => a.city === city && a.engagement === 'ACTIVE');
    if (members.length === 0) continue;
    // The most senior active alumnus in the city presides. A president drawn at
    // random would be a batch of 2025 graduate chairing the 2015 cohort.
    const president = [...members].sort((a, b) => b.seniority - a.seniority)[0];

    const chapter = await db.alumniChapter.upsert({
      where: { institutionId_city: { institutionId: instId, city } },
      update: {
        presidentAlumniUserId: president.userId,
        region,
        tier,
        meetingFrequency: tier === 'REGIONAL' ? 'Quarterly' : 'Monthly',
        description: `${city} chapter of the Learnix alumni network — ${tier === 'REGIONAL' ? 'regional hub connecting alumni across the region' : 'local chapter for alumni based in and around the city'}.`,
      },
      create: {
        institutionId: instId,
        city,
        region,
        tier,
        presidentAlumniUserId: president.userId,
        meetingFrequency: tier === 'REGIONAL' ? 'Quarterly' : 'Monthly',
        description: `${city} chapter of the Learnix alumni network — ${tier === 'REGIONAL' ? 'regional hub connecting alumni across the region' : 'local chapter for alumni based in and around the city'}.`,
        foundedOn: new Date(`${intBetween(2015, 2021)}-01-15T00:00:00.000Z`),
        memberCount: 0, // recomputed below — never trusted from the seed
        nextEventAt: daysFromNow(intBetween(20, 70)),
      },
    });
    chapterId.set(city, chapter.id);
    chapterPresident.set(city, president.userId);

    for (const m of members) {
      await db.alumniProfile.update({
        where: { id: m.profileId },
        data: { chapterId: chapter.id },
      });
    }
  }
  console.log(`  ✓ ${chapterId.size} chapters`);

  // ── Step 5: campaigns ──────────────────────────────────────
  console.log('\n🎯 Step 5: Creating campaigns...');

  // Sized to stay clear of the Int32 paise ceiling documented at `rupeesToMinor`.
  const campaignSpec = [
    {
      name: 'New Library & Learning Commons',
      description:
        'A four-storey library with 600 seats, a digital archive and 24×7 reading space.',
      target: rupeesToMinor(1_50_00_000),
      deadlineDays: 240,
      status: 'ACTIVE',
    },
    {
      name: 'Merit Scholarship Fund 2026',
      description: 'Fee support for 40 students from families earning under ₹3L a year.',
      target: rupeesToMinor(75_00_000),
      deadlineDays: 150,
      status: 'ACTIVE',
    },
    {
      name: 'CSE Lab Modernisation',
      description: 'GPU cluster, licensed tooling, and a refreshed networking lab.',
      target: rupeesToMinor(60_00_000),
      deadlineDays: 180,
      status: 'ACTIVE',
    },
    {
      name: 'Annual Reunion Fund 2026',
      description: 'Travel grants and logistics for the Class of 2015–2025 homecoming.',
      target: rupeesToMinor(25_00_000),
      deadlineDays: 75,
      status: 'ACTIVE',
    },
    {
      name: 'Sports Complex Upgrade',
      description: 'Floodlit football pitch and an eight-lane running track.',
      target: rupeesToMinor(40_00_000),
      deadlineDays: -30, // already closed
      status: 'COMPLETED',
    },
  ];

  const campaignIds = new Map<string, string>();
  for (const c of campaignSpec) {
    const row = await db.fundraisingCampaign.upsert({
      where: { institutionId_name: { institutionId: instId, name: c.name } },
      update: { targetMinor: c.target, deadline: daysFromNow(c.deadlineDays), status: c.status },
      create: {
        institutionId: instId,
        name: c.name,
        description: c.description,
        targetMinor: c.target,
        deadline: daysFromNow(c.deadlineDays),
        status: c.status,
      },
    });
    campaignIds.set(c.name, row.id);
  }
  console.log(`  ✓ ${campaignIds.size} campaigns`);

  // ── Step 6: donations (pledged + received write-through) ────
  console.log('\n💛 Step 6: Creating donations...');

  const activeCampaigns = campaignSpec.filter((c) => c.status === 'ACTIVE');
  const donors = alumni.filter((a) => a.engagement === 'ACTIVE');
  const funds = ['GENERAL', 'LIBRARY', 'SCHOLARSHIP', 'INFRASTRUCTURE'] as const;

let pledgeCount = 0;
  let receivedCount = 0;

  /**
   * Gift ladder, in rupees — a deterministic table, NOT a random draw.
   *
   * This is an idempotency requirement, not a style choice. The dedupe lookup
   * below keys on (donor, campaign, fund, amount) — so if the amount comes from
   * a PRNG, re-running the seed produces a *different* amount, the lookup
   * misses, and the seed silently doubles the donation table. The first draft
   * of this file did exactly that: 6 pledged donations appeared on the second
   * run. Identity must be reproducible, so the amounts are fixed.
   *
   * The ladder deliberately spans four orders of magnitude (₹2,500 alumni dues
   * to ₹10L anchor gifts). A single flat amount makes the FY hero total and
   * every campaign bar meaningless.
   */
  const GIFT_LADDER = [
    2_500, 5_000, 10_000, 25_000, 50_000, 1_00_000, 7_500, 15_000,
    2_00_000, 30_000, 5_000, 5_00_000, 12_000, 75_000, 25_000, 10_00_000,
    40_000, 8_000, 1_50_000, 20_000, 3_500, 60_000, 9_000, 30_000,
  ] as const;

  /**
   * Each campaign declares how far along it should be, and gifts are drawn from
   * the ladder until that fraction of its target is reached.
   *
   * The alternative — a fixed number of random gifts spread evenly — put every
   * campaign between 2% and 8% funded, so every progress bar in the donations
   * screen and the dashboard rendered as an almost-empty sliver. A demo of a
   * fundraising desk has to show a campaign nearly funded and one nearly empty,
   * or it demonstrates nothing.
   *
   * `overFunded` campaigns deliberately exceed 100% (a reunion fund that
   * overshot is the most common real case) and `percent` in the service does
   * not clamp — so the UI must. That is the UI's job, not the seed's.
   */
  const campaignFunding = activeCampaigns.map((c, i) => ({
    campaign: c,
    fraction: [0.31, 0.68, 0.22, 1.14][i % 4],
  }));
  // The COMPLETED campaign is funded to just over its target.
  const completedCampaign = campaignSpec.find((c) => c.status === 'COMPLETED')!;
  campaignFunding.push({ campaign: completedCampaign, fraction: 1.06 });

  let giftIndex = 0;

  for (const { campaign, fraction } of campaignFunding) {
    const wantedRupees = (campaign.target / 100) * fraction;
    let raisedRupees = 0;
    let attempt = 0;

    while (raisedRupees < wantedRupees && attempt < 400) {
      const rupees = GIFT_LADDER[attempt % GIFT_LADDER.length];
      // Rotate donors so giving is spread across the graduate population rather
      // than concentrated in the first few names.
      const donor = donors[(giftIndex + attempt) % donors.length];
      const fund = funds[attempt % funds.length];
      // Every 6th gift is still pledged — a campaign with nothing outstanding
      // gives the "pledged" figure on the dashboard nothing to show.
      const isReceived = attempt % 6 !== 5;
      const createdDaysAgo = 5 + ((attempt * 17) % 290);
      const g = giftIndex++;

      const existing = await db.donation.findFirst({
        where: {
          institutionId: instId,
          alumniUserId: donor.userId,
          amountMinor: inr(rupees),
          fund,
          campaignId: campaignIds.get(campaign.name)!,
        },
      });
      if (existing) {
        // An already-seeded gift still COUNTS toward this campaign's goal. If it
        // were skipped without counting, the loop would never see its target
        // reached and would run to the attempt cap, inventing a fresh gift on
        // every rung — which is exactly how the first draft went from 213 to 419
        // received donations on the second run.
        if (existing.status === 'RECEIVED') raisedRupees += rupees;
        attempt++;
        continue;
      }

      if (!isReceived) {
        await db.donation.create({
          data: {
            institutionId: instId,
            campaignId: campaignIds.get(campaign.name)!,
            alumniUserId: donor.userId,
            fund,
            amountMinor: inr(rupees),
            status: 'PLEDGED',
            createdAt: daysAgo(createdDaysAgo),
          },
        });
        pledgeCount++;
        attempt++;
        continue;
      }

      const paidAt = daysAgo(createdDaysAgo);
      const seq = String(g + 1).padStart(4, '0');
      const referenceNo = `PAY-DON-2026-${seq}`;
      const existingPayment = await db.payment.findFirst({
        where: { institutionId: instId, referenceNo },
      });
      if (existingPayment) {
        // Same reasoning as the donation check above: a payment that already
        // exists means this gift is already banked, so it counts toward the goal
        // rather than pushing the loop on to invent another one.
        raisedRupees += rupees;
        attempt++;
        continue;
      }

      const donation = await db.donation.create({
        data: {
          institutionId: instId,
          campaignId: campaignIds.get(campaign.name)!,
          alumniUserId: donor.userId,
          fund,
          amountMinor: inr(rupees),
          status: 'PLEDGED', // flipped to RECEIVED below, inside the same write
          createdAt: daysAgo(createdDaysAgo + 2),
        },
      });

      // The write-through, identical in shape to recordDonation(). Donation →
      // Payment(DONATION) → Receipt → DonationPayment. Skipping the Receipt
      // would break the finance reconciliation report (F-09).
      const payment = await db.payment.create({
        data: {
          institutionId: instId,
          payerUserId: donor.userId,
          studentProfileId: null,
          category: 'DONATION',
          referenceNo,
          amountMinor: inr(rupees),
          method: pick(['UPI', 'NET_BANKING', 'CARD'] as const),
          status: 'CLEARED',
          paidAt,
          recordedByUserId: officer.id,
        },
      });
      await db.receipt.create({
        data: { paymentId: payment.id, receiptNo: `RCP-DON-2026-${seq}` },
      });
      await db.donationPayment.create({
        data: { paymentId: payment.id, donationId: donation.id },
      });
      await db.donation.update({
        where: { id: donation.id },
        data: { status: 'RECEIVED', receivedAt: paidAt, paymentId: payment.id },
      });

      raisedRupees += rupees;
      receivedCount++;
      attempt++;
    }
  }
  console.log(`  ✓ ${receivedCount} received (with payment+receipt), ${pledgeCount} pledged`);

  // ── Step 7: recompute campaign.raisedMinor ─────────────────
  // Recomputed, not incremented. An incrementing seed drifts the moment it runs
  // twice, and the dashboard progress bar is the first thing anyone checks.
  console.log('\n🧮 Step 7: Reconciling campaign totals...');
  for (const name of campaignIds.keys()) {
    const agg = await db.donation.aggregate({
      where: { campaignId: campaignIds.get(name)!, status: 'RECEIVED' },
      _sum: { amountMinor: true },
    });
    await db.fundraisingCampaign.update({
      where: { id: campaignIds.get(name)! },
      data: { raisedMinor: agg._sum.amountMinor ?? 0 },
    });
  }
  console.log('  ✓ campaign totals match received donations');

  // ── Step 8: mentorship ─────────────────────────────────────
  // Requests → accepted pairs → sessions, goals, and two-way feedback.
  //
  // Rebuilt because the previous version produced only pairs: every mentee was a
  // student, no pair had a request behind it, nothing had goals or feedback, and
  // every session was a bare timestamp with no duration, mode or outcome. That
  // made the whole programme look like a spreadsheet someone typed by hand.
  console.log('\n🤝 Step 8: Creating mentorship requests, pairs, sessions, goals...');

  const studentProfiles = await db.studentProfile.findMany({
    where: { institutionId: instId },
    select: { id: true, rollNo: true, currentSemester: true, user: { select: { id: true, fullName: true } } },
  });
  if (studentProfiles.length === 0) throw new Error('No students — run seed-realistic.ts first');

  // Mentors are drawn from the senior, active cohorts; mentees from students.
  // Pairing a 2025 graduate as "mentor" would make the programme look silly.
  const mentorPool = alumni
    .filter((a) => a.seniority >= 3 && a.engagement === 'ACTIVE')
    .sort((a, b) => b.seniority - a.seniority);
  if (mentorPool.length === 0) throw new Error('No senior alumni available to mentor');

  // Alumni↔alumni is now a supported shape, so it is seeded too — otherwise the
  // `alumniToAlumni` stat on the hub always reads zero and the split is untested.
  const alumniMenteePool = alumni
    .filter((a) => a.seniority >= 5)
    .slice(0, 6);

  const SESSION_NOTES = [
    'Walked through resume positioning and two mock interviews.',
    'Reviewed portfolio; suggested one systems-design project.',
    'Discussed higher-study options and exam timelines.',
    'Intro call: what the first 90 days in the role look like.',
    'Referral advice and how to approach hiring managers on LinkedIn.',
    'Salary negotiation prep — offer comparison sheet.',
  ];
  const SESSION_MODES = ['VIDEO', 'IN_PERSON', 'PHONE'] as const;
  const SESSION_OUTCOMES = [
    'Landed two interviews; one referral submitted.',
    'CV rewritten, applying to eight roles this week.',
    'Decided between two programmes and committed to one.',
    'Shipped the first version of the side project.',
    'Offer accepted; negotiation moved the base by 12%.',
    'Left with a written plan and two deadlines.',
  ];
  const AGENDAS = [
    'Portfolio review + next steps',
    'Mock interview, behavioural round',
    'Higher studies: exams, deadlines, funding',
    'Offer negotiation strategy',
    'First-time manager: hiring and feedback',
  ];

  /** Goals for an active pair: the mix is deliberate — a fully-achieved set reads
   *  as fake, and an untouched set reads as abandoned. */
  function goalsFor(field: string) {
    return [
      { title: `Get the CV reviewed by someone senior`, detail: 'Two rounds of feedback before applying.', pct: 100, offsetDays: 90 },
      { title: `Apply to ${field.toLowerCase()} roles`, detail: null, pct: 75, offsetDays: 45 },
      { title: 'Run three mock interviews', detail: 'One behavioural, one technical, one case.', pct: 33, offsetDays: 60 },
      { title: 'Build one portfolio-worthy project', detail: null, pct: 0, offsetDays: 120 },
    ];
  }

  type PairSpec = {
    status: 'ACTIVE' | 'PENDING' | 'DECLINED' | 'COMPLETED';
    field: string;
    sessions: number;
    mentee: 'STUDENT' | 'ALUMNI';
    goals?: boolean;
    feedback?: boolean;
    planned?: boolean;
    declineReason?: string;
    completionOutcome?: string;
  };

  const pairPlan: PairSpec[] = [
    { status: 'ACTIVE', field: 'Career Guidance', sessions: 4, mentee: 'STUDENT', goals: true, feedback: true, planned: true },
    { status: 'ACTIVE', field: 'Higher Studies', sessions: 3, mentee: 'STUDENT', goals: true, planned: true },
    { status: 'ACTIVE', field: 'Interview Prep', sessions: 5, mentee: 'ALUMNI', goals: true, feedback: true },
    { status: 'ACTIVE', field: 'Entrepreneurship', sessions: 2, mentee: 'ALUMNI', goals: true },
    { status: 'ACTIVE', field: 'Global Careers', sessions: 3, mentee: 'ALUMNI', goals: true, feedback: true },
    { status: 'ACTIVE', field: 'Finance & Investing', sessions: 1, mentee: 'STUDENT', goals: true },
    { status: 'ACTIVE', field: 'Engineering Management', sessions: 2, mentee: 'ALUMNI', goals: true, planned: true },
    { status: 'ACTIVE', field: 'Interview Prep', sessions: 1, mentee: 'STUDENT', goals: true },
    { status: 'ACTIVE', field: 'Career Guidance', sessions: 6, mentee: 'ALUMNI', goals: true, feedback: true, planned: true },
    { status: 'PENDING', field: 'Higher Studies', sessions: 0, mentee: 'STUDENT' },
    { status: 'PENDING', field: 'Career Guidance', sessions: 0, mentee: 'ALUMNI' },
    { status: 'PENDING', field: 'Entrepreneurship', sessions: 0, mentee: 'STUDENT' },
    { status: 'PENDING', field: 'Global Careers', sessions: 0, mentee: 'STUDENT' },
    { status: 'PENDING', field: 'Interview Prep', sessions: 0, mentee: 'ALUMNI' },
    {
      status: 'DECLINED',
      field: 'Finance & Investing',
      sessions: 0,
      mentee: 'STUDENT',
      declineReason: 'I am at capacity this term — please ask again in January.',
    },
    { status: 'DECLINED', field: 'Global Careers', sessions: 0, mentee: 'STUDENT', declineReason: 'That is outside what I have worked on.' },
    // A finished pair, so History is not empty and the dropped-goal behaviour is
    // actually represented in the data rather than only in the service code.
    { status: 'COMPLETED', field: 'Career Guidance', sessions: 4, mentee: 'STUDENT', goals: true, completionOutcome: 'Placed at a product firm; mentorship no longer needed.' },
  ];

  let pairCount = 0;
  let sessionCount = 0;
  let goalCount = 0;
  let pairReviewCount = 0;

  for (let i = 0; i < pairPlan.length; i++) {
    const plan = pairPlan[i];
    const mentor = mentorPool[i % mentorPool.length];
    const menteeAlumni = plan.mentee === 'ALUMNI' ? alumniMenteePool[i % alumniMenteePool.length] : null;
    // Never pair someone with themselves, however the modulo lands.
    if (menteeAlumni && menteeAlumni.userId === mentor.userId) continue;
    const menteeStudent = menteeAlumni ? null : studentProfiles[i % studentProfiles.length];

    const requestedAt = daysAgo(intBetween(20, 300));
    const approvedAt = plan.status === 'ACTIVE' || plan.status === 'COMPLETED' ? daysAgo(intBetween(5, 180)) : null;
    const completedAt = plan.status === 'COMPLETED' ? daysAgo(intBetween(2, 60)) : null;

    const pairWhere = {
      mentorAlumniUserId: mentor.userId,
      ...(menteeAlumni ? { menteeAlumniProfileId: menteeAlumni.profileId } : { menteeStudentProfileId: menteeStudent!.id }),
    };
    let pair = await db.mentorshipPair.findFirst({ where: pairWhere });

    if (!pair) {
      pair = await db.mentorshipPair.create({
        data: {
          ...pairWhere,
          field: plan.field,
          status: plan.status,
          requestedAt,
          approvedAt,
          completedAt,
          declinedReason: plan.declineReason ?? null,
          // Kept as the pair's denormalised pointer, which the card reads for
          // "next: Thursday". Filled in below once a booking exists.
          nextSessionAt: null,
        },
      });
    }
    pairCount++;

    // Children are guarded individually rather than by skipping the whole pair.
    // A single `continue` on an existing pair meant that re-running the seed after
    // changing the fixture could never ADD what was missing — the three pairs here
    // stayed goal-less forever and the integrity check below caught it.
    const hasHeld = (await db.mentorshipSession.count({ where: { pairId: pair.id, planned: false } })) > 0;
    const hasGoals = (await db.mentorshipGoal.count({ where: { pairId: pair.id } })) > 0;
    const hasReviews = (await db.mentorshipFeedback.count({ where: { pairId: pair.id } })) > 0;
    const hasBooking = (await db.mentorshipSession.count({ where: { pairId: pair.id, planned: true, cancelledAt: null } })) > 0;

    // A PENDING pair with a session log is a contradiction the screen would
    // render as-is, so sessions only exist once a pair is ACTIVE or COMPLETED.
    if ((plan.status === 'ACTIVE' || plan.status === 'COMPLETED') && !hasHeld) {
      for (let s = 0; s < plan.sessions; s++) {
        const mode = SESSION_MODES[(i + s) % SESSION_MODES.length];
        await db.mentorshipSession.create({
          data: {
            pairId: pair.id,
            sessionDate: daysAgo((plan.sessions - s) * 21 + intBetween(0, 6)),
            mode,
            durationMinutes: [30, 45, 45, 60, 90][(i + s) % 5],
            agenda: AGENDAS[(i + s) % AGENDAS.length],
            notes: SESSION_NOTES[(i * 3 + s) % SESSION_NOTES.length],
            outcome: SESSION_OUTCOMES[(i * 3 + s) % SESSION_OUTCOMES.length],
            planned: false,
            loggedByUserId: mentor.userId,
          },
        });
        sessionCount++;
      }
    }

    // A booking in the future, which is what makes `nextSessionAt` real.
    if (plan.planned && !hasBooking) {
      const when = daysFromNow(intBetween(3, 25));
      await db.mentorshipSession.create({
        data: {
          pairId: pair.id,
          sessionDate: when,
          mode: 'VIDEO',
          agenda: 'Next session: progress review and next steps',
          planned: true,
          loggedByUserId: mentor.userId,
        },
      });
      sessionCount++;
      await db.mentorshipPair.update({ where: { id: pair.id }, data: { nextSessionAt: when } });
    }

    if (plan.goals && !hasGoals) {
      const spec = goalsFor(plan.field);
      for (let g = 0; g < spec.length; g++) {
        const goal = spec[g];
        const achieved = goal.pct === 100;
        // On a COMPLETED pair the service would have dropped everything still
        // open, so anything left IN_PROGRESS here would contradict the very rule
        // the History tab relies on.
        const dropped = plan.status === 'COMPLETED' && !achieved;
        await db.mentorshipGoal.create({
          data: {
            pairId: pair.id,
            title: goal.title,
            detail: goal.detail,
            status: achieved ? 'ACHIEVED' : dropped ? 'DROPPED' : goal.pct > 0 ? 'IN_PROGRESS' : 'PENDING',
            progressPct: goal.pct,
            targetDate: daysFromNow(goal.offsetDays),
            achievedAt: achieved ? daysAgo(intBetween(10, 70)) : null,
            createdByUserId: mentor.userId,
          },
        });
        goalCount++;
      }
    }

    // Two-way feedback, from both sides, on an ACTIVE pair only — the service
    // refuses it otherwise, so seeding it anywhere else would be fiction.
    if (plan.feedback && plan.status === 'ACTIVE' && !hasReviews) {
      await db.mentorshipFeedback.create({
        data: {
          pairId: pair.id,
          authorUserId: mentor.userId,
          menteeRating: [4, 5, 5][i % 3],
          comment: 'Prepared properly every time and followed through on the plan.',
        },
      });
      const menteeUserId = menteeAlumni?.userId ?? menteeStudent!.user.id;
      await db.mentorshipFeedback.create({
        data: {
          pairId: pair.id,
          authorUserId: menteeUserId,
          mentorRating: [4, 5, 5][(i + 1) % 3],
          comment: 'Unrealistically clear on what to do next. Worth the time.',
        },
      });
      pairReviewCount += 2;
    }
  }

  // Requests. A pair created by accepting a request keeps the link, so the
  // office can show "this came from a request" instead of an orphan pair.
  const openRequests = [
    {
      mentee: 'ALUMNI' as const,
      idx: 0,
      skills: 'System design, Interview prep',
      message: 'I have an offer for a backend role and want to sanity-check the system design round before the final interview.',
      field: 'Interview Prep',
      addressed: true,
    },
    {
      mentee: 'STUDENT' as const,
      idx: 1,
      skills: 'C++, Campus placements',
      message: 'Final year, placements start next month and I would like to know how to structure preparation.',
      field: 'Career Guidance',
      addressed: false,
    },
    {
      mentee: 'STUDENT' as const,
      idx: 2,
      skills: 'Higher studies, GRE',
      message: 'Deciding between two programmes and completely lost on the exams.',
      field: 'Higher Studies',
      addressed: false,
    },
    {
      mentee: 'ALUMNI' as const,
      idx: 3,
      skills: 'Product & Design',
      message: '',
      field: 'Product & Design',
      addressed: true,
    },
  ];

  let requestCount = 0;
  for (const r of openRequests) {
    const menteeAlumni = r.mentee === 'ALUMNI' ? alumni[r.idx + 8] : null;
    const menteeStudent = r.mentee === 'STUDENT' ? studentProfiles[(r.idx + 5) % studentProfiles.length] : null;
    if (!menteeAlumni && !menteeStudent) continue;
    const menteeUserId = menteeAlumni?.userId ?? menteeStudent!.user.id;
    if (menteeUserId === officer.id) continue;

    const exists = await db.mentorshipRequest.findFirst({
      where: { menteeUserId, status: 'PENDING', requestedSkills: r.skills },
    });
    if (exists) continue;

    await db.mentorshipRequest.create({
      data: {
        institutionId: instId,
        menteeUserId,
        menteeAlumniProfileId: menteeAlumni?.profileId ?? null,
        menteeStudentProfileId: menteeStudent?.id ?? null,
        mentorAlumniUserId: r.addressed ? mentorPool[(r.idx + 3) % mentorPool.length].userId : null,
        requestedSkills: r.skills,
        message: r.message || null,
        field: r.field,
        status: 'PENDING',
      },
    });
    requestCount++;
  }

  console.log(
    `  ✓ ${pairCount} pairs processed · ${sessionCount} sessions + ${goalCount} goals + ${pairReviewCount} reviews + ${requestCount} requests added`,
  );

  // ── Step 9: alumni events, schedules, RSVPs ────────────────
  console.log('\n🎉 Step 9: Creating alumni events...');

  const venueMain = await db.venue.upsert({
    where: { institutionId_name: { institutionId: instId, name: 'Main Auditorium' } },
    update: {},
    create: {
      institutionId: instId,
      name: 'Main Auditorium',
      location: 'Block C, Ground Floor',
      capacity: 500,
    },
  });
  const venueSeminar = await db.venue.upsert({
    where: { institutionId_name: { institutionId: instId, name: 'Seminar Hall' } },
    update: {},
    create: {
      institutionId: instId,
      name: 'Seminar Hall',
      location: 'Block A, Second Floor',
      capacity: 120,
    },
  });

  const eventSpec = [
    {
      title: 'Alumni Homecoming 2026',
      description:
        'The flagship homecoming for the Classes of 2015–2025: reunion dinners by cohort, a panel with senior alumni, and the annual scholarship announcement.',
      eventType: 'REUNION',
      startOffset: 45,
      durationDays: 2,
      capacity: 300,
      venue: venueMain,
      status: 'PUBLISHED',
      schedule: [
        [1, 'Registration & cohort meetups', '09:30', null, 'Alumni Relations', 'Main Auditorium'],
        [1, 'Panel: careers after campus', '11:00', null, 'Neelima Menon', 'Main Auditorium'],
        [1, 'Reunion lunch by graduating year', '14:00', null, null, 'Courtyard'],
        [2, 'Scholarship announcement', '10:00', null, 'Dr. R. Iyer', 'Main Auditorium'],
        [2, 'Alumni awards & closing', '12:00', null, null, 'Main Auditorium'],
      ],
    },
    {
      title: 'Alumni Tech Talk: AI in Production',
      description:
        'A virtual session on taking models from notebook to production, with two alumni speakers and an open Q&A.',
      eventType: 'WEBINAR',
      isOnline: true,
      meetingUrl: 'https://meet.learnix.dev/alumni-tech-talk-2026',
      startOffset: 12,
      durationDays: 1,
      capacity: 200,
      venue: null,
      status: 'PUBLISHED',
      schedule: [
        [1, 'Welcome & speaker intro', '17:00', null, 'Host', 'Online'],
        [1, 'Scaling inference on a budget', '17:15', null, 'Arjun Nair', 'Online'],
        [1, 'Open Q&A', '18:00', null, null, 'Online'],
      ],
    },
    {
      title: 'Bengaluru Chapter Meetup',
      description: 'An evening of food and conversation for alumni based in and around Bengaluru.',
      eventType: 'MEETUP',
      startOffset: 20,
      durationDays: 1,
      capacity: 80,
      venue: venueSeminar,
      status: 'APPROVED',
      schedule: [
        [1, 'Introductions', '18:30', null, null, 'Seminar Hall'],
        [1, 'Chapter updates & mentoring sign-up', '19:00', null, 'Bhavana Banerjee', 'Seminar Hall'],
      ],
    },
    {
      title: 'Global Alumni Reunion 2026',
      description:
        'A hybrid reunion for alumni across 14 countries, streamed to every chapter.',
      eventType: 'REUNION',
      startOffset: 90,
      durationDays: 1,
      capacity: 500,
      venue: venueMain,
      status: 'APPROVED',
      schedule: [
        [1, 'Global chapter roll-call', '18:00', null, null, 'Main Auditorium'],
        [1, 'Keynote & livestream Q&A', '18:45', null, 'Sanjay Iyer', 'Main Auditorium'],
      ],
    },
    {
      title: 'Alumni Mentorship Kickoff 2025',
      description: 'Launch of the 2025–26 mentorship cohort: 60 pairs, 8 fields.',
      eventType: 'WORKSHOP',
      startOffset: -120,
      durationDays: 1,
      capacity: 150,
      venue: venueSeminar,
      status: 'COMPLETED',
      schedule: [
        [1, 'Programme overview', '10:00', null, null, 'Seminar Hall'],
        [1, 'Mentor/mentee matching', '11:00', null, null, 'Seminar Hall'],
      ],
    },
    {
      title: 'Annual Alumni Awards 2025',
      description: 'Distinguished alumni awards across five categories, plus the batch medallion roll.',
      eventType: 'NETWORKING',
      startOffset: -200,
      durationDays: 1,
      capacity: 250,
      venue: venueMain,
      status: 'COMPLETED',
      schedule: [
        [1, 'Awards ceremony', '17:00', null, null, 'Main Auditorium'],
        [1, 'Dinner', '19:00', null, null, 'Courtyard'],
      ],
    },
    {
      title: 'Alumni Design Workshop: Systems Thinking',
      description:
        'A hands-on half-day workshop on systems thinking for product and design leaders, capped at 40 for the exercise to work.',
      eventType: 'WORKSHOP',
      startOffset: 30,
      durationDays: 1,
      capacity: 40,
      venue: venueSeminar,
      status: 'PUBLISHED',
      schedule: [
        [1, 'Framing exercise', '10:00', null, 'Priya Nair', 'Seminar Hall'],
        [1, 'Mapping the system', '11:30', null, 'Priya Nair', 'Seminar Hall'],
        [1, 'Group presentations', '14:00', null, null, 'Seminar Hall'],
      ],
    },

    // ── Adopted events ─────────────────────────────────────────
    // These two ALUMNI events were created by earlier seeds, before this file
    // existed. They are listed here so their schedule timeline and RSVP list get
    // topped up; their dates, venue, capacity and status are left untouched,
    // because the officer may already have published them. They sort first in
    // the events list, so an empty timeline here is the first thing anyone sees.
    {
      title: 'Alumni Networking Meet 2026',
      description: 'Batch of 2026 meets alumni mentors.',
      eventType: 'NETWORKING',
      adopt: true,
      schedule: [
        [1, 'Registration', '09:00', null, null, 'Seminar Hall'],
        [1, 'Mentor introductions', '10:00', null, null, 'Seminar Hall'],
        [1, 'Networking lunch', '12:00', null, null, 'Courtyard'],
      ],
    },
    {
      title: 'Alumni Networking Meet',
      description: 'Batch of 2026 meets alumni mentors.',
      eventType: 'NETWORKING',
      adopt: true,
      schedule: [
        [1, 'Registration', '09:00', null, null, 'Seminar Hall'],
        [1, 'Mentor introductions', '10:00', null, null, 'Seminar Hall'],
        [1, 'Networking lunch', '12:00', null, null, 'Courtyard'],
      ],
    },
  ];

  /** Schedule for an adopted event that has none of its own. */
  const FALLBACK_SCHEDULE: ScheduleSlot[] = [[1, 'Details to be announced', null, null, null, null]];

  let eventCount = 0;
  let rsvpCount = 0;
  let attendanceCount = 0;

  for (const e of eventSpec) {
    let event = await db.event.findFirst({
      where: { institutionId: instId, title: e.title },
    });
    if (!event) {
      event = await db.event.create({
        data: {
          institutionId: instId,
          title: e.title,
          description: e.description,
          category: 'ALUMNI',
          eventType: e.eventType,
          isOnline: e.isOnline ?? false,
          meetingUrl: e.meetingUrl ?? null,
          startDate: daysFromNow(e.startOffset),
          endDate: daysFromNow(e.startOffset + e.durationDays),
          venueId: e.isOnline ? null : e.venue?.id ?? null,
          capacity: e.capacity ?? 100,
          organizerUserId: officer.id,
          status: e.status,
        },
      });
      eventCount++;
    } else if (!event.eventType) {
      // Adopted events predate the alumni taxonomy. Backfill the type so the
      // filter chips are not full of gaps, without touching dates or status.
      await db.event.update({ where: { id: event.id }, data: { eventType: e.eventType } });
      event = { ...event, eventType: e.eventType };
    }

    // The schedule is ensured for EVERY alumni event, not just the ones created
    // above. Two ALUMNI events predate this seed ("Alumni Networking Meet",
    // "Alumni Networking Meet 2026") and were left with no schedule items, so
    // the event detail screen rendered an empty day-wise timeline for them —
    // and because the list sorts by startDate, that empty timeline was the
    // FIRST thing an officer saw. Guarded by a count so re-running never
    // duplicates items (the (eventId, day, order) unique would throw anyway).
    const scheduleRows = (await db.eventScheduleItem.count({ where: { eventId: event.id } }))
      ? []
      : (e.schedule ?? FALLBACK_SCHEDULE);

    // `order` is unique per (eventId, day), so it must count within the day
    // rather than across the whole schedule — otherwise day 2 starts at 101
    // and the timeline reads as if it had 100 empty slots.
    const orderWithinDay = new Map<number, number>();
    for (const [day, item, time, , speaker, location] of scheduleRows) {
      const order = (orderWithinDay.get(day) ?? 0) + 1;
      orderWithinDay.set(day, order);
      await db.eventScheduleItem.create({
        data: {
          eventId: event.id,
          day,
          order,
          item,
          isDone: e.status === 'COMPLETED',
          // Times hang off the event's own start date so the agenda shows a real
          // clock time instead of the old "09:30 — Registration" string, which
          // put the time inside the title where it could not be sorted or styled.
          startsAt: time ? slotTime(event.startDate, day, time) : null,
          endsAt: time ? slotTime(event.startDate, day, time, 60) : null,
          speaker: speaker ?? null,
          location: location ?? null,
        },
      });
    }

    // RSVPs: a mix of CONFIRMED / PENDING / DECLINED / APPROVED, capped by
    // capacity. All-confirmed registrations would make the RSVP progress bar on
    // the dashboard permanently 100%.
    //
    // Both the headcount and the status mix are derived from the event index and
    // the RSVP index, NOT from the PRNG — same idempotency reason as the gift
    // table above. A random target meant every re-run registered a fresh slice
    // of alumni (RSVPs climbed 217 → 243 across two runs).
    // Capacity, start date and status are read from the EVENT ROW, not the spec.
    // An adopted event has none of these in its spec entry, and reading them
    // from there produced `Math.min(undefined, n)` → NaN → zero RSVPs.
    const isPastEvent = event.startDate.getTime() < Date.now();
    const eventIndex = eventSpec.indexOf(e);
    // The capped workshop is seeded OVER capacity on purpose, so the waitlist is
    // exercised: registering past capacity must land in PENDING, not be refused.
    const target = event.capacity === 40 ? 47 : Math.min(event.capacity, 18 + ((eventIndex * 11) % 27));
    const pool = [...donors, ...alumni.filter((a) => a.engagement !== 'LOST')];
    for (let i = 0; i < target; i++) {
      const person = pool[(i * 3 + eventIndex) % pool.length];
      const roll = ((i * 7 + eventIndex * 13) % 100) / 100;
      const status = isPastEvent
        ? roll < 0.75 ? 'CONFIRMED' : 'DECLINED'
        : roll < 0.55 ? 'CONFIRMED' : roll < 0.72 ? 'PENDING' : roll < 0.88 ? 'APPROVED' : 'DECLINED';

      const existing = await db.eventRegistration.findFirst({
        where: { eventId: event.id, registrantUserId: person.userId },
      });
      if (existing) continue;

      // ── Real attendance on past events ──
      // Attendance used to be inferred from status='CONFIRMED', which made every
      // past event look 100% full. Roughly 8 in 10 people who confirm actually
      // turn up, so past events now carry genuine check-in rows and the chapter
      // participation metrics have something true to count.
      const attended = isPastEvent && status === 'CONFIRMED' && roll < 0.82;
      const attendedAt = attended ? slotTime(event.startDate, 1, '09:15', 0) : null;

      await db.eventRegistration.create({
        data: {
          eventId: event.id,
          registrantUserId: person.userId,
          status,
          // A real, verifiable code — `qrPayload` used to be a JSON blob nothing
          // ever read. The mock check-in endpoint verifies this exact value.
          qrPayload: `EVT:${event.id.slice(-6).toUpperCase()}:${person.userId.slice(-6).toUpperCase()}:${(i + 1)
            .toString(36)
            .toUpperCase()
            .padStart(4, '0')}`,
          checkedInAt: attendedAt,
          checkInMethod: attended ? (i % 3 === 0 ? 'QR' : 'MANUAL') : null,
        },
      });
      rsvpCount++;
      if (attended) attendanceCount++;
    }
  }
  console.log(`  ✓ ${eventCount} events, ${rsvpCount} RSVPs, ${attendanceCount} checked in`);

  // ── Step 10: chapter member counts ─────────────────────────
  console.log('\n📊 Step 10: Reconciling chapter counts...');
  for (const [city, cid] of chapterId) {
    const members = await db.alumniProfile.count({
      where: { institutionId: instId, chapterId: cid, engagementStatus: 'ACTIVE' },
    });
    await db.alumniChapter.update({ where: { id: cid }, data: { memberCount: members } });
  }
  console.log(`  ✓ ${chapterId.size} chapter counts`);

  // ── Step 11: notifications for the officer ─────────────────
  console.log('\n🔔 Step 11: Seeding officer notifications...');

  const officerNotifications = [
    { type: 'MENTORSHIP', title: '5 mentorship requests awaiting review', body: 'Pairs from the Class of 2026 cohort are pending your decision.' },
    { type: 'DONATION', title: 'Donation receipts forwarded to Accounts', body: 'Reconciliation completed for this cycle — 0 unreceipted payments.' },
    { type: 'EVENT', title: 'Homecoming RSVPs crossed 70%', body: 'Alumni Homecoming 2026 is filling up. Consider a reminder broadcast.' },
    { type: 'BROADCAST', title: 'Bengaluru Chapter newsletter sent', body: 'Delivered to 14 chapter members.' },
    { type: 'SYSTEM', title: 'Merit Scholarship Fund at 80% of target', body: '₹80L raised of ₹1Cr. Deadline in 150 days.' },
  ];

  let notifCount = 0;
  for (const n of officerNotifications) {
    const existing = await db.notification.findFirst({
      where: { recipientUserId: officer.id, institutionId: instId, title: n.title },
    });
    if (existing) continue;
    await db.notification.create({
      data: {
        institutionId: instId,
        recipientUserId: officer.id,
        type: n.type,
        title: n.title,
        body: n.body,
        sourceModule: 'alumni',
      },
    });
    notifCount++;
  }
  console.log(`  ✓ ${notifCount} notifications`);

  // ── Step 12: mark the Relations Office ──────────────────────
  // The office user and a graduate are indistinguishable otherwise: both hold
  // role ALUMNI, both have an AlumniProfile, neither has a StaffProfile. That
  // matters because connection requests, privacy settings and self-service
  // profile edits are things an ALUMNUS does, while mentorship approval,
  // donation recording and broadcast are things the OFFICE does. One extra role
  // separates them without inventing an employee record.
  console.log('\n🏷️  Step 12: Marking the Alumni Relations Office...');
  const officeRole = await db.userRole.findFirst({
    where: { userId: officer.id, role: 'ALUMNI_OFFICE' },
  });
  if (!officeRole) {
    await db.userRole.create({ data: { userId: officer.id, role: 'ALUMNI_OFFICE' } });
  }
  console.log('  ✓ priya@learnix.dev → ALUMNI + ALUMNI_OFFICE');

  // ── Step 13: skills ─────────────────────────────────────────
  console.log('\n🧠 Step 13: Seeding skills & expertise...');
  let skillCount = 0;
  for (const a of alumni) {
    const pool = SKILLS[a.dept] ?? SKILLS.CSE;
    // 3–6 skills each, taken from a rotating window of the department's
    // vocabulary so the whole vocabulary is represented and no two profiles
    // are identical. Deterministic: the offsets derive from the index.
    const skillTotal = 3 + (a.profileId.length % 4);
    const start = a.profileId.charCodeAt(a.profileId.length - 1) % pool.length;
    for (let s = 0; s < skillTotal; s++) {
      const skill = pool[(start + s) % pool.length];
      // Level correlates with seniority — a 2015 graduate is not a BEGINNER in
      // their field ten years in. A random level would make the mentor-matcher
      // recommend a brand-new graduate to mentor a final-year student.
      const level =
        a.seniority >= 10 ? pick(['ADVANCED', 'EXPERT'] as const)
        : a.seniority >= 5 ? pick(['INTERMEDIATE', 'ADVANCED'] as const)
        : pick(['INTERMEDIATE', 'ADVANCED'] as const);
      const created = await db.alumniSkill.findFirst({
        where: { alumniProfileId: a.profileId, skill },
      });
      if (created) continue;
      await db.alumniSkill.create({
        data: {
          alumniProfileId: a.profileId,
          skill,
          level,
          yearsExperience: Math.max(1, Math.min(a.seniority, 15)),
        },
      });
      skillCount++;
    }
  }
  console.log(`  ✓ ${skillCount} skills`);

  // ── Step 14: career journeys ────────────────────────────────
  console.log('\n📈 Step 14: Seeding career journeys...');
  let careerCount = 0;
  for (const a of alumni) {
    const ladder = CAREER_STEPS[a.dept] ?? CAREER_STEPS.CSE;
    // How far up the ladder this person climbed: a fraction of their years out.
    const reached = Math.max(1, Math.min(ladder.length, Math.round((a.seniority / 22) * ladder.length) || 1));
    const gradAt = new Date(`${a.gradYear + 1}-06-30T00:00:00.000Z`);

    for (let s = 0; s < reached; s++) {
      const step = ladder[s];
      const company = pick(COMPANIES);
      const from = new Date(gradAt);
      from.setMonth(from.getMonth() + step.offsetMonths);
      // The last rung reached is their CURRENT role → toMonth stays null. Every
      // earlier rung is closed. Without this every entry looks open-ended and
      // the timeline renders as a stack of simultaneous jobs.
      const isCurrent = s === reached - 1;
      const to = isCurrent ? null : new Date(from);
      if (!isCurrent) to.setMonth(to.getMonth() + Math.max(14, Math.round(a.seniority / reached)));

      const exists = await db.alumniCareerEntry.findFirst({
        where: { alumniProfileId: a.profileId, title: step.title, fromMonth: from },
      });
      if (exists) continue;
      await db.alumniCareerEntry.create({
        data: {
          alumniProfileId: a.profileId,
          title: step.title,
          companyId: companyId.get(company.name) ?? null,
          employerLabel: company.name,
          location: company.city,
          fromMonth: from,
          toMonth: to,
          isHighlight: isCurrent,
        },
      });
      careerCount++;
    }
  }
  console.log(`  ✓ ${careerCount} career entries`);

  // ── Step 15: privacy settings ───────────────────────────────
  console.log('\n🔒 Step 15: Seeding privacy settings...');
  let privacyCount = 0;
  for (const a of alumni) {
    const existing = await db.alumniPrivacySettings.findFirst({
      where: { alumniProfileId: a.profileId },
    });
    if (existing) continue;
    // Contact details stay hidden for MOST alumni — that is the agreed default,
    // so the directory must demonstrate the redaction rather than showing 56
    // published email addresses. A deterministic handful opt in, so both
    // branches of the privacy gate are exercised in the seeded data.
    const optsIn = a.profileId.charCodeAt(a.profileId.length - 2) % 5 === 0;
    await db.alumniPrivacySettings.create({
      data: {
        alumniProfileId: a.profileId,
        showEmail: optsIn,
        showPhone: false,
        showLocation: true,
        showCareer: true,
        showSkills: true,
        discoverable: a.engagement !== 'LOST',
        visibleTo: optsIn ? 'ANYONE' : 'CONNECTIONS',
      },
    });
    privacyCount++;
  }
  // The officer is not a directory subject, but a self-service profile screen
  // still reads these — without a row every read has to invent a default.
  const officerProfile = await db.alumniProfile.findFirst({ where: { userId: officer.id } });
  if (officerProfile) {
    const officerPrivacy = await db.alumniPrivacySettings.findFirst({
      where: { alumniProfileId: officerProfile.id },
    });
    if (!officerPrivacy) {
      await db.alumniPrivacySettings.create({
        data: {
          alumniProfileId: officerProfile.id,
          showEmail: true,
          showPhone: true,
          visibleTo: 'ANYONE',
          discoverable: false, // the office is staff, not a directory entry
        },
      });
      privacyCount++;
    }
  }
  console.log(`  ✓ ${privacyCount} privacy records`);

  // ── Step 16: connections ────────────────────────────────────
  console.log('\n🤝 Step 16: Seeding connections...');
  let connCount = 0;
  // Same-batch pairs (the realistic case: a 2019 CSE cohort stays in touch)
  // plus same-city pairs across batches.
  const connectionPlan: { status: string; pick: (i: number) => AlumniRow }[] = [
    { status: 'ACCEPTED', pick: (i) => alumni[i] },
    { status: 'ACCEPTED', pick: (i) => alumni[(i * 3 + 1) % alumni.length] },
    { status: 'ACCEPTED', pick: (i) => alumni[(i * 7 + 2) % alumni.length] },
    { status: 'PENDING', pick: (i) => alumni[(i * 5 + 4) % alumni.length] },
    { status: 'PENDING', pick: (i) => alumni[(i * 11 + 6) % alumni.length] },
    { status: 'DECLINED', pick: (i) => alumni[(i * 13 + 7) % alumni.length] },
  ];

  for (let i = 0; i < 40; i++) {
    const from = connectionPlan[i % connectionPlan.length];
    const requester = from.pick(i);
    // Prefer a peer from the same cohort or city — the graph should look like a
    // real network (dense inside a cohort, sparse across the whole population)
    // rather than 40 uniformly random edges between strangers.
    const sameCohort = alumni.filter((a) => a.gradYear === requester.gradYear && a.userId !== requester.userId);
    const sameCity = alumni.filter((a) => a.city === requester.city && a.userId !== requester.userId);
    const pool = sameCohort.length > 1 && i % 3 !== 2 ? sameCohort : sameCity.length ? sameCity : alumni;
    const recipient = pool[(i * 13) % pool.length];
    if (!recipient || recipient.userId === requester.userId) continue;

    const existing = await db.alumniConnection.findFirst({
      where: {
        OR: [
          { requesterUserId: requester.userId, recipientUserId: recipient.userId },
          { requesterUserId: recipient.userId, recipientUserId: requester.userId },
        ],
      },
    });
    if (existing) continue;

    await db.alumniConnection.create({
      data: {
        institutionId: instId,
        requesterUserId: requester.userId,
        recipientUserId: recipient.userId,
        status: from.status,
        message:
          from.status === 'PENDING'
            ? pick([
                'Would love to reconnect — I was in your batch.',
                'Interested in your work on distributed systems. Coffee?',
                'Saw you are based in Bengaluru too. Let us connect.',
              ])
            : null,
        respondedAt: from.status === 'PENDING' ? null : daysAgo(intBetween(5, 200)),
        createdAt: daysAgo(intBetween(10, 320)),
      },
    });
    connCount++;
  }
  console.log(`  ✓ ${connCount} connections`);

  // ── Step 17: chapter events + announcements ─────────────────
  console.log('\n🏙️  Step 17: Seeding chapter events & announcements...');
  let chapterEventCount = 0;
  let announceCount = 0;

  for (const [city, cid] of chapterId) {
    const chapter = await db.alumniChapter.findUnique({ where: { id: cid } });
    if (!chapter) continue;

    const chapterMembers = await db.alumniProfile.findMany({
      where: { institutionId: instId, chapterId: cid, engagementStatus: 'ACTIVE' },
      select: { userId: true },
    });
    if (chapterMembers.length === 0) continue;

    // Capacity is scaled to the chapter, not hardcoded.
    //
    // With `capacity: 60` a three-member chapter ran a 60-seat event that four
    // people registered for — a 5% fill rate on every chapter, which made the
    // whole Performance tab read as a disaster and told the office nothing. A
    // chapter event seats roughly its own membership plus guests.
    const seatCount = Math.max(12, Math.round(chapterMembers.length * 1.8));

    const chapterEventSpec = [
      {
        title: `${city} Chapter Quarterly Meetup`,
        description: `Quarterly gathering for ${city} alumni — lightning talks, then dinner.`,
        offset: intBetween(18, 40),
        capacity: seatCount,
        past: false,
      },
      {
        title: `${city} Chapter Alumni Breakfast`,
        description: `Informal breakfast for ${city} alumni and recent graduates.`,
        offset: -(intBetween(40, 120)),
        capacity: Math.max(10, Math.round(seatCount * 0.7)),
        past: true,
      },
    ];

    let nextUpcoming: Date | null = null;
    for (const ce of chapterEventSpec) {
      let ev = await db.event.findFirst({
        where: { institutionId: instId, title: ce.title },
      });
      if (!ev) {
        ev = await db.event.create({
          data: {
            institutionId: instId,
            title: ce.title,
            description: ce.description,
            category: 'ALUMNI',
            chapterId: cid,
            startDate: daysFromNow(ce.offset),
            endDate: daysFromNow(ce.offset + 1),
            capacity: ce.capacity,
            organizerUserId: chapter.presidentAlumniUserId,
            status: ce.past ? 'COMPLETED' : 'PUBLISHED',
          },
        });
        chapterEventCount++;

        const orderWithinDay = new Map<number, number>();
        for (const [day, item] of [
          [1, ce.past ? '10:00 — Welcome & introductions' : '18:30 — Introductions'],
          [1, ce.past ? '10:30 — Chapter update' : '19:00 — Lightning talks'],
          [1, ce.past ? '11:30 — Open floor' : '20:00 — Dinner'],
        ] as [number, string][]) {
          const order = (orderWithinDay.get(day) ?? 0) + 1;
          orderWithinDay.set(day, order);
          await db.eventScheduleItem.create({
            data: { eventId: ev.id, day, order, item, isDone: ce.past },
          });
        }
      }
      if (!ce.past && (!nextUpcoming || ev.startDate < nextUpcoming)) nextUpcoming = ev.startDate;

// Chapter members RSVP to their own chapter's events. Attendance is high
      // (65–90% of members) because that is what a healthy local chapter looks
      // like, and a low rate here would make the participation metric meaningless.
      const target = Math.min(ce.capacity, Math.round(chapterMembers.length * (0.65 + rng() * 0.25)));
      // A plain increment, not a stride: `(k * 5) % len` aliases whenever the
      // stride shares a factor with the length, so a 6-member chapter would pick
      // the same three people repeatedly and quietly RSVP fewer than `target`.
      const offset = ce.title.length % chapterMembers.length;
      for (let k = 0; k < target; k++) {
        const person = chapterMembers[(offset + k) % chapterMembers.length];
        if (!person) continue;
        const has = await db.eventRegistration.findFirst({
          where: { eventId: ev.id, registrantUserId: person.userId },
        });
        if (has) continue;
        await db.eventRegistration.create({
          data: {
            eventId: ev.id,
            registrantUserId: person.userId,
            // Past events keep a few PENDING rows: they are the no-shows, and
            // they are what makes `attendanceRate` (confirmed ÷ registered)
            // anything other than a meaningless 100%.
            status: ce.past ? (k % 7 === 5 ? 'PENDING' : 'CONFIRMED') : k % 4 === 3 ? 'PENDING' : 'CONFIRMED',
            qrPayload: JSON.stringify({ eventId: ev.id, userId: person.userId }),
          },
        });
      }
    }

    // `nextEventAt` is denormalized on the chapter. It is set from a REAL linked
    // event rather than left at a random future date, so the chapter card and
    // the chapter's actual next event can never disagree.
    if (nextUpcoming) {
      await db.alumniChapter.update({
        where: { id: cid },
        data: { nextEventAt: nextUpcoming },
      });
    }

    // Chapter announcement → a Broadcast scoped to the chapter, plus one
    // notification per member. Same machinery as the institution-wide
    // broadcast, so it lands in the member's existing notifications inbox.
    const chapterMemberIds = (
      await db.alumniProfile.findMany({
        where: { chapterId: cid, engagementStatus: 'ACTIVE' },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    const announcements = [
      {
        title: `${city} Chapter — quarterly meetup on the calendar`,
        body: `Our next ${city} meetup is scheduled. RSVP through the Events tab; dinner follows the lightning talks.`,
      },
      {
        title: `${city} Chapter — mentoring slots open`,
        body: 'Two of our members are offering mentoring slots this month. Reply to this message to claim one.',
      },
    ];

    for (const an of announcements) {
      const exists = await db.broadcast.findFirst({
        where: { institutionId: instId, senderUserId: chapter.presidentAlumniUserId, title: an.title },
      });
      if (exists) continue;
      await db.broadcast.create({
        data: {
          institutionId: instId,
          senderUserId: chapter.presidentAlumniUserId,
          audienceJson: JSON.stringify({ audience: 'CHAPTER', chapterId: cid, city }),
          templateKey: 'CHAPTER_ANNOUNCEMENT',
          title: an.title,
          body: an.body,
          channels: 'IN_APP',
          sentAt: daysAgo(intBetween(2, 40)),
        },
      });
      if (chapterMemberIds.length > 0) {
        await db.notification.createMany({
          data: chapterMemberIds.map((rid) => ({
            institutionId: instId,
            recipientUserId: rid,
            type: 'BROADCAST',
            title: an.title,
            body: an.body,
            sourceModule: 'alumni-chapter',
          })),
        });
      }
      announceCount++;
    }
  }
  console.log(`  ✓ ${chapterEventCount} chapter events, ${announceCount} chapter announcements`);

  // ── Step 18: chapter leadership (committee) ──────────────────
  // Officers are ROWS, not columns, so the seed must create the committee AND
  // keep AlumniChapter.presidentAlumniUserId pointing at the current PRESIDENT —
  // that column is a denormalised pointer with exactly two legal writers, and a
  // seed that set officers without setting the pointer would leave every chapter
  // detail reporting a president mismatch.
  console.log('\n🎽 Step 18: Seeding chapter committees...');
  let officerCount = 0;

  for (const [city, cid] of chapterId) {
    const members = await db.alumniProfile.findMany({
      where: { institutionId: instId, chapterId: cid, engagementStatus: 'ACTIVE' },
      select: { id: true, userId: true, graduationYear: true },
    });
    if (members.length === 0) continue;

    // Order by seniority so the most senior member takes the top seat.
    const ordered = [...members].sort(
      (a, b) => (a.graduationYear ?? 9999) - (b.graduationYear ?? 9999),
    );

    // Committee size scales with chapter size, and never exceeds the member
    // count — a committee of five drawn from three members would be fiction.
    const committeeSize = Math.max(1, Math.min(COMMITTEE.length, Math.floor(ordered.length / 3)));

    for (let r = 0; r < committeeSize; r++) {
      const role = COMMITTEE[r];
      const holder = ordered[r];
      if (!holder) continue;

      const exists = await db.alumniChapterOfficer.findFirst({
        where: { chapterId: cid, alumniUserId: holder.userId, role },
      });
      if (exists) continue;

      await db.alumniChapterOfficer.create({
        data: {
          chapterId: cid,
          alumniUserId: holder.userId,
          role,
          since: new Date(`${(holder.graduationYear ?? 2019) + 1}-04-01T00:00:00.000Z`),
          isCurrent: true,
          notes:
            role === 'PRESIDENT'
              ? 'Founding president of the chapter.'
              : role === 'TREASURER'
                ? 'Handles chapter subscriptions and event costs.'
                : null,
          createdByUserId: officer.id,
        },
      });
      officerCount++;

      // Re-point the denormalised president column at the PRESIDENT row.
      if (role === 'PRESIDENT') {
        await db.alumniChapter.update({
          where: { id: cid },
          data: { presidentAlumniUserId: holder.userId },
        });
      }
    }

    // A former president, so the "past officers" view is not empty and the
    // committee has visibly turned over at least once.
    if (ordered.length > committeeSize + 1) {
      const former = ordered[committeeSize + 1];
      if (former) {
        const alreadyPast = await db.alumniChapterOfficer.findFirst({
          where: { chapterId: cid, alumniUserId: former.userId, role: 'PRESIDENT', isCurrent: false },
        });
        if (!alreadyPast) {
          await db.alumniChapterOfficer.create({
            data: {
              chapterId: cid,
              alumniUserId: former.userId,
              role: 'PRESIDENT',
              since: new Date(`${(former.graduationYear ?? 2019) + 1}-04-01T00:00:00.000Z`),
              until: new Date(`${intBetween(2023, 2025)}-09-30T00:00:00.000Z`),
              isCurrent: false,
              notes: 'Preceding president.',
              createdByUserId: officer.id,
            },
          });
          officerCount++;
        }
      }
    }
  }
  console.log(`  ✓ ${officerCount} officer appointments`);

  // ── Step 18b: event memories (photos) + attendee feedback ──
  // Both belong to PAST events only. A photograph of an event that has not
  // happened, or a review from someone who was not there, are the two things
  // these features exist to prevent.
  console.log('\n📸 Step 18b: Reconciling attendance, seeding memories & feedback...');

  // ── Attendance backfill (here, not in step 9) ──────────────
  // Placed AFTER step 17 so chapter events and their registrations already
  // exist. Run any earlier and the chapter rows would sit at checkedInAt = NULL
  // until the next run — which showed up as a second seed run reporting "7 past
  // check-ins reconciled" instead of zero.
  //
  // The event loop in step 9 only stamps check-ins on registrations it CREATES,
  // so a database seeded before attendance existed has none at all. This
  // reconciles those rows: past events, CONFIRMED registrants, ~82% attendance.
  // Deterministic, so re-running is a no-op.
  const pastEvents = await db.event.findMany({
    where: { institutionId: instId, startDate: { lt: new Date() } },
    orderBy: { startDate: 'asc' },
    select: { id: true },
  });
  let backfilled = 0;
  for (const ev of pastEvents) {
    const regs = await db.eventRegistration.findMany({
      where: { eventId: ev.id, status: 'CONFIRMED', checkedInAt: null },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    for (const r of regs) {
      if (stableRoll(r.id) >= 0.82) continue; // the ~18% who did not turn up
      await db.eventRegistration.update({
        where: { id: r.id },
        data: {
          checkedInAt: slotTime(new Date(), 1, '09:15', 0),
          checkInMethod: r.id.charCodeAt(r.id.length - 1) % 3 === 0 ? 'QR' : 'MANUAL',
        },
      });
      backfilled++;
    }
  }
  console.log(`  ✓ ${backfilled} past check-ins reconciled`);

  // ── Migrate legacy schedule titles ──────────────────────────
  // Schedules seeded before the agenda columns existed stored the time INSIDE the
  // title: "09:30 — Registration & cohort meetups". Without this, 60-odd agenda
  // rows across the existing events would keep the time welded to the text where
  // the UI cannot sort or style it, and the Agenda tab would look empty on almost
  // every event. Splitting the legacy format into `startsAt` + a clean title is
  // the migration, and it runs once because it only touches rows with no
  // `startsAt`.
  const legacySlots = await db.eventScheduleItem.findMany({
    where: { startsAt: null },
    include: { event: { select: { startDate: true } } },
    orderBy: { id: 'asc' },
  });
  let migrated = 0;
  for (const slot of legacySlots) {
    const m = /^\s*(\d{1,2}:\d{2})\s*[—–-]\s*(.+)$/.exec(slot.item);
    if (!m) continue;
    await db.eventScheduleItem.update({
      where: { id: slot.id },
      data: {
        startsAt: slotTime(slot.event.startDate, slot.day, m[1]),
        endsAt: slotTime(slot.event.startDate, slot.day, m[1], 60),
        item: m[2].trim(),
      },
    });
    migrated++;
  }
  console.log(`  ✓ ${migrated} legacy agenda slots split into time + title`);

  // ── Backfill the alumni type on events that predate it ──────
  // Chapter events are created in step 17 and were never in `eventSpec`, so they
  // arrive with a null type and vanish from every filter chip. Inferring from the
  // title keeps the directory honest instead of leaving a fifth of events
  // unclassifiable.
  const untyped = await db.event.findMany({
    where: { institutionId: instId, eventType: null },
    select: { id: true, title: true, category: true },
  });
  let typed = 0;
  for (const ev of untyped) {
    const t = /reunion|homecoming/i.test(ev.title)
      ? 'REUNION'
      : /webinar|tech talk|virtual/i.test(ev.title)
        ? 'WEBINAR'
        : /workshop|masterclass|bootcamp/i.test(ev.title)
          ? 'WORKSHOP'
          : /meetup|networking|meet\b/i.test(ev.title)
            ? 'NETWORKING'
            : ev.category === 'ALUMNI'
              ? 'MEETUP'
              : null;
    if (!t) continue;
    await db.event.update({ where: { id: ev.id }, data: { eventType: t } });
    typed++;
  }
  console.log(`  ✓ ${typed} legacy events classified`);

  // ── Mark webinars as online ─────────────────────────────────
  // The Tech Talk was created before `isOnline` existed, so backfilling only the
  // type left it typed WEBINAR with a physical venue and no joining link — the
  // one combination that makes no sense. Venue is cleared for online events so
  // the two can never disagree.
  const onlineFix = await db.event.findMany({
    where: { institutionId: instId, eventType: 'WEBINAR', isOnline: false },
    select: { id: true, meetingUrl: true },
  });
  for (const ev of onlineFix) {
    await db.event.update({
      where: { id: ev.id },
      data: { isOnline: true, venueId: null, meetingUrl: ev.meetingUrl ?? 'https://meet.learnix.dev/alumni-webinar' },
    });
  }
  if (onlineFix.length > 0) console.log(`  ✓ ${onlineFix.length} webinars set to online`);

  const completedEvents = await db.event.findMany({
    where: { institutionId: instId, startDate: { lt: new Date() }, category: 'ALUMNI' },
    orderBy: { startDate: 'desc' },
  });

  let photoCount = 0;
  let feedbackCount = 0;
  const UPLOADS = path.join(process.cwd(), 'uploads');
  mkdirSync(UPLOADS, { recursive: true });

  /**
   * Write a tiny valid PNG to disk and return its storage key.
   *
   * Generated rather than downloaded: a seed that fetches placeholder images
   * over the network is non-deterministic and fails offline, and the point of
   * these rows is to prove the gallery renders a real file through
   * `/uploads/{storageKey}` — not to look pretty.
   */
  function placeholderPng(seedIndex: number, label: string): { key: string; bytes: number } {
    // 1×1 PNG, tinted per index so the grid is not visibly uniform.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const key = `seed-event-${seedIndex}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    writeFileSync(path.join(UPLOADS, key), png);
    return { key, bytes: png.length };
  }

  const COMMENT_TEMPLATES = [
    'Excellent turnout and the mentor matching actually worked.',
    'Great speakers, though the room was far too full.',
    'Really useful session — the Q&A was the best part.',
    'Well organised. Parking was a problem.',
    'Good content, would attend again.',
    'The schedule ran late but the panel was worth it.',
  ];

  for (const [evIdx, ev] of completedEvents.entries()) {
    // Only people who ACTUALLY checked in may leave a review — the same gate the
    // API enforces. Seeding feedback from non-attendees would contradict the one
    // rule this feature is built around.
    // EVERY checked-in attendee, not a slice. An earlier version took the first 8
    // ordered by checkedInAt — but stamping more check-ins changes that ordering,
    // so the "first 8" set shifted between runs and reviews kept appearing. A
    // stable secondary sort on id keeps the selection identical run to run.
    const attendees = await db.eventRegistration.findMany({
      where: { eventId: ev.id, checkedInAt: { not: null }, status: { not: 'CANCELLED' } },
      orderBy: [{ checkedInAt: 'asc' }, { id: 'asc' }],
      select: { id: true, registrantUserId: true },
    });

    for (const [i, att] of attendees.entries()) {
      const exists = await db.eventFeedback.findFirst({
        where: { eventId: ev.id, authorUserId: att.registrantUserId },
      });
      if (exists) continue;
      // Deterministic spread across 3–5 stars. Deterministic for the same reason
      // as every other count in this file: a random rating made the average drift
      // on each run.
      const roll = ((i * 13 + evIdx * 7) % 100) / 100;
      const rating = roll < 0.12 ? 3 : roll < 0.34 ? 4 : 5;
      await db.eventFeedback.create({
        data: {
          eventId: ev.id,
          authorUserId: att.registrantUserId,
          rating,
          comment: COMMENT_TEMPLATES[(i + evIdx) % COMMENT_TEMPLATES.length],
        },
      });
      feedbackCount++;
    }

    if (evIdx >= 3) continue; // only the three most recent past events get photos
    const existingPhotos = await db.eventPhoto.count({ where: { eventId: ev.id } });
    if (existingPhotos > 0) continue;

    const captions = [
      'Cohort photo at the welcome desk',
      'The keynote, mid-talk',
      'Reunion dinner',
      'Mentor and mentee pairs',
    ];
    for (const [pIdx, caption] of captions.entries()) {
      const { key, bytes } = placeholderPng(evIdx, `p${pIdx}`);
      const file = await db.file.create({
        data: {
          institutionId: instId,
          uploaderUserId: officer.id,
          purpose: 'EVENT_PHOTO',
          mimeType: 'image/png',
          sizeBytes: bytes,
          storageKey: key,
          originalName: caption.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png',
        },
      });
      await db.eventPhoto.create({
        data: { eventId: ev.id, fileId: file.id, caption, uploadedByUserId: officer.id },
      });
      photoCount++;
    }
  }
  console.log(`  ✓ ${photoCount} photos, ${feedbackCount} reviews (attendees only)`);

  // ── Step 19: chapter initiatives ────────────────────────────
  console.log('\n🚀 Step 19: Seeding chapter initiatives...');
  let initiativeCount = 0;

  const initiativeTemplates = [
    {
      title: 'Mentor 50 final-year students',
      category: 'MENTORSHIP',
      status: 'ACTIVE',
      targetCount: 50,
      description: 'Match chapter members with final-year students for career guidance over one semester.',
    },
    {
      title: 'Chapter scholarship top-up',
      category: 'SCHOLARSHIP',
      status: 'ACTIVE',
      targetCount: 25,
      description: 'Fund additional merit scholarships from the chapter’s own contributions.',
      campaignLinked: true,
    },
    {
      title: 'Monthly mentoring hour',
      category: 'MENTORSHIP',
      status: 'ACTIVE',
      targetCount: null, // open-ended: no countable goal
      description: 'An informal mentoring hour on the first Saturday of every month.',
    },
    {
      title: 'School outreach programme',
      category: 'OUTREACH',
      status: 'PLANNED',
      targetCount: 12,
      description: 'Visit nearby schools to talk about engineering careers.',
    },
    {
      title: 'Alumni scholarship interviews',
      category: 'SCHOLARSHIP',
      status: 'COMPLETED',
      targetCount: 20,
      description: 'Panel interviews for the merit scholarship shortlist — completed for this cycle.',
    },
  ];

  for (const [city, cid] of chapterId) {
    const members = await db.alumniProfile.findMany({
      where: { institutionId: instId, chapterId: cid, engagementStatus: 'ACTIVE' },
      select: { id: true, userId: true },
      orderBy: { graduationYear: 'asc' },
    });
    if (members.length === 0) continue;

    // A larger chapter runs more initiatives, so the Performance tab has
    // something to compare rather than six identical chapters.
    const count = Math.max(2, Math.min(initiativeTemplates.length, Math.floor(members.length / 3) + 1));

    for (let t = 0; t < count; t++) {
      const tpl = initiativeTemplates[t % initiativeTemplates.length];
      if (!tpl) continue;

      const exists = await db.alumniChapterInitiative.findFirst({
        where: { chapterId: cid, title: tpl.title },
      });
      if (exists) continue;

      const startedAt = daysAgo(intBetween(60, 300));
      const targetDate = new Date(startedAt.getTime() + intBetween(120, 300) * DAY);
      // Progress is derived from the goal rather than random: an ACTIVE
      // initiative should look under way, a COMPLETED one should be done.
      const achieved =
        tpl.status === 'COMPLETED'
          ? (tpl.targetCount ?? 0)
          : tpl.status === 'ACTIVE' && tpl.targetCount
            ? Math.max(1, Math.floor(tpl.targetCount * (0.2 + rng() * 0.6)))
            : tpl.status === 'ACTIVE'
              ? intBetween(1, 12) // running count for an open-ended initiative
              : 0;

      // Link the scholarship initiative to a real campaign so its money progress
      // is read from the campaign rather than duplicated here.
      const campaign =
        tpl.campaignLinked === true
          ? await db.fundraisingCampaign.findFirst({
              where: { institutionId: instId, status: 'ACTIVE' },
              select: { id: true },
              orderBy: { createdAt: 'asc' },
            })
          : null;

      await db.alumniChapterInitiative.create({
        data: {
          chapterId: cid,
          title: tpl.title,
          description: tpl.description,
          category: tpl.category,
          status: tpl.status,
          targetCount: tpl.targetCount,
          achievedCount: achieved,
          startDate: startedAt,
          targetDate: tpl.status === 'COMPLETED' ? daysAgo(intBetween(10, 50)) : targetDate,
          completedAt: tpl.status === 'COMPLETED' ? daysAgo(intBetween(5, 45)) : null,
          campaignId: campaign?.id ?? null,
          // The most senior member owns it — an initiative needs an accountable
          // name, not a committee.
          ownerAlumniUserId: members[t % Math.min(3, members.length)]?.userId ?? null,
          createdByUserId: officer.id,
        },
      });
      initiativeCount++;
    }
  }
  // `initiativeCount` counts only rows created on THIS run, so on a re-run it is
  // legitimately 0 while the rows are all still there. Reporting the verified
  // total instead stops a healthy idempotent re-run from reading as data loss.
  const seededInitiatives = await db.alumniChapterInitiative.count({
    where: { chapter: { institutionId: instId } },
  });
  console.log(
    `  ✓ ${seededInitiatives} initiatives${initiativeCount > 0 ? ` (${initiativeCount} new)` : ' (already present)'}`,
  );

  // ── Summary ────────────────────────────────────────────────
  const [aCount, activeCount, dCount, pledgeOnly, mActive, mPending, evCount, regCount] =
    await Promise.all([
      db.alumniProfile.count({ where: { institutionId: instId } }),
      db.alumniProfile.count({ where: { institutionId: instId, engagementStatus: 'ACTIVE' } }),
      db.donation.count({ where: { institutionId: instId, status: 'RECEIVED' } }),
      db.donation.count({ where: { institutionId: instId, status: 'PLEDGED' } }),
      db.mentorshipPair.count({ where: { status: 'ACTIVE' } }),
      db.mentorshipPair.count({ where: { status: 'PENDING' } }),
      db.event.count({ where: { institutionId: instId, category: 'ALUMNI' } }),
      db.eventRegistration.count(),
    ]);

  const [skillRows, careerRows, privacyRows, connRows, chapterEvents] = await Promise.all([
    db.alumniSkill.count(),
    db.alumniCareerEntry.count(),
    db.alumniPrivacySettings.count(),
    db.alumniConnection.count(),
    db.event.count({ where: { institutionId: instId, chapterId: { not: null } } }),
  ]);

  // Mentorship integrity, checked rather than assumed. The polymorphic mentee
  // means most invariants can no longer be expressed as database constraints, so
  // they are verified here where a failure is visible instead of silent.
  const mPairs = await db.mentorshipPair.findMany({
    select: { id: true, status: true, menteeStudentProfileId: true, menteeAlumniProfileId: true, nextSessionAt: true, sessions: { select: { planned: true, cancelledAt: true } } },
  });
  const mentorshipProblems: string[] = [];
  for (const p of mPairs) {
    // Exactly one mentee side. Both null is an orphan; both set is ambiguous and
    // every screen would have to guess which one to show.
    if (!p.menteeStudentProfileId === !p.menteeAlumniProfileId) mentorshipProblems.push(`pair ${p.id}: mentee side is not exactly one of student/alumni`);
    // A pair with no goals on the profile looked like the feature did not exist.
    if (p.status === 'ACTIVE' && (await db.mentorshipGoal.count({ where: { pairId: p.id } })) === 0) {
      mentorshipProblems.push(`pair ${p.id}: active with no goals`);
    }
    // Sessions on a pair that never started is a contradiction the UI would show.
    if (p.status !== 'ACTIVE' && p.status !== 'COMPLETED' && p.sessions.length > 0) {
      mentorshipProblems.push(`pair ${p.id}: ${p.status} pair has ${p.sessions.length} session(s)`);
    }
    // The denormalised pointer must match a real booking, or the card shows a
    // next-session date that nothing backs up.
    if (p.nextSessionAt) {
      const backed = p.sessions.some((s) => s.planned && !s.cancelledAt);
      if (!backed) mentorshipProblems.push(`pair ${p.id}: nextSessionAt with no upcoming booking`);
    }
  }
  // Feedback is participants-only, so a review by the office or by an outsider is
  // a data error, not just a design mistake.
  const badFeedback = await db.mentorshipFeedback.findMany({
    select: {
      id: true,
      pairId: true,
      authorUserId: true,
      mentorRating: true,
      menteeRating: true,
      pair: {
        select: {
          mentorAlumniUserId: true,
          menteeAlumniProfile: { select: { userId: true } },
          menteeStudentProfile: { select: { user: { select: { id: true } } } },
        },
      },
    },
  });
  for (const f of badFeedback) {
    const participants = [
      f.pair.mentorAlumniUserId,
      f.pair.menteeAlumniProfile?.userId,
      f.pair.menteeStudentProfile?.user.id,
    ].filter(Boolean) as string[];
    if (!participants.includes(f.authorUserId)) mentorshipProblems.push(`feedback ${f.id}: author is not a participant`);
    // One side rates the other, so exactly one column per row.
    if ((f.mentorRating == null) === (f.menteeRating == null)) mentorshipProblems.push(`feedback ${f.id}: must rate exactly one side`);
  }
  const mA2A = mPairs.filter((p) => p.status === 'ACTIVE' && p.menteeAlumniProfileId).length;
  const mA2S = mPairs.filter((p) => p.status === 'ACTIVE' && p.menteeStudentProfileId).length;
  const mRequests = await db.mentorshipRequest.count({ where: { status: 'PENDING' } });
  const mGoals = await db.mentorshipGoal.count();
  const mFeedback = await db.mentorshipFeedback.count();
  const mHistory = await db.mentorshipPair.count({ where: { status: { in: ['DECLINED', 'COMPLETED'] } } });

  const officerRows = await db.alumniChapterOfficer.count({ where: { isCurrent: true } });
  const initiativeRows = await db.alumniChapterInitiative.count();
  // Pointer-vs-table integrity: the denormalised president column must name the
  // same person as the current PRESIDENT officer row in every chapter.
  const pointerMismatches: string[] = [];
  for (const ch of await db.alumniChapter.findMany({ select: { id: true, city: true, presidentAlumniUserId: true } })) {
    const president = await db.alumniChapterOfficer.findFirst({
      where: { chapterId: ch.id, role: 'PRESIDENT', isCurrent: true },
      select: { alumniUserId: true },
    });
    if (!president || president.alumniUserId !== ch.presidentAlumniUserId) {
      pointerMismatches.push(ch.city);
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Alumni Seed Complete');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Alumni           ${aCount} (${activeCount} active)`);
  console.log(`  Chapters         ${chapterId.size} (${chapterEvents} chapter events)`);
  console.log(`  Campaigns        ${campaignIds.size}`);
  console.log(`  Donations        ${dCount} received / ${pledgeOnly} pledged`);
  console.log(`  Mentorship       ${mActive} active (${mA2A} a↔a / ${mA2S} a↔student) · ${mPending} pending · ${mHistory} history`);
  console.log(`  M. requests      ${mRequests} open`);
  console.log(`  M. goals/reviews ${mGoals} goals · ${mFeedback} reviews`);
  console.log(`  Alumni events    ${evCount}`);
  console.log(`  RSVPs            ${regCount}`);
  console.log(`  Skills           ${skillRows}`);
  console.log(`  Career entries   ${careerRows}`);
  console.log(`  Privacy records  ${privacyRows}`);
  console.log(`  Connections      ${connRows}`);
  console.log(`  Officers         ${officerRows} (current)`);
  console.log(`  Initiatives      ${initiativeRows}`);
  console.log(
    `  President pointer${pointerMismatches.length === 0 ? ' OK' : ` MISMATCH: ${pointerMismatches.join(', ')}`}`,
  );
  // ── Step 20: the Relations Office is not a chapter member ──
  // The office runs the alumni network; it does not belong to one of its
  // chapters. The base seed gave `priya@learnix.dev` an AlumniProfile (she is a
  // person with a record), and that profile carried a chapterId, which put a
  // staff member into a member roster and inflated participation metrics by one.
  console.log('\n🏢 Step 20: Detaching the office from chapter membership...');
  const officeProfile = await db.alumniProfile.findFirst({ where: { userId: officer.id } });
  let officeDetached = 0;
  if (officeProfile?.chapterId) {
    const formerChapter = officeProfile.chapterId;
    await db.alumniProfile.update({ where: { id: officeProfile.id }, data: { chapterId: null } });
    await recomputeChapterMembers(instId, formerChapter);
    officeDetached = 1;
  }
  // And she must not hold chapter office, or the office could not join but
  // would still show as an officer.
  const officeOfficerRows = await db.alumniChapterOfficer.findMany({
    where: { alumniUserId: officer.id },
    select: { id: true },
  });
  if (officeOfficerRows.length > 0) {
    await db.alumniChapterOfficer.deleteMany({ where: { alumniUserId: officer.id } });
    officeDetached++;
  }
  console.log(`  ✓ office detached (${officeDetached} change${officeDetached === 1 ? '' : 's'})`);

  console.log('\n  Officer login: priya@learnix.dev / ' + PASSWORD + '  (ALUMNI_OFFICE)');
  console.log(`  Alumnus login: ${alumni[0]?.email ?? 'see seed output'} / ${PASSWORD}`);
  console.log('═══════════════════════════════════════════════════');

  // Fail loudly rather than printing a green summary over broken data. Every one
  // of these is a screen that would otherwise render confidently and wrongly.
  if (mentorshipProblems.length > 0) {
    console.error('\n✗ Mentorship data integrity problems:');
    for (const p of mentorshipProblems) console.error(`    - ${p}`);
    throw new Error(`${mentorshipProblems.length} mentorship integrity problem(s) — see above`);
  }
  console.log('  ✓ mentorship integrity: mentee side, goals, sessions, nextSessionAt, feedback authorship all consistent');
}

main()
  .catch((err) => {
    console.error('\n✗ Alumni seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });