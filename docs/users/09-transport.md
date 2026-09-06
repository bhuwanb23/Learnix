# 09 — Transport App (`role: transport`)

> Entry: `users/transport/transport.js` · Pattern: **tab-router** (5 tabs + 4 feature modules)

## 1. Role & Scope
The transport department runs campus commuting: route planning, fleet management, GPS tracking, driver management, maintenance & fuel, transport fees, and alerts to students.

## 2. App Shell
- **Bottom nav**: Dashboard · Routes · Fleet · Drivers · Profile.
- **Feature modules**: Tracking, Maintenance, Fees, Notifications.

## 3. Modules & Data Entities

### 3.1 Dashboard
Hero (buses on road, GPS live badge), stats (buses/routes/students/on-time %), today's routes with delay chips, alerts (service due, delay, low fuel), quick-tool launcher, activity feed.

### 3.2 Routes (tab)
Route list (stops, students, distance, assigned bus) → **route detail**: hero stats, bus + driver card, Live Map / Passengers / Delay Alert actions, passenger list, animated **stop timeline** (passed vs upcoming).

**Entity `route`**
| Field | Type |
|-------|------|
| id | Route 01 |
| name, distance, stops[] | string / array |
| students | number |
| busId, driverId | FK |
| timeline | [{ stop, time, status: passed/upcoming }] |

### 3.3 Fleet (tab)
Vehicle list with fuel bars (red < 30%), status (On Road/Idle/Service) → **vehicle detail**: odometer/fuel/route, registration/insurance/fitness/mileage, **Record Service form**, service history with costs.

**Entity `vehicle`**
| Field | Type |
|-------|------|
| id, regNo, model | string |
| capacity, odometer, fuelPct | number |
| status | On Road / Idle / Service |
| documents | registration, insurance, fitness, mileage |

**Entity `service_record`**: id, vehicleId, type, cost, date, status.

### 3.4 Drivers (tab)
Driver roster (experience, license, route assignment, duty status On Duty/Off Duty/On Leave), call action.

**Entity `driver`**: id, name, license, experience, routeId, dutyStatus.

### 3.5 Live Tracking (module)
GPS map placeholder with **Open Live Map**, bus positions ("Now at", speed), route progress bars, ETA, on-time/delayed chips.

**Entity `bus_position`**: busId, routeId, currentStop, speed, eta, status (On Time/Delayed).

### 3.6 Maintenance (module)
Service queue (priority + status), **Mark Completed**; fuel log with **Log Fuel** form (vehicle picker + litres/amount).

**Entity `fuel_log`**: id, vehicleId, litres, amount, date.

### 3.7 Transport Fees (module)
FY collection stats, fee structure card (₹18,000/yr) with **Request Revision** (→ admin), payment status list (Paid/Partial/Unpaid) with **Remind** + **Collect** (clears dues → Accounts).

**Entity `transport_fee`**: id, studentId, amount, status (Paid/Partial/Unpaid), dueDate.

### 3.8 Notifications (module)
Inbox (delay/fee/maintenance/info types) + **Broadcast tab** (audience: All Students / Route 01/07/12 / Defaulters → route delays, notices pushed to student app).

### 3.9 Profile
Transport officer profile, fleet stats, preference toggles (delay alerts, service reminders, low fuel), account menu.

## 4. Backend API Surface
```
GET  /api/transport/dashboard
GET  /api/transport/routes               (+ /{id})
GET  /api/transport/fleet                (+ /{id}, POST /{id}/service)
GET  /api/transport/drivers
GET  /api/transport/tracking             (bus positions, eta)
POST /api/transport/maintenance/{id}/complete
POST /api/transport/fuel-log             { vehicleId, litres, amount }
GET  /api/transport/fees                 (POST /{id}/remind, /{id}/collect)
POST /api/transport/fee-structure/revision
GET  /api/transport/notifications
POST /api/transport/broadcasts
```

## 5. Cross-App Dependencies
- Writes → **Student**: route/bus assignment, delay alerts, fee dues, broadcast notices.
- Writes → **Accounts**: transport fee collections.
- Reads ← **Admin**: student master (fee eligibility), institution config.

## 6. Wiring Status — LIVE (backend + app wired end to end)

