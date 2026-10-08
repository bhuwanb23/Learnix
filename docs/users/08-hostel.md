# 08 — Hostel App (`role: hostel`)

> Entry: `users/hostel/hostel.js` · Pattern: **tab-router** (5 tabs + 4 feature modules)

## 1. Role & Scope
The hostel office runs residential life end-to-end: room allocation & occupancy, resident management, mess, gate passes, complaints, visitors, and broadcasts to residents.

## 2. App Shell
- **Bottom nav**: Dashboard · Rooms · Residents · Mess · Profile.
- **Feature modules**: GatePasses, Complaints, Visitors, Notifications.

## 3. Modules & Data Entities

### 3.1 Dashboard
Hero (bed occupancy across blocks), stats (occupancy/passes/complaints/mess rating), today's gate passes, open complaints by severity, quick-tool launcher, recent activity.

### 3.2 Rooms & Allocation (tab)

Server-filtered room directory + per-room inventory, allocation, transfer and maintenance.

**Structure.** `Institution → HostelBlock → Room(floor) → Bed`. 3 blocks, 20 rooms, 42 beds in the demo data. Blocks and rooms are **seed-defined**: there is no create/edit/delete for them anywhere in the backend. `Room.capacity` is likewise not editable by any role.

**Directory.** Search over **room number, block name, bed label and occupant name**, plus block / floor / status chips and paging. Filters combine with AND; "Load more" appends. Block chips carry live room counts and are built from the blocks that exist — the old screen hardcoded "Block A/B/C" with no chip for a fourth block, and took each block's colour from its **position in the tab row**, so tapping a different tab changed the colour of the block you were looking at.

A stat row (occupied / vacant / in repair / full rooms) is computed over the **whole institution**, not the filtered set — a row that changed as you typed would make the filters unreadable.

**Room detail**: hero (block, floor, occupancy, rent), **Allocate** by roll number, one row per bed with its real state, **Transfer** and **Vacate** per resident, and the room's own history.

**Entity `room`**
| Field | Type |
|-------|------|
| id, blockId, floor, number | string, int |
| capacity | number |
| occupied, vacant, maintenanceBeds | number (derived) |
| allocatableCapacity | number (derived) |
| status | Vacant \| Partial \| Full \| Maintenance |
| beds | [{ id, bedNo, label, status, maintenanceNote, occupant }] |
| occupantNames | [string] — one-line summary for the directory card |

**Entity `bed`**: id, roomId, bedNo, status (`VACANT` \| `ALLOCATED` \| `MAINTENANCE`), maintenanceNote.

**Entity `allocation`**: id, studentProfileId, bedId, fromDate, toDate, status (`ACTIVE` \| `TRANSFERRED` \| `VACATED`).

#### Occupancy is counted from bed status — never from the counter

`Room.occupiedCount` is a denormalised counter maintained by hand in three write paths. It had already drifted in 2 of 20 rooms, and the UI rendered it verbatim: **"3/2 beds"**, with a two-bed room badged **Full**, while the dashboard — which counts bed statuses — showed the same block half empty.

Occupancy is therefore computed from `Bed.status = 'ALLOCATED'` at every read. The counter is still written, so reporting and exports outside this module keep working, but **nothing in the hostel module decides anything from it**, and it is reported as `storedOccupiedCount` for diagnostics only.

`status` is *physical* occupancy, and `allocatableCapacity` is *allocation headroom*, and they are deliberately separate fields. A room with 2 beds, 1 occupied and 1 withdrawn is physically **Partial**; badging it Full would tell the warden two people sleep there. The screen shows both, and disables **Allocate** with a stated reason when headroom is zero.

#### Maintenance status

`Bed.status = 'MAINTENANCE'` withdraws a bed from allocation without deleting it. It was documented in the schema enum but unreachable: nothing could set it, and the room screen rendered `residents[]` while ignoring the `beds[]` array the endpoint returned — so a withdrawn bed looked exactly like a free one.

- A bed may only **enter** maintenance while `VACANT`, and only with a **reason**. Marking an `ALLOCATED` bed would strand a resident in a bed that reports itself unusable.
- Returning one is always allowed, and **clears the note** — a stale reason on an in-service bed misleads whoever reads it next.
- `MAINTENANCE` is reserved for a room where *every* bed is withdrawn.
- Allocation and transfer skip withdrawn beds implicitly, by requiring `VACANT`.

