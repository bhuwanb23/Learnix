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
 */
const CITIES = ['Bengaluru', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Delhi NCR'] as const;

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

    const city = pick(CITIES);
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
  for (const city of CITIES) {
    const members = alumni.filter((a) => a.city === city && a.engagement === 'ACTIVE');
    if (members.length === 0) continue;
    // The most senior active alumnus in the city presides. A president drawn at
    // random would be a batch of 2025 graduate chairing the 2015 cohort.
    const president = [...members].sort((a, b) => b.seniority - a.seniority)[0];

    const chapter = await db.alumniChapter.upsert({
      where: { institutionId_city: { institutionId: instId, city } },
      update: { presidentAlumniUserId: president.userId },
      create: {
        institutionId: instId,
        city,
        presidentAlumniUserId: president.userId,
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

  // ── Step 8: mentorship pairs + sessions ────────────────────
  console.log('\n🤝 Step 8: Creating mentorship pairs...');

  const studentProfiles = await db.studentProfile.findMany({
    where: { user: { institutionId: instId, deletedAt: null } },
    select: { id: true, user: { select: { fullName: true } } },
  });
  if (studentProfiles.length === 0) throw new Error('No students — run seed-realistic.ts first');

  // Mentors are drawn from the senior, active cohorts; mentees from students.
  // Pairing a 2025 graduate as "mentor" would make the programme look silly.
  const mentorPool = alumni
    .filter((a) => a.seniority >= 3 && a.engagement === 'ACTIVE')
    .sort((a, b) => b.seniority - a.seniority);
  if (mentorPool.length === 0) throw new Error('No senior alumni available to mentor');

  const pairPlan: { status: string; field: string; sessions: number }[] = [
    { status: 'ACTIVE', field: 'Career Guidance', sessions: 4 },
    { status: 'ACTIVE', field: 'Higher Studies', sessions: 3 },
    { status: 'ACTIVE', field: 'Interview Prep', sessions: 5 },
    { status: 'ACTIVE', field: 'Entrepreneurship', sessions: 2 },
    { status: 'ACTIVE', field: 'Global Careers', sessions: 3 },
    { status: 'ACTIVE', field: 'Finance & Investing', sessions: 1 },
    { status: 'ACTIVE', field: 'Engineering Management', sessions: 2 },
    { status: 'ACTIVE', field: 'Interview Prep', sessions: 1 },
    { status: 'ACTIVE', field: 'Career Guidance', sessions: 6 },
    { status: 'PENDING', field: 'Higher Studies', sessions: 0 },
    { status: 'PENDING', field: 'Career Guidance', sessions: 0 },
    { status: 'PENDING', field: 'Entrepreneurship', sessions: 0 },
    { status: 'PENDING', field: 'Global Careers', sessions: 0 },
    { status: 'PENDING', field: 'Interview Prep', sessions: 0 },
    { status: 'DECLINED', field: 'Finance & Investing', sessions: 0 },
    { status: 'DECLINED', field: 'Global Careers', sessions: 0 },
  ];

  let pairCount = 0;
  let sessionCount = 0;

  for (let i = 0; i < pairPlan.length; i++) {
    const plan = pairPlan[i];
    const mentor = mentorPool[i % mentorPool.length];
    const mentee = studentProfiles[i % studentProfiles.length];

    const existing = await db.mentorshipPair.findFirst({
      where: { mentorAlumniUserId: mentor.userId, menteeStudentProfileId: mentee.id },
    });
    if (existing) continue;

    const requestedAt = daysAgo(intBetween(20, 300));
    const pair = await db.mentorshipPair.create({
      data: {
        mentorAlumniUserId: mentor.userId,
        menteeStudentProfileId: mentee.id,
        field: plan.field,
        status: plan.status,
        requestedAt,
        approvedAt: plan.status === 'ACTIVE' ? daysAgo(intBetween(5, 180)) : null,
      },
    });
    pairCount++;

    // Sessions only exist once a pair is ACTIVE — a PENDING pair with a session
    // log is a contradiction the mentorship screen would render as-is.
    for (let s = 0; s < plan.sessions; s++) {
      await db.mentorshipSession.create({
        data: {
          pairId: pair.id,
          sessionDate: daysAgo((plan.sessions - s) * 21 + intBetween(0, 6)),
          notes: pick([
            'Walked through resume positioning and two mock interviews.',
            'Reviewed portfolio; suggested one systems-design project.',
            'Discussed higher-study options and exam timelines.',
            'Intro call: what the first 90 days in the role look like.',
            'Referral advice and how to approach hiring managers on LinkedIn.',
            'Salary negotiation prep — offer comparison sheet.',
          ]),
          loggedByUserId: mentor.userId,
        },
      });
      sessionCount++;
    }
  }
  console.log(`  ✓ ${pairCount} pairs, ${sessionCount} sessions`);

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
      startOffset: 45,
      durationDays: 2,
      capacity: 300,
      venue: venueMain,
      status: 'PUBLISHED',
      schedule: [
        [1, '09:30 — Registration & cohort meetups'],
        [1, '11:00 — Panel: careers after campus'],
        [1, '14:00 — Reunion lunch by graduating year'],
        [2, '10:00 — Scholarship announcement'],
        [2, '12:00 — Alumni awards & closing'],
      ],
    },
    {
      title: 'Alumni Tech Talk: AI in Production',
      description:
        'A virtual session on taking models from notebook to production, with two alumni speakers and an open Q&A.',
      startOffset: 12,
      durationDays: 1,
      capacity: 200,
      venue: venueSeminar,
      status: 'PUBLISHED',
      schedule: [
        [1, '17:00 — Welcome & speaker intro'],
        [1, '17:15 — Scaling inference on a budget'],
        [1, '18:00 — Open Q&A'],
      ],
    },
    {
      title: 'Bengaluru Chapter Meetup',
      description: 'An evening of food and conversation for alumni based in and around Bengaluru.',
      startOffset: 20,
      durationDays: 1,
      capacity: 80,
      venue: venueSeminar,
      status: 'APPROVED',
      schedule: [
        [1, '18:30 — Introductions'],
        [1, '19:00 — Chapter updates & mentoring sign-up'],
      ],
    },
    {
      title: 'Global Alumni Reunion 2026',
      description:
        'A hybrid reunion for alumni across 14 countries, streamed to every chapter.',
      startOffset: 90,
      durationDays: 1,
      capacity: 500,
      venue: venueMain,
      status: 'APPROVED',
      schedule: [[1, '18:00 — Global chapter roll-call'], [1, '18:45 — Keynote & livestream Q&A']],
    },
    {
      title: 'Alumni Mentorship Kickoff 2025',
      description: 'Launch of the 2025–26 mentorship cohort: 60 pairs, 8 fields.',
      startOffset: -120,
      durationDays: 1,
      capacity: 150,
      venue: venueSeminar,
      status: 'COMPLETED',
      schedule: [
        [1, '10:00 — Programme overview'],
        [1, '11:00 — Mentor/mentee matching'],
      ],
    },
    {
      title: 'Annual Alumni Awards 2025',
      description: 'Distinguished alumni awards across five categories, plus the batch medallion roll.',
      startOffset: -200,
      durationDays: 1,
      capacity: 250,
      venue: venueMain,
      status: 'COMPLETED',
      schedule: [[1, '17:00 — Awards ceremony'], [1, '19:00 — Dinner']],
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
      adopt: true,
      schedule: [
        [1, '09:00 — Registration'],
        [1, '10:00 — Mentor introductions'],
        [1, '12:00 — Networking lunch'],
      ],
    },
    {
      title: 'Alumni Networking Meet',
      description: 'Batch of 2026 meets alumni mentors.',
      adopt: true,
      schedule: [
        [1, '09:00 — Registration'],
        [1, '10:00 — Mentor introductions'],
        [1, '12:00 — Networking lunch'],
      ],
    },
  ];

  /** Schedule for an adopted event that has none of its own. */
  const FALLBACK_SCHEDULE: [number, string][] = [[1, 'Details to be announced']];

  let eventCount = 0;
  let rsvpCount = 0;

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
          startDate: daysFromNow(e.startOffset),
          endDate: daysFromNow(e.startOffset + e.durationDays),
          venueId: e.venue.id,
          capacity: e.capacity,
          organizerUserId: officer.id,
          status: e.status,
        },
      });
      eventCount++;
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
      : ((e.schedule ?? FALLBACK_SCHEDULE) as [number, string][]);

    // `order` is unique per (eventId, day), so it must count within the day
    // rather than across the whole schedule — otherwise day 2 starts at 101
    // and the timeline reads as if it had 100 empty slots.
    const orderWithinDay = new Map<number, number>();
    for (const [day, item] of scheduleRows) {
      const order = (orderWithinDay.get(day) ?? 0) + 1;
      orderWithinDay.set(day, order);
      await db.eventScheduleItem.create({
        data: {
          eventId: event.id,
          day,
          order,
          item,
          isDone: e.status === 'COMPLETED',
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
    const isPast = event.startDate.getTime() < Date.now();
    const eventIndex = eventSpec.indexOf(e);
    const target = Math.min(event.capacity, 18 + ((eventIndex * 11) % 27));
    const pool = [...donors, ...alumni.filter((a) => a.engagement !== 'LOST')];
    for (let i = 0; i < target; i++) {
      const person = pool[(i * 3 + eventIndex) % pool.length];
      const roll = ((i * 7 + eventIndex * 13) % 100) / 100;
      const status = isPast
        ? roll < 0.75 ? 'CONFIRMED' : 'DECLINED'
        : roll < 0.55 ? 'CONFIRMED' : roll < 0.72 ? 'PENDING' : roll < 0.88 ? 'APPROVED' : 'DECLINED';

      const existing = await db.eventRegistration.findFirst({
        where: { eventId: event.id, registrantUserId: person.userId },
      });
      if (existing) continue;

      await db.eventRegistration.create({
        data: {
          eventId: event.id,
          registrantUserId: person.userId,
          status,
          qrPayload: JSON.stringify({ eventId: event.id, userId: person.userId }),
        },
      });
      rsvpCount++;
    }
  }
  console.log(`  ✓ ${eventCount} events, ${rsvpCount} RSVPs`);

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

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Alumni Seed Complete');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Alumni           ${aCount} (${activeCount} active)`);
  console.log(`  Chapters         ${chapterId.size}`);
  console.log(`  Campaigns        ${campaignIds.size}`);
  console.log(`  Donations        ${dCount} received / ${pledgeOnly} pledged`);
  console.log(`  Mentorship       ${mActive} active / ${mPending} pending`);
  console.log(`  Alumni events    ${evCount}`);
  console.log(`  RSVPs            ${regCount}`);
  console.log(`\n  Login: priya@learnix.dev / ${PASSWORD}`);
  console.log('═══════════════════════════════════════════════════');
}

main()
  .catch((err) => {
    console.error('\n✗ Alumni seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });