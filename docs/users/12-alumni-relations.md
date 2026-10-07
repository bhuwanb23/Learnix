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

A **personal** overview — the graduate's own batch, career, events, mentorships, giving and
network. Seven sections, one request.

This section previously described an **office** engagement report: a hero reading "FY
engagement, 12,450 alumni", institution-wide stat tiles, office alerts about mentorship
requests awaiting a decision, and a quick-tool launcher. Every figure was an
`institutionId` aggregate.

That view was deleted rather than kept on a second screen, and the reason is worth
recording: a dashboard is the first thing a graduate opens, and they open it to find out
about *themselves*. Answering that with the school's donation total is not a smaller
version of the right answer — it is a different and misleading one. "₹2.07 Cr received"
sitting above a heading that says "My giving" reads as the reader's own figure, and
nothing on the screen distinguishes the two.

| Section | Contents | Source |
|--------|----------|--------|
| **Alumni Snapshot** | Batch, department, location, organisation, plus what is still missing | `AlumniProfile` |
| **Career Overview** | Current role, employer, industry, derived years of experience | `AlumniCareerEntry` |
| **Upcoming Events** | Next 3 alumni events; per-row "registered" for the caller; seats left; RSVP bar | `Event`, `EventRegistration` |
| **Mentorship Activity** | Active/pending pairs **the caller is in**, split as mentor vs mentee, next session | `MentorshipPair` |
| **Donation Summary** | The caller's own received and pledged totals, kept separate, plus campaigns they supported | `Donation`, `FundraisingCampaign` |
| **Network Highlights** | Recently joined alumni + scored suggestions with their `reasons` | `AlumniProfile`, `AlumniConnection` |
| **Quick Actions** | Join Event · Find Mentor · Connect · Donate | navigation only |

#### Why per-user scoping had to be written, not derived

`GET /alumni/mentorship` returns **every** pair in the institution and
`GET /alumni/donations` returns **every** donation. Neither is scoped to the caller. A
dashboard assembled from them would show a graduate a stranger's charitable giving and a
stranger's mentorship pairing, and it would look entirely normal — which is why the HTTP
suite compares two users' responses against each other and against the database rather
than asserting absolute counts.

The queries in `dashboard.service.ts` therefore target the caller directly:

- **Mentorship** matches all three predicates a pair can satisfy: `mentorAlumniUserId`,
  `menteeAlumniProfile.userId`, and `menteeStudentProfile.userId`. The mentee side is
  polymorphic and was made so after the table already had rows, so a pair created before
  the change has `menteeStudentProfileId` set and `menteeAlumniProfileId` null — filtering
  on the alumni mentee alone hides every pre-existing pair. `listMentorship` documents the
  same trap and corrects it with the same `OR`.
- **Giving** aggregates on `Donation.alumniUserId`. **Received and pledged are never summed
  together**: a card reading "₹5.25 L given" for money the bank has not cleared would be a
  figure the donor cannot reconcile against their own statement.
- **Mentor and mentee counts are separate.** Mentoring somebody is work; being mentored is
  something you receive. One "mentorships: 4" number cannot say which.

#### "Experience" is derived, never stored

Whole years since the earliest career entry, floored on the **month** so somebody who
started this month reads 0 rather than rounding up on the 31st. It is a span, not a sum of
durations — a career with a two-year gap is longer than the time spent working, and
pretending otherwise would be the flattering lie.

#### A missing profile is not an error

`getProfileSelf` throws 404 when a user has no `AlumniProfile`. The dashboard returns empty
sections with `hasProfile: false` instead, because the screen people open first should not
fail wholesale over one incomplete record — and because the Alumni Relations Office
account, which the app signs in as, genuinely has no batch and no employer.

#### Empty states name the absence

