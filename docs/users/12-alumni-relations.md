# 12 — Alumni Relations App (`role: alumni`)

> Entry: `users/alumni/alumni.js` · Pattern: **tab-router** (5 tabs + 3 feature modules)

## 1. Role & Scope
The alumni relations office bridges the college and its graduates: maintains the alumni directory, runs alumni events, drives donations & fundraising, runs the mentorship program, and coordinates city chapters. Connects to Admin events (Alumni Networking Meet), Accounts (donation receipts), Placement (mentorship/hiring), and the student app (broadcasts, event RSVPs).

## 2. App Shell
- **Bottom nav**: Dashboard · Alumni · Events · Donations · Profile.
- **Feature modules**: Mentorship, Chapters, Notifications.
- **Sub-pages**: alumni_detail (profile/contributions), event_detail (schedule/RSVPs).

## 3. Modules & Data Entities

### 3.1 Dashboard
Hero (FY engagement, 12,450 alumni), stats (alumni/events/donations/mentors), upcoming events with RSVP progress (incl. Alumni Networking Meet), office alerts (pending mentorship requests, RSVP shortfall), quick-tool launcher, activity feed.

### 3.2 Alumni (tab)
Directory stats (registered/employed/entrepreneurs/higher ed), search + batch filter chips → **alumni detail**: profile card, employment info, **Message / Invite / Add Mentor** actions, engagement & contributions history.

**Entity `alumni`**
| Field | Type |
|-------|------|
| id, name, batch | string |
| company, role, location | string |
| status | Active / Inactive |
| contributions | [{ type: Donation/Event/Mentoring, label, date }] |

### 3.3 Events (tab)
Upcoming/Completed tabs, RSVP progress bars → **event detail**: date/time/venue hero with filled %, **day-wise schedule timeline**, **RSVP list with live Confirm/Decline**, Announce / Remind actions.

**Entity `alumni_event`**: id, name, date, time, venue, capacity, rsvps, status, schedule[], desc; `rsvp`: alumniId, status (Pending/Confirmed/Declined).

### 3.4 Donations (tab)
FY collections hero (target progress), campaign cards (target/raised/donors/days left) with **Share Campaign**, recent donations with **Record** (Pending → Received → receipt forwarded to Accounts).

**Entity `campaign`**
| Field | Type |
|-------|------|
| id, name | string |
| target, raised | number |
| donors, daysLeft | number |
| status | Active / Completed |

**Entity `donation`**: id, alumniId, amount, fund, date, status (Pledged/Received).

### 3.5 Mentorship (module)
Active Pairs / Requests tabs (with count badge), pair cards (mentor ↔ mentee, field, sessions, next session) with **Send Reminder**, **Approve / Decline** requests (moves pair live), recent sessions log.

**Entity `mentorship_pair`**
| Field | Type |
|-------|------|
| id | P1 |
| mentorId, menteeId | FK (alumni, student) |
| field, sessions, nextSession | string/number |
| status | Active / Pending / Declined |

### 3.6 Chapters (module)
Regional/local chapter directory grouped by **region**, with per-chapter committee
(team), initiatives, events, announcements, participation metrics and an activity feed.

**Entity `chapter`**: id, city, `region`, `tier` (LOCAL | REGIONAL), description,
foundedOn, meetingFrequency, memberCount, president, `officers[]`, `initiatives[]`.

**Entity `chapterOfficer`**: one row per TERM, not per person — `role`
(PRESIDENT | VICE_PRESIDENT | SECRETARY | TREASURER | COORDINATOR), `since`, `until`
(null = current), `isCurrent`. Re-appointing someone creates a new row so committee
history is never overwritten.

**Entity `chapterInitiative`**: a chapter's own project — `title`, `category`
(MENTORSHIP | SCHOLARSHIP | OUTREACH | FUNDRAISING | SOCIAL), `status`
(PLANNED | ACTIVE | COMPLETED | CANCELLED), `targetCount`/`achievedCount`,
`ownerAlumniUserId`, optional `campaignId`. `targetCount = null` means open-ended,
so **no progress bar is rendered** — a 0% bar on an open-ended initiative is a lie.
Money is never stored here: when `campaignId` is set, progress is derived from the
campaign's totals.

Chapter detail tabs: Overview, **Team**, Members, **Initiatives**, Events, Notices,
**Performance**, Activity.

### 3.7 Notifications (module)
Inbox (event/donation/mentorship/chapter/newsletter types, unread dots, **mark all read**) + **Broadcast tab** (audience: All Alumni / Batch 2024 / Bengaluru / Mentors → Event Invite, Newsletter, Reunion, Donation Appeal templates pushed to student app).

### 3.8 Profile
Director of Alumni Relations profile, program stats, preference toggles (event invites, donation appeals, chapter news), account menu.

## 4. Backend API Surface

All routes are mounted at `/api/v1/alumni` and gated by `requireRole('ALUMNI', 'ALUMNI_OFFICE', 'ADMIN')`.

### Office vs graduate
Two distinct actors share this app, separated by the **`ALUMNI_OFFICE`** role:

