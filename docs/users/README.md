# Learnix ERP — User Role Documentation

Complete documentation of every user role in the Learnix ERP portal, written as **backend-ready contracts**: modules, screens, data entities with fields, actions/state changes, API surface, and cross-app dependencies.

## Start here
- **[00-overview.md](00-overview.md)** — architecture, role index, shared/master data model, cross-app relationships, shared state machines, and the backend blueprint. **Read this first.**

## Per-role docs

| Role | Login ID | Doc |
|------|----------|-----|
| Student | `student` | [01-students.md](01-students.md) |
| Teacher | `teacher` | [02-teachers.md](02-teachers.md) |
| Admin (Super User) | `admin` | [03-admin.md](03-admin.md) |
| Placement Cell | `placement` | [04-placement-cell.md](04-placement-cell.md) |
| Exam Cell | `examcell` | [05-exam-cell.md](05-exam-cell.md) |
| Accounts & Finance | `accounts` | [06-accounts-finance.md](06-accounts-finance.md) |
| Library Staff | `library` | [07-library-staff.md](07-library-staff.md) |
| Hostel | `hostel` | [08-hostel.md](08-hostel.md) |
| Transport | `transport` | [09-transport.md](09-transport.md) |
| Sports & Cultural | `sports` | [10-sports-cultural.md](10-sports-cultural.md) |
| HOD / Department Coordinator | `hod` | [11-hod.md](11-hod.md) |
| Alumni Relations | `alumni` | [12-alumni-relations.md](12-alumni-relations.md) |

## How each doc is structured
1. **Role & Scope** — what the user does and how it fits the institution
2. **App Shell** — bottom-nav tabs, feature modules, sub-pages, navigation flows
3. **Modules & Data Entities** — every screen with its data shape (fields + types) and actions
4. **Backend API Surface** — suggested REST endpoints per module
5. **Cross-App Dependencies** — what the app reads from and writes to other roles

## Maintenance
These docs mirror the frontend at `learnix/users/*`. When screens or data change, update the matching doc — the docs are the source of truth for backend implementation.