Absent fields render as **"Not added yet"** (`dashboardMeta.MISSING`), never as `None` or
`0`. A graduate with an unfilled batch and a graduate with an empty batch are different
people, and the snapshot's `missing[]` array is the one place that distinction is visible.
This matters in the demo precisely because the office profile is sparse: the honest
rendering says "here is something you could add", while `0` would be a claim about a career
or an employer that does not exist.

#### `GET /alumni/dashboard`

Returns `{ snapshot, career, events, mentorship, giving, network, unreadNotifications }`.
The retired `engagement` and `stats` blocks are gone rather than left alongside, so there
is one contract on the path; `check-alumni-dashboard.ts` asserts their absence.

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

### 3.4 Donations (module)

Five tabs, because they answer five different questions: **Campaigns** (what is being
raised for), **My giving** (what have I done, and where are my receipts), **History**
(what has everyone done, filterable), **Standing** (recurring commitments), and
**Impact** (what did it achieve).

**The give path did not exist before.** Donations were created only by seeds: there
was no `POST /donations`, so an alumnus had no way to give at all. The only write was
the office pressing *Record* on a row that already existed.

**Pledge → confirm → receipt.** The alumnus states the amount, the method and an
optional dedication. The office confirms the money landed, and only then is a Payment +
Receipt minted. Keeping confirmation with the office is deliberate: a receipt is a tax
document, and issuing one from a donor's own claim is how a college ends up promising
80G deductions on money it never received.

**Anonymity is asymmetric and decided server-side.** An anonymous gift keeps its
donor's name in the database, because 80G receipts and bank reconciliation need it.
Every non-office caller receives `"Anonymous"` in place of the name — in the ledger,
in campaign gift lists, and in search. If the masking lived in the client the name
would still be on the wire.

**Campaign detail** carries what a donor needs to decide: the beneficiary sentence,
progress with donor count, pledges still outstanding against confirmed gifts, recent
gifts (anonymity honoured), and the viewer's own contribution — `null`, not `0`, for
someone who has not given.

**Progress is not clamped.** A campaign that raised 128% of target is a real outcome;
the *bar* renders at 100% while the *number* stays true. `remainingRupees` is never
negative once the target is met — a negative "still needed" reads as a debt the college
owes the donor. `raisedMinor` is denormalised and read (not re-summed) so the
chapter-initiative performance view cannot disagree with it.

**Recurring contributions are a record of intent, not a subscription.** There is no
scheduler in this app, so a mandate holds a `nextDueAt` and the office presses
*Charge due instalments*; every due `ACTIVE` mandate becomes a PLEDGED donation, which
the same confirmation path turns into a receipt. A background timer was rejected
because it dies with the process — a mandate would silently stop being charged after
every deploy. The action is idempotent per due date (a mandate whose `lastChargedAt` is
already at or past its `nextDueAt` is skipped), isolates failures per mandate so one
closed campaign cannot abort a run, and reports *which* mandates were skipped and why.
Overdue mandates are surfaced loudly, because the failure mode of this design is
somebody forgetting to press the button.

**Digital receipts are rendered, not stored.** Assembled live from
Donation → DonationPayment → Payment → Receipt, so a receipt cannot go stale when a
payment is reversed; a reversed or voided receipt is shown **marked void** rather than
hidden, because a donor holding an old copy needs to see why it stopped being valid.
Readable by the donor and the office only — a receipt carries a name and an amount, and
widening access would undo the anonymity the ledger provides. `receipts/verify` is
public and deliberately narrow: it confirms a number is real and reports amount,
date and validity, never a donor name.

**Money.** All amounts are paise (`amountMinor`). A fractional rupee amount is rejected
outright rather than rounded, because a receipt and a bank statement disagreeing by a
rupee is exactly the bug nobody reports. `toMinor` also refuses amounts past the SQLite
`Int` ceiling (~₹2.14 Cr) with a message instead of failing at the INSERT; widening to
BigInt is the real fix but breaks the arithmetic in every service that touches money,
so it remains its own task.

**Entities**

