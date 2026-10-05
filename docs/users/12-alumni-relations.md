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
City chapters (Bengaluru, Mumbai, Hyderabad...) with members, president, next chapter event, **Message president** action.

**Entity `chapter`**: id, city, members, president, nextEvent.

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
GET  /alumni/chapters             ?q=&sort=city|members|activity
                                  → { count, totalMembers, chapters[] }
GET  /alumni/chapters/{id}        overview, president, upcoming/past events,
                                  announcements, stats (avg fill rate)
GET  /alumni/chapters/{id}/members ?q=&sort=name|seniority|recent&limit=
GET  /alumni/chapters/{id}/activity   derived feed (events | announcements | joins)
POST /alumni/chapters/{id}/announce   office or chapter president only
POST /alumni/chapters/{id}/events     office or chapter president only
```

A chapter event is an `Event` with `chapterId` set — not a parallel table — so
it inherits RSVP decisions, schedules, QR payloads and notifications, and appears
in the Events tab with no synchronisation. The activity feed is **derived** from
events, announcements and member joins rather than stored, so it cannot drift
from the rows it summarises.

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
| `AlumniChapter` | + `events` relation |
| `Event` | + `chapterId` (null = not a chapter event) |
| `FundraisingCampaign` / `Donation` | `raisedMinor` denormalised, recomputed from RECEIVED gifts |

Mutual requests auto-accept: if A already asked B and B asks A, they become
`ACCEPTED` rather than deadlocking on two pending rows.

## 6. Seed

`backend/prisma/seed-alumni.ts` — 56 graduates across 16 cohorts, 18 companies,
6 chapters, 5 campaigns, ~215 received donations (each with its Payment +
Receipt write-through), 16 mentorship pairs with sessions, 20 alumni events with
schedules and RSVPs, plus skills, career journeys, privacy settings and 34
connections.

- **Deterministic** — a seeded PRNG and fixed gift tables; no `Math.random()`.
  Re-running converges instead of doubling.
- **Idempotent** — every write is guarded. Verified by running it repeatedly and
  comparing totals.
- **Reconciles** — `sum(donations RECEIVED) = sum(DONATION payments) = sum(receipts)`,
  so the finance report (F-09) stays honest.

⚠️ **Money ceiling**: every `*Minor` column is an `Int` (32-bit), so a single
amount cannot exceed 2,147,483,647 paise ≈ **₹2.14 crore**. `raisedMinor`
accumulates, so a campaign whose lifetime giving crosses that ceiling will fail
to record the donation that crosses it. Campaign targets are sized with headroom.

## 7. Wiring Status

Backend (`directory.service.ts`, `connections.service.ts`, `chapters.service.ts`,
`alumni.service.ts`) + frontend (`learnix/users/alumni/**`) are wired and
verified. `npx tsx scripts/verify-alumni.ts` runs **98 assertions** against a live
server, including the privacy gate as a behaviour (withdraw → `null`, opt in →
visible) and the full connection lifecycle. `npx expo export --platform web`
builds clean.