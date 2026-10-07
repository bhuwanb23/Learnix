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
Stats + tabs (All/Pending/Approved/Rejected), pass list (resident, reason, out/in times). Actions: **Approve / Reject** with notify.

**Entity `gate_pass`**: id, residentId, reason, outTime, inTime, status (Pending/Approved/Rejected).

### 3.6 Complaints (module)
Stats + tabs (Open/Resolved) + category chips (Plumbing/Electrical/Network/Maintenance), severity badges. Actions: **Assign** (staff), **Resolve**, **New Complaint** (create on behalf).

**Entity `complaint`**: id, residentId, category, description, severity, status (Open/Assigned/Resolved), assignedTo.

### 3.7 Visitors (module)
**Check-in form** (name/resident/room/relation), active visitors with **Check Out**, today's log.

**Entity `visitor`**: id, name, residentId, roomId, relation, checkIn, checkOut, status (In/Out).

### 3.8 Notifications (module)
Inbox (mess/maintenance/pass/complaint types) + **Broadcast tab** (audience: All Residents / Block A/B/C / Mess Members → pushes to student app).

### 3.9 Profile
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
GET  /gate-passes                           (+ POST /gate-passes/:id/decide)
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
| `scripts/check-hostel-rooms-ui.ts` | no | Parse, import graph, `hostelApi` surface, no positional colours, no client filtering, backend contract |
| `scripts/check-hostel-residents-ui.ts` | no | As above for the resident screens |
| `scripts/verify-hostel/rooms.ts` | **yes** | Routes, zod validation, status codes, role gate, maintenance lifecycle over HTTP |
| `scripts/verify-hostel/residents.ts` | **yes** | As above for residents, plus contact CRUD and primary demotion |
| `scripts/repair-hostel-inventory.ts` | no | One-off data repair; idempotent |

The DB suites build their own `hrchk-` fixtures and delete them, so they do not depend on seed
data — a suite that only passes against one particular seed answers "is my database the right
shape", not "is this feature correct".

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