#### Allocation, transfer and checkout

`allocateBed` takes a **roll number**, because that is what a warden has in front of them. It assigns the lowest-numbered available bed, skips beds under repair, and raises rent for this month and next.

All three lifecycle operations are **transactional**. `vacateBed` was three separate awaits; `transferResident` was six, across three tables. A failure mid-sequence left an allocation `VACATED` with its bed still `ALLOCATED` — a bed that can never be re-allocated, because every allocation path looks for `VACANT`. `allocateBed` additionally re-checks the student's existing allocation **inside** the transaction, so two concurrent requests cannot both pass it.

> **`vacateBed` and `transferResident` accepted an `institutionId` and never used it.** The lookup was `findFirst({ where: { bedId, status: 'ACTIVE' } })`, so a warden at one college who held another college's `bedId` could check out or move that college's resident. `bedId` is not a secret — `GET /rooms/:id` and `GET /residents/:id` both return it. Both now scope through `bed → room → block → institutionId`.

`upcomingRentMonths` used to return month `1` **without advancing the year**, so an allocation made in December produced a due dated thirteen months earlier and then billed January twice.

#### Room history

Who has stayed in this room and when they moved in and out, derived from the same `allocation` rows the resident timeline reads — `transferResident` and `vacateBed` have always written `toDate` and closed the row, so the turnover was already recorded and simply unread. This is the **room's** history, not the resident's: it answers "how often does this room turn over" and "who was in bed 2 before the current tenant", neither of which is answerable from any single resident's timeline.

#### Not implemented: inventory CRUD

There is no create/edit/delete for blocks, rooms or beds. Bed **state transitions** (vacant ⇄ maintenance) are in scope because otherwise the maintenance feature is display-only, but changing the shape of the inventory is a separate administrative capability.

### 3.3 Residents (tab)

Searchable resident directory + a full resident profile.

**Directory.** One search box over **name / roll number / room number / bed number**, plus
server-side block and fee-status filters and paging. Filters combine with AND; "Load more"
appends. Roll number is in the search box because it is the identifier `POST /allocations`
asks the warden to type — it is the one string they are guaranteed to be holding. Block chips
are built from the blocks that currently have residents (with counts) rather than hardcoded to
Block A/B/C.

> Filtering, filtering and paging all happen in SQL. The previous screen fetched every
> resident *and every rent due for every resident*, then filtered and summed in JS. Fine at 32
> residents; a hostel with a few thousand beds is the normal case, not the exception.

**Resident profile**, six sections:

| Section | Contents |
|---|---|
| Resident details | roll no, phone, email, section, semester, current stay |
| Rent payments | outstanding total, per-month dues, **Mark paid** with method |
| Contacts | guardians + emergency contacts, grouped by kind, add/edit/remove, one primary per kind |
| Residence history | every stay as a timeline rail, with room, block and duration |
| Leave & absence | gate-pass records with computed out / overdue / returned state |
| Complaints | complaints raised, read-only here (the workflow lives in § 3.6) |

Actions: **Vacate**. Transfer is on the room (§ 3.2), because a transfer is a property of the
bed rather than of the resident.

**Entity `resident`** (directory row): allocationId, studentProfileId, rollNo, name, email,
phone, section, programId, batchId, currentSemester, room, block, blockId, bedLabel, bedId,
fromDate, outstandingMinor, duesCount.

**Entity `resident_contact`**: id, studentProfileId, kind (Guardian/Emergency), name, relation,
phone, alternatePhone, email, isPrimary.

> **One table for both kinds.** Guardians and emergency contacts are the same shape with
> different intent, they are always read together, and a warden treating them as "people who
> must be reachable about this student" gains nothing from separate tables. `kind` is the
> discriminator.
>
> **At most one primary per student per KIND is enforced in the service, not by an index.**
> SQLite via Prisma cannot express a partial unique index, and the tempting
> `@@unique(studentProfileId, kind, isPrimary)` is wrong in a way that looks right — it would
> also forbid two *non-primary* guardians, which is the normal case. Promoting a contact
> therefore demotes its sibling of the same kind, transactionally. Guardian and emergency
> primaries are independent: making a mother the primary guardian must not un-primary the
> family doctor.
>
> **A contact row has no block in its ancestry.** Every other read in this module reaches the
> institution through `allocation → bed → room → block`; a contact hangs off a bare
> `studentProfileId`, so `hostel-contacts.service.ts` re-checks
> `StudentProfile.institutionId` on every read and every write.

