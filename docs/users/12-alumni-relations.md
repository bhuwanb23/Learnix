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
Directory of alumni events with three scopes — Upcoming / Past / **My events** —
crossed with five event types. Per-event detail adds agenda, attendees, reviews
and photo memories.

**Types** — `eventType`: `REUNION | NETWORKING | WORKSHOP | WEBINAR | MEETUP`.
Kept **separate from `Event.category`**, which is shared with the student and
sports apps; both render filter chips from `category`, so adding alumni-only
values there would surface them in two other products.

**Online events** — `isOnline` + `meetingUrl`, with `venueId` cleared. A webinar
has no room, and a "Virtual" venue row would be a lie in a bookings table.

**Entity `event`** — shared with students/sports. A chapter event is an `Event`
with `chapterId` set, not a parallel table, so it inherits RSVP, schedule,
attendance and notification handling for free.

**Entity `eventRegistration`** — `status` PENDING | CONFIRMED | DECLINED | **CANCELLED**,
plus `checkedInAt`, `checkInMethod` (MANUAL | QR) and a `qrPayload` code.

**Entity `eventScheduleItem`** — `day`, `order`, `item`, `isDone`, plus optional
`startsAt`, `endsAt`, `speaker`, `location`, `track`. The previous model stored the
time *inside* the title ("09:30 — Registration"), where it could not be sorted,
styled, or reasoned about.

**Entity `eventFeedback`** — `rating` 1–5 + `comment`, `@@unique([eventId, authorUserId])`
so one review per person per event, but **editable**.

**Entity `eventPhoto`** — a real upload into the shared File store (`EVENT_PHOTO`
purpose) with a caption, rather than a pasted URL that can rot.

Detail tabs: **About · Agenda · Attendees · Reviews · Memories**.

#### Attendance is not a registration status

`status` says what someone **promised**; `checkedInAt` says they **showed up**.
These were conflated for a while, and treating `status === 'CONFIRMED'` as
attendance let a chapter report **100% participation for an event nobody
attended** — because CONFIRMED is written when the office approves an RSVP or a
seat auto-confirms.

`checkedInAt` is therefore written by exactly two functions,
`markAttendance()` and `undoAttendance()`, and by nothing else — not by an RSVP
decision, not by auto-confirmation, not by an office approval. Every
participation figure in the app (event turnout, chapter Performance) counts
check-ins and only check-ins.

Three separate rates are reported, because merging them is what caused the bug:

| Metric | Meaning |
|---|---|
| `confirmationRate` | of everyone registered, how many held a seat |
| `attendanceRate` | of those who confirmed, how many actually turned up |
| `participation.rate` (chapter) | of the chapter's members, how many attended anything |

#### ⚠️ YET TO BUILD — camera QR check-in

`POST /alumni/events/:id/checkin` verifies a real `qrPayload` code and is wired
end to end: the code is issued on registration, stored, verified by the server,
and the office can run it from the Attendees tab. **There is no camera scanner.**
The screen currently asks the office to paste or type the code, which is exactly
the work a scanner would do minus the camera — swapping the pasted value for a
scanned one requires no backend change.

`qrPayload` was previously a JSON blob on the registration that **nothing ever
wrote or read**; it is now load-bearing.

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

**The flow:** mentee requests → mentor accepts → pair becomes ACTIVE. A request is
its own table because a pair must not exist until somebody has agreed to it; the
previous implementation could only create a pair from an office-only endpoint that
paired the mentor with "the first active student profile in the institution", which
is why the Requests tab could never be filled by anything a user did.

**Two mentee kinds.** The mentee is polymorphic: a **student**
(`menteeStudentProfileId`) or **another alumnus** (`menteeAlumniProfileId`). Because
both columns are nullable and SQLite treats NULLs as distinct in a unique index, the
"one live pair per mentor/mentee" rule is enforced in the service layer, not by the
database. A screen never branches on which side is set — the response always carries
a `mentee.kind`.

**Screens.** Hub (Active / Requests / History + programme stats) → mentor directory
(browse, or *ranked* matches for your request, each with the reason it was chosen) →
requests inbox (accept, decline-with-a-reason, withdraw) → pair detail (Overview /
Sessions / Goals / Feedback). Student mentees get the same pair detail through
`/student/mentorship`; the alumni router is gated to ALUMNI/ADMIN roles, so without
that surface a student could be assigned a mentor and have no way to see it.

**Why History exists:** the list used to return only ACTIVE and PENDING, so declining
a pair made it vanish with no record and no way to reverse the decision.

**Permissions** are resolved server-side per pair (`viewerContext`) and the UI renders
from that — never by guessing from the data on screen. Feedback is participants-only
and the office is explicitly *not* a participant: it sees the ratings, never the words.

