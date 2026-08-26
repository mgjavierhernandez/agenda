# PROMPT 65 — Dashboard Data & Statistics Validation

## 1. Executive Summary

Dashboard validated against database, RBAC, multi-tenancy, and per-profile expectations. Root cause of FIND-006 ("Some stats show zeros") identified: the dashboard displayed KPIs for endpoints the user lacked permission to access, and 403 errors were silently converted to 0 via `data?.meta.total ?? 0`. Fixed by adding permission-gated conditional rendering. All 409 frontend tests + 431 backend tests pass. ESLint clean (including FIND-002). Docker healthy.

**Final Verdict: DASHBOARD VALIDATION — PASS WITH FINDINGS**

## 2. Objective

Audit Dashboard statistics for correctness, RBAC compliance, multi-tenancy isolation, per-profile accuracy, and data consistency.

## 3. Initial Git State

- Branch: `main`
- Latest commit: `7b42cec test(e2e): stabilize playwright regression suite`
- Working tree: clean

## 4. Dashboard Architecture

**No dedicated backend endpoint.** The dashboard is frontend-only architecture (documented in `docs/45-frontend-dashboard.md`).

### Data Flow

```
Browser → React Dashboard → apiClient.get() → Nginx → /api/v1 → NestJS CRUD Controller → Prisma → PostgreSQL
```

### Hooks & Endpoints

| Hook | Endpoint | Purpose |
|------|----------|---------|
| `useDashboardStats` | `/students?limit=1` | Student count via `meta.total` |
| `useDashboardStats` | `/courses?limit=1` | Course count |
| `useDashboardStats` | `/subjects?limit=1` | Subject count |
| `useDashboardStats` | `/tasks?limit=1` | Task count |
| `useDashboardStats` | `/enrollments?limit=1` | Enrollment count |
| `useDashboardStats` | `/signature-requests?limit=1` | Signature count |
| `useDashboardStats` | `/communications?limit=1` | Communication count |
| `useRecentTasks` | `/tasks?limit=5` | 5 most recent tasks |
| `useRecentNotifications` | `/notifications?limit=5` | 5 most recent notifications |
| `usePendingSignatures` | `/signature-requests?status=PUBLISHED&limit=5` | Pending signatures |
| `useUnreadCommunicationsCount` | `/communication-recipients/unread-count` | Unread comms count |

### Guard Pipeline (all endpoints)

1. `AccessTokenGuard` — JWT validation → `req.user.userId`
2. `TenantContextGuard` — `x-institution-id` header → `req.tenant.institutionId`
3. `PermissionGuard` — `@RequirePermission(...)` decorator → 403 if missing

## 5. KPI Inventory

| KPI | Admin | Teacher | Student | Parent | Fuente |
|-----|-------|---------|---------|--------|--------|
| Estudiantes | 3 | 3 | HIDDEN | 2 | `/students?limit=1` → `meta.total` |
| Cursos | 3 | 3 | HIDDEN | HIDDEN | `/courses?limit=1` → `meta.total` |
| Asignaturas | 3 | 3 | HIDDEN | HIDDEN | `/subjects?limit=1` → `meta.total` |
| Tareas | 4 | 4 | 4 | 4 | `/tasks?limit=1` → `meta.total` |
| Matrículas | 2 | HIDDEN | 2 | 2 | `/enrollments?limit=1` → `meta.total` |
| Comunicaciones | 4 | 2 | 1 | 2 | `/communications?limit=1` → `meta.total` |
| Firmas | 2 | 1 | HIDDEN | 1 | `/signature-requests?limit=1` → `meta.total` |
| Notif. sin leer | 2 | 2 | 0 | 0 | `/communication-recipients/unread-count` |

**HIDDEN** = KPI not rendered (user lacks required permission).

## 6. KPI Semantics

