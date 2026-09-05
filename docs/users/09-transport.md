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