**Entity `residence_stay`** (derived from `allocation`, not a new table): id, room, block,
bedLabel, fromDate, toDate, status (Active/Transferred/Vacated), isCurrent, nights.

> The residential timeline needs no new persistence. `transferResident` and `vacateBed` have
> always written `toDate` and closed the allocation with `TRANSFERRED`/`VACATED`, so every stay
> a student has ever had was already on record — there was simply no reader for it.

### 3.4 Mess Management (tab)
Weekly menu by day (breakfast/lunch/dinner, editable), veg/non-veg meal plans, today's meal attendance bars, resident feedback with ratings + **Send Rating Survey**.

**Entity `mess_menu`**: day, meal, items[]; `meal_attendance`: date, meal, count; `mess_feedback`: residentId, rating, comment.
### 3.5 Gate Passes (module)

A pass is requested by the **student**, from the Student app, and decided by the **warden** here.
The warden's inbox is the whole story on one screen: stats (pending / emergency / overdue / open),
an urgency-ordered list, filters, search and paging.

**A pass is a sequence of events, not a status.** The two that matter operationally are the
*gaps* between them, so each row carries its own derived lifecycle rather than the raw status:

| Lifecycle | Meaning | Urgent? |
|---|---|---|
| `awaiting_approval` | Requested, not yet decided | only if emergency |
| `approved` | Cleared to leave, still in the hostel | no |
| `departure_overdue` | Cleared to leave, departure time passed, **no exit recorded** | yes |
| `out` | Left, due back later | no |
| `return_overdue` | Left, due back, did not come back | yes |
| `returned` | Came back | no |
| `rejected` | Refused | no |
| `cancelled` | Withdrawn by the student before any decision | no |

Ordering is `emergency awaiting approval` -> `return_overdue` -> `departure_overdue` ->
`awaiting_approval` -> everything else, so an emergency never waits behind a queue.

**Actions**: **Approve** / **Reject** (a rejection requires a reason — the student is told it),
**Mark exited** at the gate, **Mark returned**. Each stamps a time and can be corrected by the
warden passing an explicit `at`. A second exit or a second return is refused rather than
silently overwriting the first.

#### Departure is recorded, not assumed

The pass holds four distinct times, and conflating any two of them is the defect this design
exists to prevent:

- `outAt` / `expectedInAt` - **planned**, chosen by the student when requesting
- `actualOutAt` / `actualInAt` - **recorded** by the warden at the gate

Until `actualOutAt` exists the student is *approved but still in the hostel*, which is neither
`out` nor overdue for return. `GET /residents/:id/absence` used to mark any approved,
not-yet-returned pass as out, so a student with tomorrow's approved pass read as absent today.

#### Identity verification is a separate, explicit claim

Approving records **who decided**. It does not record that anyone looked at the student's face.
`verifiedAt` is set only when the warden explicitly ticks the ID box, and the detail screen says
plainly when it is absent - "approved without an ID check" is a real state a warden should be
able to see, not an error. Rejecting never carries a verification.

Emergency is a **priority flag, never an auto-approval**. A genuine 2am emergency is the case
where a phone call to the warden is the right control anyway.

#### Overdue is computed on read

There is no cron, no `setInterval` and no sweep job. `GET /gate-passes/overdue` derives the list
at request time. The list contains **both** overrun kinds - a student who left and stayed out,
and a pass whose departure was never recorded and whose window has since closed. Both need a
warden to act, and the `lifecycle` field tells them apart; merging them would file a missed
departure under a "late return" label and send someone hunting for a movement that never
happened.

#### One open pass at a time

A student may hold one pass that is `PENDING`, or `APPROVED` with no recorded return. A second
request is refused with a **409 naming the pass that blocks it**, so the app can show something
better than a generic failure. `RETURNED`, `REJECTED` and `CANCELLED` never block.

**Entity `gate_pass`**: id, residentId, reason, destination, outTime, expectedInTime,
actualOutTime, actualInTime, status (`PENDING`/`APPROVED`/`REJECTED`/`CANCELLED`), isEmergency,
verifiedAt, decidedAt, decisionNote, decidedByUserId, cancelledAt.