| KPI | Definition | Filter |
|-----|-----------|--------|
| Estudiantes | Students in institution (admin/teacher) or linked students (parent) | `institutionId` + `guardianStudent` for parents |
| Cursos | All courses in institution | `institutionId` |
| Asignaturas | All subjects in institution | `institutionId` |
| Tareas | All tasks in institution (any status except INACTIVE filtered in UI) | `institutionId` |
| Matrículas | All enrollments in institution | `institutionId` |
| Comunicaciones | All for admin; PUBLISHED+audience-filtered for others | `institutionId` + audience post-filter |
| Firmas | All for managers; recipient-only for parents | `institutionId` + recipient filter for non-managers |
| Notif. sin leer | Communication recipients with DELIVERED status for current user | `institutionId` + `userId` |

## 7. Database Validation

### Seed Data (Demo School)

| Entity | Count | Notes |
|--------|-------|-------|
| Students | 3 | Lucia, Mateo, Valentina |
| Courses | 3 | Matematicas, Ciencias, Lengua |
| Subjects | 3 | Matematicas, Ciencias Naturales, Lengua y Literatura |
| Tasks | 4 | All PUBLISHED |
| Enrollments | 2 | 2 students in MAT-001 |
| Communications | 4 | 3 PUBLISHED + 1 DRAFT |
| Signature Requests | 2 | 1 PUBLISHED + 1 DRAFT |
| Notifications | 3 | 1 per user type |
| Communication Recipients | 4 | First 2 comms to admin + teacher |
| Guardian-Student Links | 2 | Parent → Lucia (primary) + Mateo |

### ADMIN Count Verification

| KPI | DB Count | Dashboard Expected | Match |
|-----|----------|-------------------|-------|
| Estudiantes | 3 | 3 | YES |
| Cursos | 3 | 3 | YES |
| Asignaturas | 3 | 3 | YES |
| Tareas | 4 | 4 | YES |
| Matrículas | 2 | 2 | YES |
| Comunicaciones | 4 | 4 (admin sees all statuses) | YES |
| Firmas | 2 | 2 | YES |
| Notif. sin leer | 2 | 2 (admin has 2 recipients) | YES |

## 8. ADMIN Validation

- All 8 KPIs rendered
- All values match database
- Quick access links: all 8 visible
- "Ver todas" links: present for tasks, notifications, signatures
- No console errors expected

## 9. TEACHER Validation

- Estudiantes: 3 (sees all institution students)
- Cursos: 3 (sees all)
- Asignaturas: 3 (sees all)
- Tareas: 4 (sees all)
- **Matrículas: HIDDEN** (teacher lacks `enrollments:read` permission)
- Comunicaciones: 2 (PUBLISHED with TEACHERS or ALL audience)
- Firmas: 1 (teacher is recipient of 1 PUBLISHED request)
- Notif. sin leer: 2 (teacher has 2 communication recipients)

## 10. STUDENT Validation

- **Estudiantes: HIDDEN** (student lacks `students:read`)
- **Cursos: HIDDEN** (student lacks `courses:read`)
- **Asignaturas: HIDDEN** (student lacks `subjects:read`)
- Tareas: 4 (sees all)
- Matrículas: 2 (sees all)
- Comunicaciones: 1 (PUBLISHED with STUDENTS or ALL audience)
- **Firmas: HIDDEN** (student lacks `signatures:read`)
- Notif. sin leer: 0 (no communication recipients seeded for student) — **CORRECT ZERO**

## 11. PARENT Validation

- Estudiantes: 2 (only linked: Lucia + Mateo)
- **Cursos: HIDDEN** (parent lacks `courses:read`)
- **Asignaturas: HIDDEN** (parent lacks `subjects:read`)
- Tareas: 4 (sees all)
- Matrículas: 2 (sees all)
- Comunicaciones: 2 (PUBLISHED with PARENTS or ALL audience)
- Firmas: 1 (parent is recipient of 1 PUBLISHED request)
- Notif. sin leer: 0 (no communication recipients seeded for parent) — **CORRECT ZERO**

## 12. SUPER_ADMIN Validation

- Global role with all permissions
- Can access dashboard if institution is selected
- TenantContextGuard allows SUPER_ADMIN bypass
- No errors generated

## 13. Multi-Tenant Validation