`fundraising_campaign`: id, name, description, `category`, `beneficiary`, `imageUrl`,
targetMinor, `raisedMinor` (denorm), deadline, status (ACTIVE | COMPLETED).

`donation`: id, campaignId?, donorUserId, fund (GENERAL | LIBRARY | SCHOLARSHIP |
INFRASTRUCTURE), amountMinor, status (PLEDGED | RECEIVED), receivedAt, paymentId,
`recurringId?`, `method?`, `note?`, `isAnonymous`.

`recurring_contribution`: id, donorUserId, campaignId?, fund, amountMinor, cadence
(MONTHLY | QUARTERLY | SEMI_ANNUAL | ANNUAL), status (ACTIVE | PAUSED | CANCELLED |
COMPLETED), nextDueAt, lastChargedAt, chargedThrough, note, `isAnonymous` (carried onto
every instalment, so an anonymous standing gift does not become named the first time a
machine charges it).

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

Eight message categories, one inbox, eight switches. Every category is delivered
through a single function (`notifications.delivery.ts`) so a mute cannot be forgotten
at an emitter, and the category vocabulary lives in one place
(`notifications.rules.ts`) rather than being restated per screen.

| Category | Type | Raised by | When |
|----------|------|-----------|------|
| Event reminders | `EVENT_REMINDER` | reminder sweep (office) | 24h and 2h before an event, to confirmed seats |
| Registrations | `EVENT_REG` | registration service | seat confirmed / waitlisted / promoted / added by the office |
| RSVP decisions | `EVENT` | events service | your answer on an event the office asked about |
| Mentorship | `MENTORSHIP` | mentorship service | a request arrived, a decision was made, a session is due |
| Chapter news | `CHAPTER` | chapters service | an announcement in a chapter you belong to |
| Giving | `DONATION` | giving service | a gift was recorded, receipt issued |
| Institutional | `ANNOUNCEMENT` | admin service | a college announcement was published |
| Office broadcasts | `ALUMNI_BROADCAST` | notifications service | the Alumni Relations Office sent you something |

**Inbox** — filter by category (with live unread counts), unread-only, important-only,
paginated. One row can be marked read *or unread*; previously the only affordance was
mark-all-read, so opening the inbox marked a pending mentorship approval as seen.

**Important broadcasts** — the office can flag a broadcast important. An unread
important row is pinned to the top of page 1. The pin requires `readAt: null`, so it
unpins itself once read; a pin that never unpins is worse than no pin.

**Preferences** — see §3.8. A muted category writes **no row at all**, rather than
writing one and hiding it, so the unread badge only ever counts mail the recipient can
actually see. The trade-off: the office cannot prove afterwards that it sent a
suppressed message. The `Broadcast` row is the record, not the notification.

**Broadcast (office)** — audience is now `{ kind, value? }`: all alumni, one graduation
year, one chapter city, one chapter, or active mentors. The year and city lists come
from `GET /notifications/broadcasts/options` and read the actual data; the previous
contract accepted only the literals `BATCH_2024` and `CITY_BENGALURU`, so a 2019
graduate or a Pune chapter member was unreachable by any broadcast. Every audience
filters `deletedAt: null`. A live preview runs the same resolver as the send, and the
send reports `delivered` and `muted` separately rather than claiming one number.

**Reminder sweep (office)** — there is no scheduler anywhere in this backend, so
reminders are produced by a button. `dryRun` runs the identical computation and writes
nothing. Dedupe is per event per offset, so pressing it repeatedly cannot send twice,
and the report distinguishes *delivered*, *muted* and *already sent*.

Two things deliberately do **not** respect mutes: the mentorship request alert to the
office, and the stale-queue digest. Both are the office's work, not news — muting
"mentorship" must not be a way to lose a request somebody made for help.