`destination` is separate from `reason` on purpose: "medical" is *why*, "Rajiv Gandhi Hospital,
Chennai" is *where*, and a warden deciding whether to clear a night out needs the where.
`decidedAt` is its own column rather than `updatedAt`, because `updatedAt` moves again on every
later gate stamp and cannot date the decision.

### 3.6 Visitors (module)

Two-sided, like gate passes. A **resident** authorises a visitor from the Student app; the **warden**
confirms them at the desk and records arrival and departure. There is deliberately no
`POST /visitors/checkin` on this router any more — the old one created an on-campus row directly,
with no authorisation and no planned window, which is precisely what the workflow exists to prevent.

The warden's screen is stats (on campus / to confirm / restricted), an urgency-ordered list, filters,
search, paging, and five tools: **Register**, **Restricted**, **Barred**, **Frequent**, **Rules**.

#### The lifecycle is derived, never stored

| Lifecycle | Meaning | Urgent? |
|---|---|---|
| `awaiting_approval` | Resident authorised, warden has not confirmed | yes |
| `approved` | Confirmed, not yet arrived | no |
| `in_campus` | On campus, inside their window | no |
| `visit_overdue` | On campus, past their expected departure | yes |
| `departure_overdue` | Expected to arrive, never did | yes |
| `left` / `no_show` / `rejected` / `cancelled` | Closed | no |

`visit_overdue` and `departure_overdue` are distinct because they need different responses: one is
a conversation with whoever is on campus, the other is a phone call.

**Closed history never sorts above live work**, whatever flags it carries. This was a real bug: a
`hasAlerts ? 0 : …` ranking rule pushed a week of finished visits — each flagged *frequent* — above
the visitor who was actually overstaying. A visit that has ended cannot be acted on.

#### Restricted means three different things, and the UI says which

Alerts are a **list**, never a single flag, because a visitor can trip several at once and a
boolean would hide which:

| Alert | Raised when |
|---|---|
| `BARRED` | The person's phone (or, failing that, name) is on this institution's barred list |
| `OUTSIDE_VISITING_HOURS` | The planned window falls outside the configured hours |
| `FREQUENT_VISITOR` | Visit count in the window reached the configured threshold |

**Phone is the identity.** A name alone collides often enough to bar the wrong person, so matching
prefers an exact phone match and only falls back to a normalised name when no phone was ever
recorded. The barred sheet says so on the entry, and removal is one tap — the cost of a wrong bar is
a person turned away for no reason.

A barred visitor is still **registered**, never silently dropped: the alert exists so a warden sees
it. Entry is where it is refused, with a **409 naming the bar and its reason**.

#### The rules are data

Every rule above is read from `SystemConfig` under `hostel.visitorPolicy` and edited from
**Rules** in the toolbar. Nothing is hardcoded:

| Setting | Effect |
|---|---|
| Warden confirms every visit | Resident authorisation waits for the warden |
| Residents must authorise first | Off = a hostel that simply logs visitors at the gate |
| Day visits only | Departure must fall on the same **local** day as arrival |
| Doors open / close | The visiting-hours window, used by the after-hours alert |
| How far ahead a visit may be booked | 0 = no limit |
| Ask for a purpose / require an ID proof | Become mandatory on the register form |
| Check the barred list | Refuses entry to anybody barred |
| Flag a repeat visitor from N visits, within D days | The frequency alert's threshold |
| Minutes to add to UTC for local time | 330 is India; decides what "8pm" means |

A **missing or malformed** policy is not an incident: the resolver starts from a complete default,
overlays whatever is stored one key at a time, and clamps every value. A hand-edited config
degrades to the defaults rather than taking the module down. A **partial** save overlays onto the
currently stored policy, not onto the defaults — editing the threshold must not silently reset
day-only visits.

**Entity `visitors`**: id, institutionId, name, phone, phoneDigits, idType, idNumber, purpose,
relation, visitingStudentProfileId, expectedInAt, expectedOutAt, checkInAt, checkOutAt, status
(`PENDING`/`APPROVED`/`IN`/`OUT`/`REJECTED`/`CANCELLED`/`NO_SHOW`), requestedByUserId,
approvedByUserId, approvedAt, decisionNote.

**Entity `barred_visitors`**: id, institutionId, name, phone, phoneDigits, normalisedName, reason,
barredByUserId. A bar **outlives the visit** that provoked it — it is a standing fact about the
institution, not a flag on one booking.