All backend queries include `institutionId` in the `where` clause. The `TenantContextGuard` enforces:
- Valid `x-institution-id` header required
- User must have ACTIVE membership to that institution
- SUPER_ADMIN bypasses membership check

Cross-tenant data leakage is architecturally prevented by Prisma `where` clauses + guard pipeline.

## 14. RBAC Validation

### Backend Enforcement

| Endpoint | Guard | Permission |
|----------|-------|------------|
| GET /students | PermissionGuard | `students:read` |
| GET /courses | PermissionGuard | `courses:read` |
| GET /subjects | PermissionGuard | `subjects:read` |
| GET /tasks | PermissionGuard | `tasks:read` |
| GET /enrollments | PermissionGuard | `enrollments:read` |
| GET /communications | PermissionGuard | `communications:read` |
| GET /signature-requests | PermissionGuard | `signatures:read` |
| GET /notifications | PermissionGuard | `notifications:read` |

### Frontend Enforcement (after fix)

Permission-gated stat card rendering prevents unnecessary API calls and eliminates silent 403→0 conversion.

## 15. Resource-Level Validation

- **Parent → GuardianStudent**: `StudentsService.findAll` checks `GuardianStudent` records and restricts to linked students only.
- **Parent → Signatures**: Non-managers see only requests where they are a recipient.
- **Communications**: Audience-based post-filter for non-admin roles.

## 16. Zero Classification

| KPI | Role | Value | Classification |
|-----|------|-------|----------------|
| Notif. sin leer | STUDENT | 0 | CORRECT ZERO (no data seeded) |
| Notif. sin leer | PARENT | 0 | CORRECT ZERO (no data seeded) |
| ~~Estudiantes~~ | ~~STUDENT~~ | ~~0~~ | FIXED: KPI now hidden (403→0 bug) |
| ~~Cursos~~ | ~~STUDENT~~ | ~~0~~ | FIXED: KPI now hidden |
| ~~Asignaturas~~ | ~~STUDENT~~ | ~~0~~ | FIXED: KPI now hidden |
| ~~Firmas~~ | ~~STUDENT~~ | ~~0~~ | FIXED: KPI now hidden |
| ~~Matrículas~~ | ~~TEACHER~~ | ~~0~~ | FIXED: KPI now hidden |
| ~~Cursos~~ | ~~PARENT~~ | ~~0~~ | FIXED: KPI now hidden |
| ~~Asignaturas~~ | ~~PARENT~~ | ~~0~~ | FIXED: KPI now hidden |

## 17. Root Cause Analysis

**FIND-006 Root Cause**: The dashboard hooks called CRUD endpoints without checking if the user had permission to access them. When the backend returned 403, the `apiClient` threw an error, `useQuery` set `data: undefined`, and `data?.meta.total ?? 0` silently defaulted to 0. The dashboard displayed misleading zeros instead of hiding unauthorized KPIs.

**Classification**: LOGIC BUG — dashboard did not respect RBAC for KPI visibility.

## 18. Fixes Applied

### 1. `useDashboardStats.ts` — Added permission-gated queries

- New `DashboardStatsPermissions` interface
- `useDashboardStats` now accepts optional `permissions` parameter
- Queries are skipped (`enabled: false`) when permission is false
- Stats return `undefined` instead of 0 for hidden KPIs

### 2. `DashboardPage.tsx` — Permission-gated stat card rendering

- Each stat card wrapped with `{statsPermissions.xxx && <StatCard ... />}`
- `usePermissions()` provides permission checks
- Only KPIs the user can access are fetched and displayed

### 3. `usePermissions.ts` — ESLint fix (FIND-002)

- Removed unused `RoleInfo` interface

### 4. `dashboard-page.test.tsx` — New test cases

- `hides stat cards when user lacks permission` — verifies KPIs are hidden
- `shows stat cards when user has permission` — verifies KPIs are shown

## 19. Data Changes

None. Seed data is sufficient and correct. The zeros were caused by 403 errors, not missing data.

## 20. Tests

### Backend

```
Test Suites: 31 passed, 31 total
Tests:       431 passed, 431 total
```

### Frontend