**Entity `mentorship_pair`**
| Field | Type |
|-------|------|
| id | P1 |
| mentorAlumniUserId | FK → users.id |
| menteeStudentProfileId | FK → student_profiles.id, nullable |
| menteeAlumniProfileId | FK → alumni_profiles.id, nullable |
| field | free text (Career Guidance, Higher Studies, …) |
| status | PENDING / ACTIVE / DECLINED / COMPLETED |
| requestedAt, approvedAt, completedAt, declinedReason | date / text |
| nextSessionAt | denormalised pointer, written with every booking |
| matchScore, matchReasons | explainable matching result |
| sourceRequestId | the request this pair came from, if any |

**Entity `mentorship_session`**: pairId, sessionDate, `planned` (true = booked, false
= happened), mode (IN_PERSON | VIDEO | PHONE), durationMinutes, agenda, notes,
outcome, cancelledAt. A held session carries the outcome; a booking carries the agenda.
Only a booking can be cancelled, and cancelling marks it rather than deleting it.

**Entity `mentorship_goal`**: pairId, title, detail, status
(PENDING | IN_PROGRESS | ACHIEVED | DROPPED), `progressPct` 0–100, targetDate.
Flat, not a tree — a milestone is a goal with a target date. Status and percentage are
reconciled in the service (`ACHIEVED` forces 100%; 100% implies achieved) so a bar can
never contradict its chip. Progress for a pair is **derived** from its goals, so there
is no stored percentage to go stale.

**Entity `mentorship_feedback`**: pairId, authorUserId, `mentorRating`, `menteeRating`,
comment — two explicit columns so "their rating of you" and "your rating of them" can
never be shown in the same widget. One review per person per pair, editable.

**Entity `mentorship_request`**: institutionId, menteeUserId + either mentee profile,
mentorAlumniUserId (null = open pool), requestedSkills, message, field, status
(PENDING | ACCEPTED | DECLINED | WITHDRAWN), declineReason, pairId. One open request
per person; a decline requires ≥5 characters of reason, and the mentee is notified.

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

### Events
```
GET  /alumni/events                ?scope=upcoming|past|mine&type=&q=&sort=&page=
                                  → { items[], pagination, facets.types[] }
GET  /alumni/events/my-registrations
GET  /alumni/events/my-attendance            history driven by checkedInAt
GET  /alumni/events/{id}                    + viewerContext
POST /alumni/events/{id}/register           auto-confirm, or PENDING when full
POST /alumni/events/{id}/cancel-registration  promotes the waitlist
POST /alumni/rsvps/{id}/decide              { CONFIRMED | DECLINED } (office)
POST /alumni/events/{id}/attendees          office adds an attendee
POST /alumni/events/{id}/attendees/{regId}/remove   { reason } (office)

POST /alumni/events/{id}/schedule           office adds an agenda slot
POST /alumni/schedule-items/{id}/toggle     { isDone }

POST /alumni/events/{id}/attendance         { registrationIds[], method }
POST /alumni/events/{id}/attendance/undo    { registrationIds[] }
POST /alumni/events/{id}/checkin            { code }   ⚠️ mock, no camera yet

GET  /alumni/events/{id}/feedback
POST /alumni/events/{id}/feedback           { rating 1–5, comment? } — checked-in only
DELETE /alumni/events/{id}/feedback

GET    /alumni/events/{id}/photos
POST   /alumni/events/{id}/photos           multipart "file" + caption (office)
PATCH  /alumni/events/{id}/photos/{photoId} { caption }
DELETE /alumni/events/{id}/photos/{photoId}

POST  /alumni/events               office create      PATCH /alumni/events/{id}
```

`scope=mine` is resolved through the viewer's own registration rows rather than a
status filter, so it can only be answered by the backend.

`viewerContext` is the only authority on permissions — the UI renders Register,
Cancel, Mark attendance and Upload from these flags and never from a client-side
role check. Registering **CONFIRMS IMMEDIATELY** while seats remain and lands in
`PENDING` (the waitlist) once full; cancelling promotes the longest-waiting person
into the freed seat, so a cancellation is never a wasted seat.

`GET /alumni/events` filters on `category: 'ALUMNI'`. Events is one shared table,
and without that filter the alumni directory serves student and sports events.