### 3.7 Complaints (module)
Stats + tabs (Open/Resolved) + category chips (Plumbing/Electrical/Network/Maintenance), severity badges. Actions: **Assign** (staff), **Resolve**, **New Complaint** (create on behalf).

**Entity `complaint`**: id, residentId, category, description, severity, status (Open/Assigned/Resolved), assignedTo.

### 3.8 Notifications (module)
Inbox (mess/maintenance/pass/complaint types) + **Broadcast tab** (audience: All Residents / Block A/B/C / Mess Members → pushes to student app).

### 3.10 Profile
Chief Warden profile, resident stats, preference toggles (pass/curfew/visitor alerts), account menu.

## 4. Backend API Surface
All routes are mounted at `/api/v1/hostel` and require the `HOSTEL` or `ADMIN` role.

```
GET  /dashboard
GET  /rooms                                 ?q=&block=&floor=&status=&page=&pageSize=
                                          blocks keyed by ID; totals + facets in the response
GET  /rooms/:roomId                         keyed by ID, not room number (see below)
GET  /rooms/:roomId/history                 every stay in this room, current first
POST /allocations                           { rollNo, roomNumber }
POST /beds/:bedId/transfer                  { toRoomNumber }
POST /beds/:bedId/vacate
POST /beds/:bedId/maintenance               { inMaintenance, note? }

GET  /residents                             ?q=&block=&feeStatus=&page=&pageSize=
GET  /residents/facets                      block names + counts
GET  /residents/:id                         full profile: identity, dues, complaints,
                                            contacts, history, absence — one round trip
GET  /residents/:id/history                 every stay, current first
GET  /residents/:id/absence                 gate-pass records with computed state
GET  /residents/:id/contacts
POST /residents/:id/contacts                { kind, name, relation, phone, ... }
PUT  /residents/:id/contacts/:contactId
DELETE /residents/:id/contacts/:contactId
POST /rent/:id/collect                      { method }

GET/PUT /mess/menu                          (+ POST /mess/survey)

GET  /visitors                             ?q=&status=&alerts=&needsAction=&date=&page=&pageSize=
GET  /visitors/policy                      the effective rules, plus the defaults
PUT  /visitors/policy                      partial save, overlaid on what is in force
GET  /visitors/frequent                    ?limit=&withinDays= — by visitor and by resident
GET  /visitors/barred                      the standing deny list
POST /visitors/barred                      { name, phone?, reason } — idempotent per identity
DELETE /visitors/barred/{id}
GET  /visitors/{id}
POST /visitors                             warden-registered walk-in; always lands PENDING
POST /visitors/{id}/approve                { note? }
POST /visitors/{id}/reject                 { note } — required, the resident is told it
POST /visitors/{id}/entry                  { at? } — re-checks the barred list
POST /visitors/{id}/exit                   { at? }

GET  /gate-passes                           ?q=&status=&emergency=&needsAction=&page=&pageSize=
GET  /gate-passes/overdue                    both overrun kinds, computed on read
GET  /gate-passes/:id                        full pass + timeline inputs
POST /gate-passes/:id/decide                 { decision, verified?, note? }
POST /gate-passes/:id/exit                   { at? }
POST /gate-passes/:id/return                 { at? }

GET/POST /complaints                        (+ /:id/assign, /:id/resolve)
GET  /visitors                              (+ POST /visitors/checkin, /visitors/:id/checkout)
GET  /notifications                         (+ POST /notifications/read-all)
POST /broadcasts
GET  /profile
```

### Room detail is keyed by ID, not room number

`Room.number` is unique only **within a block** (`@@unique([blockId, number])`), so two blocks
may both hold "A-101". The route used to be `GET /rooms/:roomNumber` and resolved it with
`findFirst({ where: { number } })`, which would return one of them arbitrarily and show the wrong
room's occupants. The room directory returns every room's id, so keying by id removes the
ambiguity at no cost.

### Room cross-tenant scoping

- Every read is scoped **in the query** via `bed/room → block → institutionId`, never by
  filtering in JS after a fetch.
- `GET /rooms/:roomId` and `/history` return **404** for a room of another institution.
- `POST /beds/:bedId/maintenance` returns **404** for another institution's bed.
- `POST /beds/:bedId/vacate` and `/transfer` return **404** — these were the two holes, since
  their allocation lookup was scoped by `bedId` alone.