| Actor | Role | Can do |
|-------|------|--------|
| Alumni Relations Office | `ALUMNI` + `ALUMNI_OFFICE` | Everything a graduate can, plus broadcast, mentorship approve/decline, donation record, chapter announcements/events |
| Graduate | `ALUMNI` | Directory, own profile + privacy, connections, chapters |
| Student / staff | — | `403 AUTH_FORBIDDEN` |

Without `ALUMNI_OFFICE` an office user and a graduate are indistinguishable in the
database (both hold `ALUMNI`, both have an `AlumniProfile`, neither has a
`StaffProfile`), so the role is what makes the privacy, announce and
connect-request rules possible.

### Directory & networking
```
GET  /alumni/directory            ?q=&batch=&departmentId=&companyId=&sector=
                                  &location=&skill=&chapterId=&engagement=
                                  &page=&pageSize=&sort=name|recent|seniority
GET  /alumni/directory/facets     departments, companies, sectors, locations,
                                  batches (unique per year), skills, chapters
                                  — each with a live count
GET  /alumni/directory/{id}       skills, career journey, education, contributions,
                                  connection state — contact gated by privacy
GET  /alumni/me                   PUT /alumni/me   (headline, bio, skills,
                                  career, chapter, privacy settings)
GET  /alumni/matches              ?type=connections|mentors&skill=&limit=
GET  /alumni/connections          ?box=incoming|outgoing|accepted
GET  /alumni/connections/stats
POST /alumni/connections          { profileId, message? }
POST /alumni/connections/{id}/accept | /decline | /cancel
```

**Department filtering needs no column** — it resolves
`AlumniProfile.batchId → Batch.programId → Program.departmentId`.

**Contact details are hidden unless opted in.** `AlumniPrivacySettings` defaults
to `showEmail:false`, `visibleTo:'CONNECTIONS'`. The API returns `null` for a
withheld field (never a missing key) and `contactVisible` + `visibilityReason`
so the UI can explain *why* it is blank. The office always sees everything.

**Match scoring is deterministic, not a model call.** `scoreCandidate()` in
`connections.service.ts` scores shared skills (40), skill depth (15), cohort
(20), city/chapter (20) and employer (5) and returns the *reasons* alongside the
score. A pure function, deliberately: every input is structured, the relations
are exact-membership questions, and the population is small enough to score in
one query — so the office can always answer "why this person?".

### Chapters
```
GET  /alumni/chapters             ?region=&tier=LOCAL|REGIONAL&q=&sort=
                                  → { count, totalMembers, regions[], tiers,
                                      chapters[] }
GET  /alumni/chapters/{id}        overview, president, leadership,
                                  upcoming/past events, announcements, stats,
                                  viewerContext
GET  /alumni/chapters/{id}/members       ?q=&sort=name|seniority|recent&limit=
GET  /alumni/chapters/{id}/activity      derived feed
POST /alumni/chapters/{id}/announce      office or chapter officer
POST /alumni/chapters/{id}/events        office or chapter officer

# Leadership
GET  /alumni/chapters/{id}/officers           ?includePast=
POST /alumni/chapters/{id}/officers           { profileId, role, since? }
POST /alumni/chapters/{id}/officers/{oid}/resign { reason }
GET  /alumni/chapters/{id}/initiatives        ?status=
POST /alumni/chapters/{id}/initiatives        { title, category, targetCount? }
PATCH /alumni/chapters/{id}/initiatives/{iid} { status, achievedCount }
GET  /alumni/chapters/{id}/performance

# Administration (office only)
POST   /alumni/chapters                { city, country, region, tier }
PATCH  /alumni/chapters/{id}           { region, tier, description, meetingFrequency }
POST   /alumni/chapters/{id}/members        { profileId, reason? }   enrol
POST   /alumni/chapters/{id}/remove-member  { profileId, reason }    remove
POST   /alumni/chapters/{id}/join  |  /leave                       self-service
```

A chapter event is an `Event` with `chapterId` set — not a parallel table — so
it inherits RSVP decisions, schedules, QR payloads and notifications, and appears
in the Events tab with no synchronisation. The activity feed is **derived** from
events, announcements, member changes, initiatives and leadership rather than
stored, so it cannot drift from the rows it summarises.

**`viewerContext` is the only authority on permissions.** Every button that acts
(Join, Leave, Appoint, Resign, New initiative, Post announcement) is rendered from
a flag in the chapter detail response — never from a client-side role check.
The rules it encodes:

| Flag | Rule |
|------|------|
| `canJoin` | active graduate, not the office, and not already in a chapter |
| `canLeave` | member, and **holds no current office** — an officer must resign first |
| `canPost` / `canManageInitiatives` | office or any current officer |
| `canManageOfficers` | office only |

One graduate belongs to at most one chapter, so joining a second returns `409`
naming the current one. A **president cannot resign** — the chapter must appoint a
successor instead, so the chapter is never left without one; appointing over an
incumbent retires them in the same transaction. Moving a graduate between chapters
is refused rather than done silently: participation metrics are derived from
membership, so a quiet move would leave the old chapter's numbers stale. The office
removes (reason required) then enrols — two auditable steps.