**Institutional announcements** — `Announcement` rows had an approval queue and a
PUBLISHED transition that wrote zero `Notification` rows, so publishing reached nobody.
Publishing now fans out. `audienceJson` holds two shapes in practice (a structured
object from the seed, a bare token from the create endpoint); both are resolved, and an
audience that cannot be interpreted delivers to **nobody** and is recorded in the audit
log as skipped. Guessing would be the dangerous direction: a missing notice is
recoverable, an accidental one to six thousand people is not. `publishedAt` is now set
on the approval path, which it never was.

### 3.8 Profile

A **self-service** profile. It was previously a read-only card showing the Director of
Alumni Relations' name and three program counts, with no edit affordance, and four account
menu items wired to `Alert.alert(label, 'Coming in a later phase.')`. The backend already
exposed `GET/PUT /alumni/me` with skills, privacy, company and academic history — and no
screen called it, so the profile was roughly 60% built and 0% wired.

Sections, each independently saved:

| Section | Fields |
|---|---|
| Personal | Display name, headline, bio, location, current role |
| Academic | `graduationYear` only |
| Work | Employer (registered company or free-text), sector |
| Skills | Name + level; the list is **replaced**, not merged |
| Career | A month-precision timeline with one current role |
| Achievements | Self-declared claims, office-verified |
| Links | LinkedIn, GitHub, website |
| Privacy | Seven switches (§3.9) |
| Security | Password change + session list |

#### Two reads, on purpose

`GET /alumni/profile` is **unredacted**. `GET /alumni/me` applies the owner's own privacy
settings. They must not be merged: without the unredacted read you cannot see the email you
chose to hide, which makes "hide my email" indistinguishable from "delete my email". The
edit screen loads the first; directory previews use the second.

#### What is deliberately not editable

- **`batchId`** is registrar-owned. `graduationYear` is editable and the batch is not; when
  they disagree the response flags `yearMismatch` and **the batch's year wins** for
  filtering, so a member cannot make themselves a member of a different graduating class.
- **Full name, email, phone** have no self-service path. Name and email belong to the
  account; phone lives on the staff profile.

#### Achievements are claims, not facts

An alumnus adds a title, kind, issuer, year and URL. The claim is visible to the office as
pending until somebody verifies it; verification stamps `verifiedBy`, `verifiedAt` and can
be withdrawn. Editing the **title** of a verified claim demotes it back to unverified — the
verifier agreed to that specific wording, not to whatever replaces it.

#### Career invariants

Month precision (`YYYY-MM`), never a day. At most one entry has `toMonth === null`; adding
or promoting a role closes the outgoing one **at the new role's start month**, because that
is what a CV shows. Opening or closing a role is one transaction — the demote and the update
cannot half-apply, or the profile is left with zero current roles, which is the one state
the invariant exists to prevent. The office may correct a timeline, and is held to the same
invariant.

#### Links are validated by scheme, not host

Any absolute `http(s)` URL is accepted. A host allowlist would reject a valid personal site;
a "must contain `linkedin.com`" rule would reject the website field. What matters is that
the stored string is safe to render as a pressable link.

#### Removing the summary card

The old `GET /alumni/profile` returned `{ fullName, roles, programStats }` and is deleted.
It had no caller outside its own route, its three counters filtered on `institutionId`
alone — so school-wide totals sat under a key that read as "your activity" — and being a
literal route it **shadowed the profile sub-router mounted below it**, which is why the
self-service endpoint was unreachable over HTTP at all.

#### Account security

These live in `auth`, not `alumni`, and the profile screen is their only caller.

`POST /auth/change-password` **revokes every other session** and keeps the caller's. This
was a real gap, not a missing feature: `resetPassword` beside it in the same file already
revoked all sessions and carried the comment "password change invalidates existing
logins". Change your password because you think a device is compromised, and previously
that device stayed signed in until its refresh token lapsed on its own.

`GET /auth/sessions` lists live refresh tokens; `POST /auth/revoke-all-sessions` ends them
all but the caller's. Sending no token revokes everything including the caller's — a
documented fail-safe, not an oversight.

