# PROMPT 104 — Teachers / Roles / Academic Relations

**Status:** Implemented (FASE 1 audit → gap closing → full regression green)
**Branch:** `main` (NO commit / push / tag performed)
**Monorepo:** `C:\Agenda` (NestJS API + React/Vite Web + Prisma 6.19.3 + PostgreSQL)

---

## 1. Scope & constraints satisfied (HARD RULES)

- **No `Teacher` entity created** — `User` + `UserInstitution` membership already represent the person. Docentes are queried from `TeacherAssignment` + memberships with the `TEACHER` role.
- **No parallel roles system** — the new **director de grupo** capability is a standard RBAC role (`DIRECTOR_DE_GRUPO`), fully reusing the existing role/permission model, `AuthorizationService`, guards, tenant isolation and `AuditLog`.
- **No duplication of existing entities** — reused `Area` (curriculum hierarchy from PROMPT 102), `Subject`, `Course`, `Student`/`Enrollment`, `CourseTeacherAssignment`/`TeacherAssignment`. No new tables invented beyond the `areas` table already introduced by PROMPT 102. The pair only re-wires the existing subject↔area relation and adds roles/queries/UI gaps.
- **Tenant isolation + RBAC preserved** — every new endpoint filters by `req.tenant.institutionId`; area validation on subjects performs a cross-tenant ownership check (404). All mutation routes gated by permission guard.
- **TS strict + existing conventions**, no comments added beyond existing patterns, no `deleteMany({ where: { institutionId: undefined } })`, no client-supplied institutionId used as the source of truth.
- **Migration** reuses the existing `20260904000000_add_curriculum_hierarchy_and_staff` migration (PROMPT 102). No new migration required (no schema change for this prompt).

---

## 2. FASE 1 audit — real gaps closed

| Domain | Authenticated gap | Status |
|---|---|---|
| Areas (aseguramiento de cobertura) | No Areas API; subject DTOs silently dropped `areaId`/`subjectType`/levels; no list filter by area/level | **Closed** |
| Director de grupo | No role, no endpoint to list holders | **Closed** (added `DIRECTOR_DE_GRUPO` role) |
| Docentes consultas | No "list teachers" or "list group directors" endpoint | **Closed** |
| Frontend | No `Area`/`EducationLevel`/`SubjectType` types; `Subject` missing fields; no `/areas`/`/teachers` pages/routes | **Closed** |
| Vigencia / historial | Not a real gap: role changes already audited via `USER_ROLE_ASSIGNED`/`USER_ROLE_REMOVED`; member roles carry `validity` dates | Documented (no work needed) |

---

## 3. Permissions (new codes)

- `areas:read` — list/read areas. Added to: `INSTITUTION_ADMIN`, `RECTOR`, `COORDINADOR_ACADEMICO`, `TEACHER`.
- `areas:manage` — CRUD areas. Added to: `INSTITUTION_ADMIN`, `RECTOR`, `COORDINADOR_ACADEMICO`.

Both entries were added to the **`permissionData`** seed array (the source of the `permissions` table), not only to the role permission arrays — otherwise the upsert-created `role_permissions` rows would be skipped and the codes would be missing from the DB. Seed now reports **77 permissions** (was 75).

---

## 4. Director de grupo (`DIRECTOR_DE_GRUPO`) role

**Decision (confirmed):** director de grupo = an RBAC role, not a new entity. A member can hold both `TEACHER` and `DIRECTOR_DE_GRUPO` roles simultaneously.

- `apps/api/src/common/rbac/assignable-roles.ts`: added `'DIRECTOR_DE_GRUPO'` so it is assignable through the existing UI.
- `apps/api/prisma/seed.ts`:
  - `DIRECTOR_DE_GRUPO_PERMISSIONS = TEACHER_PERMISSIONS ∪ { enrollments:read, attendance:stats, student-follow-ups:manage }` (deduped with `Array.from(new Set([...]))`).
  - Template role + Demo School tenant role created; permissions assigned.
  - Assigned to the demo teacher (`teacher@demo-school.dev`, María García).

**"Which group?" granularity** is intentionally deferred: holders are listed via the new query endpoint; membership history is available through the existing `AuditLog`.

---

## 5. Backend implementation

### `areas` module (new)
`apps/api/src/modules/areas/`:
- `areas.service.ts` — `create`, `findAll`, `findOne`, `update`, `deactivate`; audit actions `AREA_CREATED` / `AREA_UPDATED` / `AREA_DEACTIVATED`; always scoped to `req.tenant.institutionId`.
- `areas.controller.ts` — `POST /areas`, `GET /areas`, `GET /areas/:id`, `PATCH /areas/:id`, `DELETE /areas/:id` (deactivate) guarded by `areas:manage` / `areas:read`.
- `areas.module.ts`, DTOs: `create-area.dto.ts`, `update-area.dto.ts`, `list-areas-query.dto.ts`.
- Registered in `apps/api/src/app.module.ts`.

