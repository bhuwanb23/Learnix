# 10 — Sports & Cultural App (`role: sports`)

> Entry: `users/sports/sports.js` · Pattern: **tab-router** (5 tabs + 3 feature modules)

## 1. Role & Scope
The sports & cultural department manages all campus activities: events, teams, tournaments, venues, and equipment. It sits between **Admin's Events module** (institution oversight) and the **student events** flow (browse/register).

## 2. App Shell
- **Bottom nav**: Dashboard · Events · Teams · Equipment · Profile.
- **Feature modules**: Tournaments, Venues, Notifications.
- **Sub-pages**: event_detail (schedule/registrations/approvals), team_detail (roster/fixtures).

## 3. Modules & Data Entities

### 3.1 Dashboard
Hero (season calendar progress), stats (events/teams/registrations/equipment out), today's schedule (practice/rehearsal/friendly), pending registration approvals, quick-tool launcher, activity feed.

### 3.2 Events (tab)
Category filters (Sports/Cultural/Technical), event cards with registration-progress bars → **event detail**: hero stats, Announce / Schedule / Volunteers actions, day-wise schedule checklist, **registration approvals with live Approve/Reject** per student.

**Entity `activity_event`**
| Field | Type |
|-------|------|
| id, name, category, date, venue | string |
| registrations, capacity | number |
| schedule | [{ day, item, done }] |
| registrations list | [{ student, status: Approved/Pending/Rejected }] |

### 3.3 Teams (tab)
Stats + team roster (cricket/football/basketball/badminton/athletics/dance) with captain & next match → **team detail**: hero wins/losses, Tryouts / Add Player / Match Alert actions, roster with captain badge, fixtures with Won/Lost/Upcoming results.

**Entity `team`**
| Field | Type |
|-------|------|
| id, name, sport | string |
| wins, losses | number |
| captain, members[] | player { name, role } |
| fixtures | [{ opponent, date, result }] |

### 3.4 Equipment (tab)
Stats (142 items, 47 out, 9 overdue), inventory tab with availability bars + condition chips, **Issued Out tab with Return actions** + overdue flags.

**Entity `equipment_item`**
| Field | Type |
|-------|------|
| id, name, category | string |
| total, available, out | number |
| condition | Good / Needs Repair |
| issue | { studentId, issuedAt, dueAt } |

### 3.5 Tournaments (module)
Fixtures tab (upcoming/today/completed with results) + **Standings tab** (points table with qualification info card), **Schedule Fixture** action.

**Entity `fixture`**: id, tournamentId, teamA, teamB, date, result, status; `standing`: team, played, won, points.

### 3.6 Venues (module)
Stats, **booking requests with Approve/Reject** (Tech Fest, Cultural Night), today's availability list (Booked/Available chips) + Book action.

**Entity `venue_booking`**: id, venue, requester, date, time, status (Pending/Approved/Rejected).

### 3.7 Notifications (module)
Inbox (team/event/equipment/venue/tryout types) + **Broadcast tab** (audience: All Students / Football Team / Cricket Team / Dance Crew / Volunteers → tryouts, match alerts, event announcements pushed to student app).

### 3.8 Profile
Director of Sports & Cultural Affairs, event stats, preference toggles (event/tryout/equipment alerts), account menu.

## 4. Backend API Surface
```
GET  /api/sports/dashboard
GET  /api/sports/events                  (+ /{id}, registrations)
POST /api/sports/registrations/{id}/approve|reject
GET  /api/sports/teams                   (+ /{id}, roster, fixtures)
POST /api/sports/teams/{id}/tryouts|add-player|match-alert
GET  /api/sports/tournaments             (fixtures, standings)
POST /api/sports/fixtures                (schedule)
GET  /api/sports/venues                  (POST /{id}/approve|reject, book)
GET  /api/sports/equipment               (POST /{id}/return)
GET  /api/sports/notifications
POST /api/sports/broadcasts
```

## 5. Cross-App Dependencies
- Writes → **Student**: event visibility/registration, team tryouts, match alerts, broadcasts.
- Writes → **Admin**: event approval requests (institution Events module).
- Reads ← **Admin**: event configuration, venue master.

## 6. Wiring Status — LIVE (backend + app wired end to end)

**Backend:** `backend/src/modules/sports/` (routes · service · zod schemas), mounted at `/api/v1/sports`, role-gated `SPORTS | ADMIN`. Demo login: `sports@learnix.dev` / `Passw0rd!`.

| Endpoint | Notes |
|---|---|
| `GET /dashboard` | real stats (upcoming events, teams, pending regs, equipment out/overdue), today+upcoming schedule (events + fixtures), pending-approval preview, recent alerts |
| `GET /events` · `GET /events/:id` | non-ALUMNI events; detail = schedule checklist + volunteers + registration list |
| `POST /registrations/:id/decide` | `APPROVED\|REJECTED` on PENDING only (409 re-decide guard); notifies student, audited |
| `POST /events/:id/schedule` · `POST /schedule-items/:id/toggle` | add day items, tap-to-toggle checklist |
| `POST /events/:id/volunteers` | by roll no, notifies student (409 on dup) |
| `POST /events/:id/announce` | fan-out notification to all students |
| `GET /teams` · `GET /teams/:id` | roster + captain (resolved from scalar id) + fixtures + standings record |
| `POST /teams/:id/players` | by roll no, CAPTAIN role updates team captain (409 on dup) |
| `GET /tournaments` | fixtures with parsed results + standings (points-desc) |
| `POST /fixtures` | schedule fixture — validates teams belong to the tournament (422 otherwise) |
| `POST /fixtures/:id/result` | `{winner: A\|B\|DRAW, scoreA, scoreB}` — **auto-updates standings** (win 3 / draw 1), 409 on re-record |
| `GET /equipment` · `POST /equipment` · `POST /equipment/issue` · `POST /equipment-issues/:id/return` | availability denorm synced on issue/return, 422 when 0 units, OVERDUE surfaced |
| `GET /venues` · `POST /venue-bookings/:id/decide` · `POST /venue-bookings` | approve flips venue → BOOKED, same-slot clash check (409), MAINTENANCE venues blocked |
| `GET /notifications` · `POST /notifications/read-all` · `POST /broadcasts` | audience fan-out: `ALL_STUDENTS` / `ALL_TEAMS` (distinct team members) / `VOLUNTEERS` |
| `GET /profile` | identity + live dept stats |

**App:** all 12 screens wired via `sportsApi` (`services/api.js`), demo identity `setDemoUser('sports@learnix.dev')` in `sports.js`. Every static array removed; loading/error/retry states everywhere.

**Deltas from the §4 sketch:** decide is a single `decide` endpoint with a decision body (not separate approve/reject paths); results are recorded per fixture with winner+scores instead of manual standings edits — standings auto-derive; tryouts/match-alert are covered by broadcasts + announce.

**Seed (idempotent):** SPORTS director R. Subramaniam, students Sneha Patel (CSE-23-014) & Vikram Nair (ME-23-054), Dance Crew (captain Sneha), TechFest schedule (4 items), 2 PENDING registrations, 3 equipment items (bat/racket/football) with issue history, 3 seeded inbox alerts. Re-seed restores the demo state after e2e actions.

**Verified live:** dashboard `2 events · 3 teams · 2 pending regs` → registration approve → 409 re-decide → announce `recipients:3` → volunteer assign → add player + 409 dup → equipment return/issue (denorm synced) → venue booking APPROVE → broadcast `ALL_TEAMS recipients:2` → read-all → 403 for non-SPORTS token. Typecheck ✅ · all 12 files parse ✅.