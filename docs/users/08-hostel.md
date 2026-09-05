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
Search (name/roll/room) + block filters → **resident detail**: profile card, Message/Transfer/Vacate actions, rent payments with **Mark Paid**, complaint history.

**Entity `resident`**: id, studentId, name, rollNo, roomId, block, rentDue, rentStatus, complaints[].

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
```
GET  /api/hostel/dashboard
GET  /api/hostel/rooms                    (blocks, occupancy, room detail)
POST /api/hostel/allocations              { studentId, roomId, bedNo }
POST /api/hostel/allocations/{id}/transfer|vacate
GET  /api/hostel/residents                (+ /{id})
POST /api/hostel/residents/{id}/rent/paid
GET/PUT /api/hostel/mess/menu             (+ attendance, surveys)
GET/POST /api/hostel/gate-passes          (+ /{id}/approve|reject)
GET/POST /api/hostel/complaints           (+ /{id}/assign, /{id}/resolve)
POST /api/hostel/visitors/checkin|checkout
GET  /api/hostel/notifications
POST /api/hostel/broadcasts
```

## 5. Cross-App Dependencies
- Writes → **Student**: allocation status, gate pass approvals, complaints status, mess surveys, broadcasts.
- Writes → **Accounts**: rent collections.
- Reads ← **Admin**: student master, hostel fee structure.