Performance metrics are **derived at read time**, never denormalised. The headline
is the participation rate — the share of members who actually turned up to
something — because member count and event count are easy to inflate and a chapter
of 40 who never meet is not as healthy as a chapter of 12 who meet monthly.

### Events, donations, mentorship, communications
```
GET  /alumni/events               + /{id}
POST /alumni/rsvps/{id}/decide    { decision: CONFIRMED | DECLINED }
GET  /alumni/donations            ?page=&pageSize=   (paged ledger + totals)
POST /alumni/donations/{id}/record         → Payment + Receipt + DonationPayment
GET  /alumni/mentorship
POST /alumni/mentorship/{id}/approve | /decline | /remind
GET  /alumni/notifications        POST .../read-all
POST /alumni/broadcasts           { audience, templateKey, title, body }
POST /alumni/directory/{id}/invite | /add-mentor
GET  /alumni/profile              (office profile card)
```

## 5. Data Model (Domain J)

| Model | Purpose |
|-------|---------|
| `AlumniProfile` | + `headline`, `bio`; real relations to `batch` and `company` |
| `AlumniSkill` | `(profileId, skill)` unique, `level`, `yearsExperience` — normalised so the directory can filter and the matcher can score in SQL |
| `AlumniCareerEntry` | `title`, `companyId`, `fromMonth`, `toMonth` (null = current). A timeline, not a column |
| `AlumniPrivacySettings` | 1:1 with the profile; the single place redaction is applied |
| `AlumniConnection` | `(requester, recipient)` unique, `status` PENDING/ACCEPTED/DECLINED/CANCELLED |
| `AlumniChapter` | + `events` relation; `region`, `tier`, `description`, `meetingFrequency`. `presidentAlumniUserId` is a **denormalised pointer** to the current PRESIDENT, written only by `assignOfficer()` and the seed |
| `AlumniChapterOfficer` | one row per **term**: `role`, `since`, `until`, `isCurrent`. `@@unique([chapterId, alumniUserId, role])` — re-appointment opens a new term instead of editing history |
| `AlumniChapterInitiative` | `status`, `targetCount`/`achievedCount`, `ownerAlumniUserId`, optional `campaignId`. No money column by design |
| `Event` | + `chapterId` (null = not a chapter event) |
| `FundraisingCampaign` / `Donation` | `raisedMinor` denormalised, recomputed from RECEIVED gifts |

Mutual requests auto-accept: if A already asked B and B asks A, they become
`ACCEPTED` rather than deadlocking on two pending rows.

## 6. Seed

`backend/prisma/seed-alumni.ts` — 56 graduates across 16 cohorts, 18 companies,
6 chapters (5 regional, 1 local, across 5 regions), 13 current chapter officers
plus historical terms, 19 chapter initiatives, 5 campaigns, ~215 received donations
(each with its Payment + Receipt write-through), 16 mentorship pairs with sessions,
20 alumni events with schedules and RSVPs, plus skills, career journeys, privacy
settings and 34 connections.

- **Deterministic** — a seeded PRNG and fixed gift tables; no `Math.random()`.
  Re-running converges instead of doubling.
- **Idempotent** — every write is guarded. Verified by running it repeatedly and
  comparing totals.
- **Reconciles** — `sum(donations RECEIVED) = sum(DONATION payments) = sum(receipts)`,
  so the finance report (F-09) stays honest; and every chapter's
  `presidentAlumniUserId` equals its current PRESIDENT row, asserted at the end of
  the run.
- **Office stays out of chapters** — the `ALUMNI_OFFICE` account is detached from
  chapter membership, because an officer in a member list would corrupt that
  chapter's participation metrics.

⚠️ **Money ceiling**: every `*Minor` column is an `Int` (32-bit), so a single
amount cannot exceed 2,147,483,647 paise ≈ **₹2.14 crore**. `raisedMinor`
accumulates, so a campaign whose lifetime giving crosses that ceiling will fail
to record the donation that crosses it. Campaign targets are sized with headroom.

## 7. Wiring Status

Backend (`directory.service.ts`, `connections.service.ts`, `chapters.service.ts`,
`membership.service.ts`, `leadership.service.ts`, `alumni.service.ts`) + frontend
(`learnix/users/alumni/**`) are wired and verified.
`npx tsx scripts/verify-alumni.ts` runs **161 assertions** against a live server.

Two properties the suite is built around, because both were real bugs first:

- **Assert permissions as somebody who lacks them.** The chapter role gates are
  exercised by a graduate who holds no office — resolved through prisma, since the
  directory projection exposes neither `userId` nor `chapterId`. Picking "any
  graduate" once selected an officer, who legitimately *may* create an initiative,
  and the assertion passed for the wrong reason.
- **Restore every fixture.** The suite mutates a chapter, two officers, two
  graduates' memberships and a pledge, and puts all of them back: the presidency is
  handed over so the sitting president can leave, both graduates are re-enrolled in
  their seeded chapters, and the scratch chapter is deleted. Two consecutive runs
  both report `161 passed, 0 failed`.

`npx expo export --platform web` builds clean.