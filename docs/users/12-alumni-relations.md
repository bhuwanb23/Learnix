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
```
GET  /api/alumni/dashboard
GET  /api/alumni/directory               (?batch=&q=, + /{id})
POST /api/alumni/{id}/invite|add-mentor
GET  /api/alumni/events                  (+ /{id})
POST /api/alumni/rsvps/{id}/confirm|decline
GET  /api/alumni/donations               (campaigns + donations)
POST /api/alumni/donations/{id}/record   → creates Accounts receipt
POST /api/alumni/campaigns/{id}/share
GET  /api/alumni/mentorship              (POST /{id}/approve|decline, /{id}/remind)
GET  /api/alumni/chapters
GET  /api/alumni/notifications
POST /api/alumni/broadcasts
```

## 5. Cross-App Dependencies
- Writes → **Accounts**: donation receipts.
- Writes → **Student**: event RSVPs/announcements, mentorship pairing, broadcasts.
- Reads ← **Admin**: alumni event config, batch master.
- Reads ← **Placement**: hiring/mentorship opportunities for alumni.

## 6. Wiring Status (backend v1) — ✅ COMPLETE
Implemented in `backend/src/modules/alumni/` (routes + service + zod schemas) and wired
into `learnix/users/alumni/**` via `learnix/services/api.js` (demo login: `priya@learnix.dev`).

Deltas vs the sketch above (final API surface):
- RSVP decide is `POST /api/v1/alumni/rsvps/{id}/decide` body `{ decision: CONFIRMED | DECLINED }`
- Mentorship actions: `POST /api/v1/alumni/mentorship/{id}/approve|decline|remind`
- Invite / add-mentor: `POST /api/v1/alumni/directory/{id}/invite` and `.../add-mentor`
- Notifications: `GET /api/v1/alumni/notifications` + `POST .../notifications/read-all`
- Broadcast: `POST /api/v1/alumni/broadcasts` `{ audience, templateKey, title, body }`
  (audience: ALL_ALUMNI | BATCH_2024 | CITY_BENGALURU | MENTORS) → notifications + audit

Verified live: dashboard engagement %, directory search/batch filter, events + RSVP decide,
donation record → payment PAY-2026-0004 + receipt (409 on re-record), mentorship
approve/decline/remind, chapters, read-all, broadcast fan-out. Campaign share is a client
side action in v1 (no endpoint needed). All actions write audit_logs; state changes notify
the affected user.