Two limitations stated rather than hidden:

- The refresh token travels in **`X-Refresh-Token`**, not the query string. It used to be
  `?refreshToken=…`, which writes the one credential that can mint access tokens into
  access logs, browser history and the next `Referer`. The query form is still accepted for
  older installed clients.
- **No device names.** `refresh_token` stores no user agent or IP, so a session can only be
  identified by when it started. The response says so in a `note` field and the screen
  displays it, rather than presenting a start time as if it identified a phone. Adding
  `userAgent` is the real fix and touches every login path.

### 3.9 Notification preferences

Seven switches, one per `notification_category`, all defaulting **on**. A muted category
writes **no row at all** rather than a `muted` row — so "muted" and "never configured"
cannot drift apart, and enabling a category later cannot resurrect a stale preference.

Enforced at **delivery time**, not at emit time: an event emitted while the recipient was
muted is dropped, not queued and delivered when unmuted. Three deliveries deliberately
bypass the mute:

- **office mentorship-arrival alerts** — the office asked to be told
- **chapter announcements** — you are in the chapter, the chapter is speaking to you
- **the stale-queue digest** — an operations signal, not engagement

The four switches this section previously described (event invites, donation appeals,
chapter news, mentorship reminders) were local `useState` seeded from hardcoded defaults: no
row was written, no emitter consulted anything, and the state was lost on reload. They were
removed rather than left in place — a switch that looks authoritative and saves nothing
teaches people that settings here are not real.

## 4. Backend API Surface

All routes are mounted at `/api/v1/alumni` and gated by `requireRole('ALUMNI', 'ALUMNI_OFFICE', 'ADMIN')`.

### Self-service profile

```
GET    /alumni/profile                       unredacted self view
PUT    /alumni/profile                       partial patch; omit a field to leave it
GET    /alumni/profile/career
POST   /alumni/profile/career
PUT    /alumni/profile/career/{id}
PATCH  /alumni/profile/career/{id}/highlight
DELETE /alumni/profile/career/{id}
GET    /alumni/profile/achievements
POST   /alumni/profile/achievements
PUT    /alumni/profile/achievements/{id}
DELETE /alumni/profile/achievements/{id}
GET    /alumni/profile/achievements/queue       office only
POST   /alumni/profile/achievements/{id}/verify office only
```

Skills, links, `graduationYear` and privacy all go through the single `PUT`, as a patch.
**Partial privacy updates are genuinely partial** — the upsert's create branch supplies a
default for every switch, so it is easy to assume those defaults also leak into the update
branch. They do not: `PUT { privacy: { showLinks: false } }` leaves `showEmail`, `showPhone`
and `visibleTo` alone. There is a regression test for exactly this, because getting it
wrong would silently re-publish hidden contact details while the response confirms the
change.

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

### Donation rules that are enforced, not documented

- **Ledger totals are aggregated over every matching row**, never summed from the page
  being returned. Summing the page once reported ₹23.0L while the dashboard reported
  ₹2.07 Cr for the same money — the same app contradicting itself by 11×, hidden for as
  long as the ledger held fewer rows than the old hard-coded `take: 50`.
- **`mine` is a flag, not a `userId`.** The donor is resolved from the session, so
  there is no way to ask for somebody else's giving. The Zod schema has no `userId`
  field at all, and a check asserts a `userId` in the query is dropped rather than
  honoured.
- **A closed campaign refuses a pledge** and says which campaign and why. Accepting a
  pledge against a closed appeal and quietly never recording it is worse than refusing
  it, because the donor believes they gave. "Closed" is *derived* — a campaign past its
  deadline is closed while its stored status still says ACTIVE.
- **A pledge cannot claim a recurring id.** Instalments are generated by charging a
  mandate, so a hand-made row cannot disagree with the mandate about amount or cadence.
