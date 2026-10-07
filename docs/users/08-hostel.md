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
Stats + Block tabs (A/B/C) with occupancy progress, room grid with bed-state dots (Full/Partial/Vacant). **Room detail**: residents with bed numbers; actions: **Allocate** (form: name/roll/branch/year), **Transfer** (room-to-room), **Vacate** (frees bed).

**Entity `room`**
| Field | Type |
|-------|------|
| id, block, floor, number | string |
| capacity, occupied | number |
| beds | [{ bedNo, status: Vacant/Allocated }] |

**Entity `allocation`**: id, studentId, roomId, bedNo, fromDate, status (Active/Transferred/Vacated).

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
GET  /rooms                                 blocks, occupancy
GET  /rooms/:roomNumber                     room detail
POST /allocations                           { rollNo, roomNumber }
POST /beds/:bedId/transfer                  { toRoomNumber }
POST /beds/:bedId/vacate

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

## 5. Cross-App Dependencies
- Writes → **Student**: allocation status, gate pass approvals, complaints status, mess surveys, broadcasts.
- Writes → **Accounts**: rent collections.
- Reads ← **Admin**: student master, hostel fee structure.