### Resident cross-tenant scoping

Every resident read is scoped **in the query**, never by filtering in JS after a fetch:
`bed → room → block → institutionId`. Two institutions both holding residents is asserted in
`check-hostel-residents.ts`, because an untested foreign institution proves nothing — a bug
that dropped the filter entirely would still pass against an empty neighbour.

- `GET /residents`, `/history`, `/contacts`, `/:id` → filtered to the caller's institution.
- `GET /residents/:id` returns **404** for a resident of another institution, and for a student
  who exists but holds no allocation (they are not a resident).
- `/history` and `/absence` return an **empty list** rather than 404: they are collections, and
  a student with no allocations legitimately produces `[]`. The invariant is "nothing leaks",
  not "it throws".
- A `contactId` belonging to a different student returns **404**, not a write that silently
  re-parents that contact onto the resident being edited.

### Gate pass cross-tenant scoping and the two-sided boundary

A pass is created by a **student** on one router and decided by a **warden** on another, each
behind its own role gate. The load-bearing property is that neither can reach the other's side,
and it is asserted from both directions.

- Every pass read and write is scoped **in the query** via `studentProfile → user →
  institutionId`. A pass id from another institution is **404**, not a filtered-out row.
- `UserRole` carries **no `institutionId` of its own** — tenancy lives on the user. Paging the
  wardens to review a new request therefore filters *through the relation*
  (`role: 'HOSTEL', user: { institutionId }`). A role-only lookup pages **every hostel warden in
  the deployment**, which discloses one student's trip and destination to unrelated institutions.
  This was a real defect, and it is invisible to a single-institution HTTP run — the assertion
  lives in `check-hostel-gate-passes.ts`, which creates two institutions.
- There is **no `POST /gate-passes`** on the warden router. Putting creation there would place it
  behind `requireRole('HOSTEL','ADMIN')` — precisely the role that must not be able to mint its
  own approvals. Creation lives only at `POST /student/gate-passes`.

### Gate pass status codes

| Condition | Code | Why this code |
|---|---|---|
| Request's own return is not after its departure | **400** | the request contradicts itself — a form error |
| Departure is in the past | **422** | well formed, but a rule refuses it — send it to the warden |
| Pass would cover more than 30 days | **422** | same |
| Unknown key in the request body | **400** | the schema is `.strict()`; a typo'd `isEmergency` must not be a silent no-op |
| A second request while one is open | **409** | names the pass that blocks it, so the app can show it |
| Deciding an already-decided pass | **409** | a decision is not revisable |
| Second exit / second return | **409** | refuse rather than silently overwrite a gate record |
| Rejecting with no reason | **400** | the student is told this; "contact the office" is not an answer |
| Withdrawing an `APPROVED` pass | **409** | it must be returned at the gate, not cancelled |
| Another student's pass id | **404** | |

**Every mutation returns the full shaped pass**, the same body the reads return. They originally
returned hand-rolled stubs (`{ id, status }`), so a client that trusted the response got no
`lifecycle` and no `decidedAt` and could not render the result of the action it had just
performed without a second round trip. No database-level assertion can see this — it is a
property of the response body, which is why it is asserted over HTTP.

### Not implemented: daily resident roll-call

"Is this student in tonight?" appears here in two different senses, and only one of them is
answered. **Leave / absence** is derived from existing `GatePass` records (`outAt`,
`expectedInAt`, `actualInAt`) and is a read, not a new feature. A **daily attendance
roll-call** — a warden marking a present/absent register per room per night — is deliberately
absent: it is a different record with different consequences (it feeds attendance reporting and
would default to "absent" for anyone not marked), and it is a separate decision rather than
something to smuggle in with a resident-profile change.

## 5. Frontend Structure
```
users/hostel/pages/rooms/
  rooms.js                                   directory: server-driven search, chips, paging
  pages/room_detail/
    room_detail.js                           hero, allocate, transfer/vacate; composes the sections
    roomMeta.js                              formatters, SectionCard, blockColor, status styles
    components/BedsSection.js                one row per bed + withdraw / return to service
    components/RoomHistorySection.js         the room's turnover timeline

users/hostel/pages/residents/
  residents.js                                directory: server-driven search, filters, paging
  pages/resident_detail/
    resident_detail.js                        hero + vacate, composes the six sections
    residentMeta.js                           shared formatters, SectionCard, Empty
    components/ProfileSection.js
    components/RentSection.js
    components/ContactsSection.js
    components/HistorySection.js
    components/AbsenceSection.js
    components/ComplaintsSection.js
```

