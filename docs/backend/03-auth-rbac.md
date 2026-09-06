# 03 — Auth, Roles & RBAC

> How identity, sessions, and authorization work. Complies with ADR-05/06/07/08.

---

## 1. Identity model

```
institutions 1─* users 1─* user_roles          (one login, N roles)
users 1─1 student_profiles | staff_profiles | alumni_profiles   (0..1 each)
```

- A person holds **one `users` row per institution** (email unique per institution) and **any number of roles**.
- A teacher promoted to HOD simply gains a `user_roles` row — no duplicate account, all their teaching data keeps working.
- Profile tables carry the role-specific data; a user may have several (staff who is also an alumnus).

## 2. Role vocabulary (exact strings)

| Role | App | Notes |
|---|---|---|
| `PLATFORM_ADMIN` | none (platform API only) | Provisions institutions; never sees the 12 apps |
| `STUDENT` | 01-students | + `student_profiles` |
| `TEACHER` | 02-teachers | + `staff_profiles` |
| `ADMIN` | 03-admin | College super user + `staff_profiles` |
| `PLACEMENT` | 04-placement-cell | + `staff_profiles` |
| `EXAMCELL` | 05-exam-cell | + `staff_profiles` |
| `ACCOUNTS` | 06-accounts-finance | + `staff_profiles` |
| `LIBRARY` | 07-library-staff | + `staff_profiles` |
| `HOSTEL` | 08-hostel | + `staff_profiles` |
| `TRANSPORT` | 09-transport | + `staff_profiles` |
| `SPORTS` | 10-sports-cultural | + `staff_profiles` |
| `HOD` | 11-hod | + `staff_profiles` (departmentId = their department) |
| `ALUMNI` | 12-alumni-relations | + `alumni_profiles` |

## 3. Token design

| Token | TTL | Storage | Contents |
|---|---|---|---|
| Access JWT | 15 min | Client memory | `sub` (userId), `inst` (institutionId), `roles[]`, `iat`, `exp`, `jti` |
| Refresh token | 30 d | httpOnly cookie (web) / secure storage (RN); DB stores **hash only** | Opaque `cuid`, rotated on every use |

**Rules**
- Access tokens are **stateless**; role *changes* take effect on next refresh (acceptable ≤15 min lag).
- Refresh rotation: each refresh call invalidates the old row (`revokedAt`, `replacedById`) and issues a new one. Reuse of a revoked token ⇒ revoke the whole family (theft signal).
- Logout revokes the refresh family. `POST /auth/logout-all` revokes all of a user's sessions.
- Passwords: bcrypt cost 12 (ADR-07). Password policy: min 8 chars, 1 letter + 1 number (matches seed `Passw0rd!`).

## 4. Endpoints (module `auth`)

```
POST /api/v1/auth/register-student   # self sign-up → STUDENT role (pending ACTIVE)
POST /api/v1/auth/login              # { email, password } → { accessToken, refreshToken, user{ id, name, roles[] } }
POST /api/v1/auth/refresh            # rotate
POST /api/v1/auth/logout             # revoke family
POST /api/v1/auth/logout-all
GET  /api/v1/auth/me                 # profile + roles + institution
POST /api/v1/auth/forgot-password    # → token (dev: returned in response; prod: email)
POST /api/v1/auth/reset-password     # { token, newPassword }
POST /api/v1/auth/change-password    # authenticated
```

**Login response contract (frontend integration):** the current role-picker login will map to `user.roles[]`; until a role switcher exists, the app uses `roles[0]`. No frontend navigation change needed.

## 5. Middleware chain

```
requestContext → auth → requireRole(...) → tenantScope → validate(zod) → handler → errorHandler
```

- `auth`: verifies JWT, loads nothing from DB (fast path).
- `requireRole('TEACHER','HOD')`: 403 unless intersection with `req.auth.roles` is non-empty.
- `tenantScope`: attaches `req.tenantDb = withTenant(req.auth.institutionId)` — the ONLY Prisma handle services may use.
- `PLATFORM_ADMIN` routes use `requirePlatform` instead, plus an explicit `X-Institution-Id` header or `?institutionId=` to choose the college context for an action (ADR-05: no cross-tenant mixing in one request).

## 6. Permission model (fine-grained, editable by college admin)

- Coarse gate = roles (middleware). Fine gate = `role_permissions` rows: `(role, permissionKey)`.
- `permissionKey` vocabulary: `domain.action` — e.g. `students.create`, `students.approve`, `syllabus.approve`, `leave.approve`, `results.publish`, `fees.waive`, `drives.approve`, `announcements.publish`.
- Seeded from the admin Settings module's default matrix (03 §3.15); `PUT /api/v1/admin/settings/roles` updates it; changes are audit-logged.
- Services call `assertPermission(req.auth, 'syllabus.approve')` where the coarse check isn't enough (e.g. both HOD and ADMIN can approve, with different downstream effects per the state machines).

## 7. Seed users (dev)

Every role gets one demo login, password `Passw0rd!` (dev only), documented in the seed output:

| Email | Roles |
|---|---|
| `platform@learnix.dev` | PLATFORM_ADMIN |
| `admin@learnix.dev` | ADMIN |
| `hod.cse@learnix.dev` | HOD, TEACHER |
| `teacher.cse@learnix.dev` | TEACHER |
| `student.cse@learnix.dev` | STUDENT |
| `placement@learnix.dev` / `examcell@…` / `accounts@…` / `library@…` / `hostel@…` / `transport@…` / `sports@…` | single role each |
| `alumni@learnix.dev` | ALUMNI |

The seed also creates: demo institution, academic year 2025-26, CSE/ECE/ME departments, B.Tech CSE program, batches, sections, a course set with offerings, and one student cohort — enough for every module to render real data.

## 8. Security checklist (enforced in review + tests)

- [ ] No raw Prisma client outside `src/db/` (tenant leak guard).
- [ ] Refresh tokens stored hashed; never logged.
- [ ] JWT secrets from env; fail-fast boot if missing.
- [ ] Rate limit `/auth/login` and `/auth/forgot-password` (in-memory bucket v1).
- [ ] All mutations audit-logged with actor.
- [ ] Tenant isolation test: college-B token cannot GET/POST any college-A resource (runs in CI every phase).