- **Only the office can confirm a receipt of money**, and `recordDonation` refuses a
  non-office caller outright. The ledger's `Record` button renders from the server's
  `canRecord`, because the previous screen rendered it for every viewer on every pledged
  row — so a graduate was offered the office's button and tapping it produced a
  permission error instead of a receipt.
- **`404`, not `403`, for "not yours".** A 403 confirms the donation or receipt exists.

### Events, donations, mentorship, communications
```
GET  /alumni/events               + /{id}
POST /alumni/rsvps/{id}/decide    { decision: CONFIRMED | DECLINED }
GET  /alumni/donations            ?page=&pageSize=&campaignId=&fund=&status=&year=&mine=
POST /alumni/donations            { amountRupees, campaignId?, fund?, method?, note?, isAnonymous? }
GET  /alumni/donations/impact               (derived from the caller's own gifts)
GET  /alumni/donations/{id}                 (+ viewerContext: canRecord, canViewReceipt)
POST /alumni/donations/{id}/record          office → Payment + Receipt + DonationPayment
GET  /alumni/donations/{id}/receipt         donor or office only
GET  /alumni/donations/receipts/verify?receiptNo=   public, no donor name
GET  /alumni/donations/campaigns            ?category=&includeClosed=
GET  /alumni/donations/campaigns/{id}       (+ recentGifts, viewerContext.canGive)
POST /alumni/donations/campaigns            PATCH .../campaigns/{id}
GET  /alumni/donations/recurring            ?dueOnly=
POST /alumni/donations/recurring            { amountRupees, cadence, campaignId?, fund?, note? }
POST /alumni/donations/recurring/charge-due office action → PLEDGED instalments
POST /alumni/donations/recurring/{id}/status  { action: pause|resume|cancel, reason? }
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
GET  /alumni/notifications        ?category&unread&important&page&pageSize
GET  /alumni/notifications/categories   POST .../read-all
GET  /alumni/notifications/{id}   PATCH .../{id}/read   { read }
GET/PATCH /alumni/notifications/preferences
GET  /alumni/notifications/broadcasts            (office) send history
GET  /alumni/notifications/broadcasts/options    (office) years + cities
POST /alumni/notifications/broadcasts/preview    (office) { audience }
POST /alumni/notifications/broadcasts            (office) { audience, title, body, isImportant }
POST /alumni/notifications/reminders/sweep       (office) { dryRun }
POST /alumni/directory/{id}/invite | /add-mentor
```

The old `GET /alumni/profile` (office profile card) was removed from this list along with
its route and service function — see §3.8. `/alumni/profile/*` is documented separately
above, because it is the self-service surface and not a card.

## 5. Data Model (Domain J)

| Model | Purpose |
|-------|---------|
| `AlumniProfile` | + `headline`, `bio`; real relations to `batch` and `company` |
| `AlumniSkill` | `(profileId, skill)` unique, `level`, `yearsExperience` — normalised so the directory can filter and the matcher can score in SQL |
| `AlumniCareerEntry` | `title`, `companyId`, `fromMonth`, `toMonth` (null = current). A timeline, not a column |
| `AlumniPrivacySettings` | 1:1 with the profile; the single place redaction is applied. + `showLinks` |
| `AlumniAchievement` | A self-declared claim: `title`, `kind`, `issuer`, `year`, `url`, `isVerified`, and the `verifiedBy`/`verifiedAt` stamp. Office-verified rather than self-certified, which is what makes it worth showing in a directory |
| `NotificationPreference` | 1:1 per `(userId, category)`. **Absence means muted** — a muted category writes no row, so "muted" and "never configured" cannot drift apart |
| `Notification` | + `dedupeKey` (unique, nullable) and `isImportant`. `dedupeKey` is what stops a sweep pressed eleven times writing eleven rows |
| `Broadcast` | + `isImportant`. Important broadcasts use the `ALUMNI_BROADCAST` category; the legacy `BROADCAST` value stays readable |
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