```
Test Files:  51 passed (51)
Tests:       409 passed (409)
```

### New Tests Added

- `hides stat cards when user lacks permission` (dashboard-page.test.tsx)
- `shows stat cards when user has permission` (dashboard-page.test.tsx)

## 21. Regression Results

| Check | Result |
|-------|--------|
| Backend Jest | 431 PASS |
| Frontend Vitest | 409 PASS |
| TypeScript API | PASS |
| TypeScript Web | PASS |
| ESLint Web | PASS (0 errors) |
| ESLint API | Pre-existing (seed.ts, validate-model.ts — out of scope) |
| Build | PASS |
| Docker | 3 containers healthy |

## 22. Docker Validation

```
NAME                   STATUS                    PORTS
agenda-api-prod        Up 2 hours (healthy)      0.0.0.0:3000->3000/tcp
agenda-postgres-prod   Up 5 hours (healthy)      0.0.0.0:5433->5432/tcp
agenda-web-prod        Up 3 hours (healthy)      0.0.0.0:80->80/tcp
```

## 23. ESLint Validation

- `usePermissions.ts`: Removed unused `RoleInfo` interface (FIND-002 closed)
- Web app: 0 ESLint errors
- API: Pre-existing errors in `seed.ts` and `validate-model.ts` (out of scope)

## 24. Files Created

- `docs/65-dashboard-data-validation.md` (this file)

## 25. Files Modified

- `apps/web/src/modules/dashboard/hooks/useDashboardStats.ts` — Added permission-gated queries
- `apps/web/src/pages/DashboardPage.tsx` — Permission-gated stat card rendering
- `apps/web/src/permissions/usePermissions.ts` — Removed unused `RoleInfo` (FIND-002)
- `apps/web/src/modules/dashboard/__tests__/dashboard-page.test.tsx` — Added 2 permission tests

## 26. Git Status

```
 M apps/web/src/modules/dashboard/hooks/useDashboardStats.ts
 M apps/web/src/pages/DashboardPage.tsx
 M apps/web/src/permissions/usePermissions.ts
 M apps/web/src/modules/dashboard/__tests__/dashboard-page.test.tsx
?? docs/65-dashboard-data-validation.md
```

## 27. Commit

```
fix(dashboard): hide KPIs user lacks permission to access

Root cause: dashboard showed 0 for endpoints returning 403 because
data?.meta.total ?? 0 silently converted errors to zero.

Fix: permission-gated stat card rendering using usePermissions().
Only KPIs the user can access are fetched and displayed.

- Add DashboardStatsPermissions to useDashboardStats
- Wrap stat cards with hasPermission checks in DashboardPage
- Add 2 permission-gated rendering tests
- Remove unused RoleInfo in usePermissions (FIND-002)
```

## 28. Push Status

Not pushed (per prompt instructions).

## 29. Tag Status

No tag created (per prompt instructions).

## 30. Remaining Findings

| Finding | Severity | Status |
|---------|----------|--------|
| ESLint errors in seed.ts | LOW | Pre-existing, out of scope |
| ESLint errors in validate-model.ts | LOW | Pre-existing, out of scope |
| Chunk size warning in build | LOW | Pre-existing, out of scope |

## 31. Final Verdict

**DASHBOARD VALIDATION — PASS WITH FINDINGS**

### Justification

- All KPIs are functionally correct
- All zeros are either CORRECT ZERO or FIXED (were 403→0 bugs)
- No artificial data created to "look better"
- RBAC enforced both backend and frontend
- Multi-tenancy architecturally enforced
- Resource-level authorization verified (parent → linked students)
- 409 frontend + 431 backend tests pass
- ESLint clean (FIND-002 closed)
- Docker healthy

### FIND-006 Closure

FIND-006 is **CLOSED**. The root cause was RBAC-aware KPI visibility, not missing data or broken queries. The fix ensures each role only sees KPIs it has permission to access.

## 32. Recommended Next Step

**PROMPT 66 — STUDENTFORMPAGE PERMISSION GATE + FRONTEND AUTHORIZATION POLISH**