## 6. Verification

| Suite | Needs a server | Covers |
|---|---|---|
| `scripts/check-hostel-rooms.ts` | no | Occupancy from bed status, the cross-tenant fix, maintenance guards, one-ACTIVE-allocation-per-bed, filters, room history, rent months |
| `scripts/check-hostel-residents.ts` | no | Directory scoping, enriched profile, contact tenant guard, primary demotion, cross-tenant refusal |
| `scripts/check-hostel-gate-passes.ts` | no | The shared lifecycle derivation, urgency ranking, the one-open-pass rule, request/decision/exit/return guards, inbox filters and facets, both overdue kinds, the residency-agreement invariant, and that a request only pages its **own** institution's warden |
| `scripts/check-hostel-rooms-ui.ts` | no | Parse, import graph, `hostelApi` surface, no positional colours, no client filtering, backend contract |
| `scripts/check-hostel-residents-ui.ts` | no | As above for the resident screens |
| `scripts/check-hostel-gate-passes-ui.ts` | no | As above for the gate-pass screens, plus the resident-absence derivation being shared rather than reimplemented, and regression guards on four defects found in review |
| `scripts/verify-hostel/rooms.ts` | **yes** | Routes, zod validation, status codes, role gate, maintenance lifecycle over HTTP |
| `scripts/verify-hostel/residents.ts` | **yes** | As above for residents, plus contact CRUD and primary demotion |
| `scripts/check-hostel-visitors.ts` | no | The shared derivation, urgency ranking, the three alerts, phone-vs-name identity matching, a defensive policy resolver (missing / malformed / wrong-typed / out-of-range), the barred list, the gate refusal, frequent-visitor counting, inbox facets and filters, and that nothing schedules |
| `scripts/check-hostel-visitors-ui.ts` | no | As above for the visitor screens, plus: no mock array survives, the resident is a **picker** and not a typed name, no visiting-hours or threshold constant exists in the client, and `studentApi` has no approve/entry/exit/policy method at all |
| `scripts/verify-hostel/gate-passes.ts` | **yes** | Both sides of the desk over HTTP: the two-sided role boundary, schema rejections, the 400-vs-422 split, decide/exit/return, withdrawal, and that every mutation returns the shaped pass |
| `scripts/verify-hostel/visitors.ts` | **yes** | Both sides of the desk over HTTP: the two-sided boundary, route order for the three static siblings, the 400-vs-422 split, the full lifecycle, `PUT /visitors/policy` persistence and partial-save behaviour, and the gate refusing a barred visitor |
| `scripts/repair-hostel-inventory.ts` | no | One-off data repair; idempotent |

The DB suites build their own `hrchk-` fixtures and delete them, so they do not depend on seed
data — a suite that only passes against one particular seed answers "is my database the right
shape", not "is this feature correct".

`verify-hostel/gate-passes.ts` is the only hostel suite holding three identities, because a pass
is requested by a student and decided by a warden. It drives its own passes to terminal states
and then **deletes them, asserting the deletion** — reaching `RETURNED` is not a restore, since
both terminal states block nothing and every run would otherwise leave two more rows behind.

### A note on the shipped demo data

`repair-hostel-inventory.ts` fixed two faults in the demo data that no migration or schema check
would have caught, because both are *data* faults:

1. `Room.occupiedCount` had drifted in 2 of 20 rooms.
2. **Two beds each held TWO active allocations** — `A-101` bed 2 had both Sneha Patel and Rohan
   Gupta. That is a double-booked mattress, and it was invisible in the UI: the room screen
   rendered one row per bed and silently kept whichever allocation it read last.

The root cause was in the seed's `ensureResident()`, which checked only whether *that student*
already had an allocation and never whether the *bed* was free. It is fixed, and the seed now
recomputes every counter from bed status on each run.

## 5. Cross-App Dependencies
- Writes → **Student**: allocation status, gate pass approvals, complaints status, mess surveys, broadcasts.
- Writes → **Accounts**: rent collections.
- Reads ← **Admin**: student master, hostel fee structure.