### Events, donations, mentorship, communications
```
GET  /alumni/events               + /{id}
POST /alumni/rsvps/{id}/decide    { decision: CONFIRMED | DECLINED }
GET  /alumni/donations            ?page=&pageSize=   (paged ledger + totals)
POST /alumni/donations/{id}/record         → Payment + Receipt + DonationPayment
GET  /alumni/mentorship            ?scope=active|pending|history|all
GET  /alumni/mentorship/{id}       (+ viewerContext, session log, goals, feedback)
POST /alumni/mentorship/{id}/complete | /remind
POST /alumni/mentorship/{id}/approve | /decline       (legacy office action route)
POST /alumni/mentorship/pairs      { mentorUserId, alumniProfileId|studentProfileId, field }
GET  /alumni/mentorship/mentors    ?skill=           (directory; ?requestId= → ranked)
GET  /alumni/mentorship/requests   ?status=          POST { requestedSkills, message, field, mentorUserId? }
GET  /alumni/mentorship/requests/{id}/matches
POST /alumni/mentorship/requests/{id}/decide   { action: accept|decline, reason? }
DELETE /alumni/mentorship/requests/{id}
POST /alumni/mentorship/{id}/sessions  { planned?, sessionDate, mode, durationMinutes?, agenda?, outcome? }
PATCH|DELETE /alumni/mentorship/sessions/{id}   PATCH .../{id}/cancel { reason? }
POST /alumni/mentorship/{id}/goals    PATCH|DELETE /alumni/mentorship/goals/{id}
GET  /alumni/mentorship/{id}/progress
GET|POST|DELETE /alumni/mentorship/{id}/feedback

GET  /student/mentorship            same shapes, STUDENT role only (the alumni
                                    router rejects STUDENT, so this is the only
                                    surface a student mentee can reach)
POST /student/mentorship/requests   GET .../mentors, .../requests, .../{id}, goals, sessions, feedback
```

`/{id}/progress` is participants + office only. It used to take a bare pairId with no
authorisation at all, so any authenticated caller could read another mentorship's goal
counts; the check is `assertPairReadable` in `mentorship.service.ts`.
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
| `Event` | shared with students/sports. + `eventType` (alumni-only taxonomy), `isOnline`, `meetingUrl`, `chapterId`. ⚠️ reads as `alumni_event` in older docs |
| `EventRegistration` | `@@unique([eventId, registrantUserId])`. `status` is intent; **`checkedInAt` is attendance** — never derived from `status` |
| `EventScheduleItem` | `@@unique([eventId, day, order])` + optional `startsAt`/`speaker`/`location`/`track` |
| `EventPhoto` | `@@unique([eventId, fileId])`, `onDelete: Cascade` to both `Event` and `File` |
| `EventFeedback` | `@@unique([eventId, authorUserId])`, editable; only check-ins may create one |
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
- **Attendance is real, and id-stable** — past events carry genuine check-ins at
  roughly 82% of confirmed registrations, so turnout varies (69–100%) instead of
  the uniform 100% the old `status`-based derivation produced. Each registration's
  attendance is decided from a **hash of its id**, never from its index among
  rows still needing work: re-indexing the leftovers made the second run stamp the
  remaining 18% as well, quietly returning every event to 100%.
- **Migrates legacy data in place** — agenda titles of the form `"09:30 — Welcome"`
  are split into `startsAt` + a clean title, and events that predate `eventType`
  are classified from their title. Without this, ~60 agenda rows and 16 events
  would have looked empty on the new screens while the seed reported success.

⚠️ **Money ceiling**: every `*Minor` column is an `Int` (32-bit), so a single
amount cannot exceed 2,147,483,647 paise ≈ **₹2.14 crore**. `raisedMinor`
accumulates, so a campaign whose lifetime giving crosses that ceiling will fail
to record the donation that crosses it. Campaign targets are sized with headroom.

## 7. Wiring Status

Backend (`directory.service.ts`, `connections.service.ts`, `chapters.service.ts`,
`membership.service.ts`, `leadership.service.ts`, `events.service.ts`,
`registration.service.ts`, `feedback.service.ts`, `memories.service.ts`,
`alumni.service.ts`) + frontend (`learnix/users/alumni/**`) are wired and verified.
`npx tsx scripts/verify-alumni.ts` runs **187 assertions** against a live server.

Four properties the suite is built around, because each was a real bug first:

- **Assert permissions as somebody who lacks them.** Chapter role gates are
  exercised by a graduate who holds no office, resolved through prisma because the
  directory projection exposes neither `userId` nor `chapterId`. Picking "any
  graduate" once selected an officer, who legitimately *may* create an initiative,
  so the assertion passed for the wrong reason.
- **Switch identity between assertions.** Several checks compare the office
  against a graduate on the same endpoint; leaving the previous token in place
  re-asserts a permission instead of testing the refusal, and the test still goes
  green.
- **Assert aggregates, not absolutes.** "Attendance is not derived from CONFIRMED"
  is checked as *checked-in is strictly fewer than confirmed somewhere*, because a
  three-person event where all three turned up genuinely is 100% — demanding
  "below 100%" on any single event fails on correct data.
- **Restore every fixture.** The suite creates events, agenda slots,
  registrations, reviews and check-ins, and removes them all; the `PLEDGE`
  donation is returned to `PLEDGED` and its payment rows are deleted. Two
  consecutive runs both report `187 passed, 0 failed`.

`npx expo export --platform web` builds clean.