### `subjects` re-wiring
- DTOs (`create-subject.dto.ts`, `update-subject.dto.ts`, `list-subjects-query.dto.ts`) now accept `areaId`, `subjectType`, `minimumLevel`, `maximumLevel`; list supports an `areaId` filter.
- `subjects.service.ts`: applies the fields on create/update (using relation `connect`/`disconnect` for `area`), validates `areaId` belongs to the institution via `assertAreaBelongsToInstitution` (404 on cross-tenant), audits the new fields, filters list by `areaId`.

### `teacher-assignments` queries
- `teacher-assignments.service.ts`: added `getTeachers()` (memberships with `TEACHER` role + courses/subjects/students via `TeacherAssignment` + `Enrollment` join) and `getDirectors()` (memberships with `DIRECTOR_DE_GRUPO` role).
- `teacher-assignments.controller.ts`: `GET /teacher-assignments/teachers` and `GET /teacher-assignments/directories` (declared **before** the `:id` route).

---

## 6. Frontend implementation

- `apps/web/src/api/types.ts`: added `EducationLevel`, `SubjectType`, `EDUCATION_LEVEL_LABELS`, `SUBJECT_TYPE_LABELS`, `Area`, `CreateAreaInput`, `UpdateAreaInput`, `ListAreasParams`, updated `Subject` / `CreateSubjectInput` / `UpdateSubjectInput` (areaId/type/min/max), `areaId?` on `ListSubjectsParams`, `ROLE_LABELS` (incl. `DIRECTOR_DE_GRUPO: 'Director de grupo'`), `TeacherCourseSummary`, `TeacherSummary`, `GroupDirector`.
- `apps/web/src/permissions/permission.constants.ts`: `AREAS_READ` / `AREAS_MANAGE`; `DIRECTOR_DE_GRUPO` in `ROLE_NAMES`.
- `apps/web/src/modules/areas/` (new): hooks `useAreas` / `useCreateArea` / `useUpdateArea` / `useDeactivateArea` + `pages/AreasPage.tsx`.
- `apps/web/src/modules/subjects/pages/SubjectFormPage.tsx`: area / type / min-level / max-level selectors + payload wiring.
- `apps/web/src/modules/teacher-assignments/`: `hooks/useTeachers.ts`, `hooks/useDirectors.ts` (exported from `hooks/index.ts`), `pages/TeachersPage.tsx` (docentes list with director badge + courses/subjects/students), exported from `index.ts`.
- `apps/web/src/app/router.tsx`: `/areas` and `/teachers` routes.
- `apps/web/src/components/layout/Sidebar.tsx`: added **Áreas** (`AREAS_READ`) and **Docentes** (`TEACHER_ASSIGNMENTS_READ`) links.
- Updated test mocks in `teacher-assignments-pages.test.tsx` and `subject-form-page.test.tsx`.

---

## 7. Regression results (all green)

| Gate | Command | Result |
|---|---|---|
| Prisma generate | `npx prisma generate` | OK |
| Seed | `npx prisma db seed` | SUCCESS (77 perms, 21 roles) |
| API typecheck/build | `npx nest build` | clean |
| API unit | `npm test` | **805/805 passed (45 suites)** |
| API E2E | `npx jest --config ./test/jest-e2e.json --runInBand` | **690/690 passed (32 suites)** — baseline 681 + **9 new** `areas-teachers` tests |
| API lint | `npx eslint` (touched files) | clean |
| Web typecheck+build | `npm run build` (tsc --noEmit + vite) | clean |
| Web unit | `npm test` | **510/510 passed (64 suites)** |
| Web lint | `npx eslint` (touched files) | clean |

New E2E spec `apps/api/test/areas-teachers.e2e-spec.ts` covers: auth (401) / permission (403) on `/areas`; seeded demo areas with tenant scoping; create area scoped to institution; **cross-tenant body tampering rejected (403)**; subject created with area/type/levels; subject referencing another institution's area rejected (404); `GET /teachers` lists courses/subjects/students; `GET /directories` lists `DIRECTOR_DE_GRUPO` holders (demo teacher is director).

---

## 8. Files touched

New: `apps/api/src/modules/areas/**`, `apps/api/src/common/rbac/assignable-roles.ts`, `apps/api/test/areas-teachers.e2e-spec.ts`, `apps/web/src/modules/areas/**`, `apps/web/src/modules/teacher-assignments/hooks/useTeachers.ts` + `useDirectors.ts`, `apps/web/src/modules/teacher-assignments/pages/TeachersPage.tsx`.

Modified: `apps/api/prisma/seed.ts`, `apps/api/src/app.module.ts`, subjects DTOs + service, teacher-assignments controller + service (+spec), `apps/web/src/api/types.ts`, `apps/web/src/permissions/permission.constants.ts`, `apps/web/src/modules/subjects/pages/SubjectFormPage.tsx` (+ test), router, Sidebar, TeacherAssignments `hooks/index.ts` + `index.ts` (+ test).

(Other modified files in `git status` — schedules, DTO metadata, schema, etc. — belong to the prior PROMPT 102/103 work already present in the working tree; **no commit performed** for this prompt.)