**Backend:** `backend/src/modules/transport/` (routes · service · zod schemas), mounted at `/api/v1/transport`, role-gated `TRANSPORT | ADMIN`. Demo login: `transport@learnix.dev` / `Passw0rd!`.

| Endpoint | Notes |
|---|---|
| `GET /dashboard` | real fleet stats (on-road/service, routes, students, on-time %), route statuses from live GPS, alerts from service queue + low fuel (<30%) |
| `GET /routes` · `GET /routes/:id` | stops timeline with per-stop passenger names, bus+driver card, live position (status/ETA/progress), passed/upcoming state |
| `POST /routes` · `POST /routes/:id/stops` | create route (409 dup name), append stops (auto order) |
| `POST /routes/:id/enroll` · `POST /enrollments/:id/remove` | enroll by roll no → **auto-generates ₹18k fee due** for the current AY + notifies student; remove is soft (REMOVED) |
| `GET /fleet` · `GET /fleet/:id` | fuel bars, status, docs-expiry flags (≤60 days), service history, fuel logs, live position |
| `POST /fleet/:id/service` · `POST /service-records/:id/complete` | schedule (PERIODIC/REPAIR/INSPECTION) → complete sets vehicle IDLE, optional odometer update |
| `POST /fleet/:id/fuel` | fuel log + raises fuelPct (capped 100) |
| `GET /drivers` · `POST /drivers/:id/duty` | roster with license-expiry countdown (≤90d warning), duty cycle toggle |
| `GET /tracking` · `POST /vehicles/:id/ping` | live positions with route progress %; ping **upserts** (one row/vehicle); first ON_TIME→DELAYED flip notifies all enrolled students |
| `GET /maintenance` | service queue + fuel log with spend totals |
| `GET /fees` · `POST /fees/:id/remind` · `POST /fees/:id/collect` | collection stats; remind notifies student; collect creates unified **Payment (TRANSPORT) + Receipt write-through** (409 on re-collect, PAY/RCP sequence numbers) |
| `POST /fee-structure/revision` | notifies all ADMIN users + audited (structure itself is Accounts-owned) |
| `GET /notifications` · `POST /notifications/read-all` · `POST /broadcasts` | fan-out: `ALL_STUDENTS` (transport-enrolled) / `ROUTE` (routeId) / `DEFAULTERS` (UNPAID/PARTIAL) |
| `GET /profile` | identity + fleet stats |

**App:** all 11 screens wired via `transportApi` (`services/api.js`), demo identity `setDemoUser('transport@learnix.dev')` in `transport.js`. Every static array removed; loading/error/retry/pull-to-refresh throughout. Fees module has the collect sheet (method picker) showing the returned payment+receipt numbers; tracking has flag-delay / back-on-time ping buttons; route detail has enroll + add-stop + delay-alert actions.

**Deltas from the §4 sketch:** service-record completion covers the maintenance flow (`POST /maintenance/{id}/complete` became `POST /service-records/{id}/complete`); fee collection returns payment + receipt refs; GPS pings are officer-triggered from the tracking screen until a device/Gateway phase exists; map view is a placeholder (no WS/maps SDK yet, positions upsert via API per ADR).

**Seed (idempotent, restores demo state):** `transport@learnix.dev` (K. Harish Kumar, Transport Officer), drivers Manjunath S (ON_DUTY, app-linked) & Suresh P (OFF_DUTY), Route 01 (4 stops, Arjun @ stop 2, live ON_TIME eta 18 min) + Route 02, Vikram's PAID fee with PAY-TF-0001 write-through, Arjun UNPAID ₹18k, 3 officer alerts. Re-seed undoes e2e collections/delays/duty toggles.

**Verified live:** dashboard `2 vehicles (1 on-road) · 2 routes · 2 students · 100% on-time` → fee collect → `PAY-2026-0005` + receipt, 409 re-collect → GPS DELAYED ping → Arjun's inbox got `DELAY: Route 01 is delayed` → enroll Vikram (auto fee due) → route broadcast `recipients:1` → driver duty toggle → add stop → fee revision `notifiedAdmins:1` → 403 for non-TRANSPORT token. Typecheck ✅ · all 13 files parse ✅.