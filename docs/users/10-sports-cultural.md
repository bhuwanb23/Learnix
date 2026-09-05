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