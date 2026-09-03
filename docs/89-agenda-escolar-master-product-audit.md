# PROMPT 89 — MASTER PRODUCT AUDIT — AGENDA ESCOLAR

> **Fecha:** 2026-08-28
> **Commit auditado:** `e7dca4a` (`feat(student-follow-ups): complete Observador del Alumno module`)
> **Tag:** `v1.0.2-rc.1`
> **Rama:** `main`
> **Tipo de auditoría:** Solo lectura + inventario + gap analysis + roadmap. **Sin cambios funcionales.**

---

## 1. Executive Summary

**Agenda Escolar** es un monorepo SaaS (NestJS + Prisma + PostgreSQL + React/Vite + Docker) con un núcleo de identidad, autenticación, RBAC y multi-tenancy **sólido y bien ejecutado**, sobre el que se construyó un **CRUD administrativo bastante completo** para la mayoría de las entidades escolares, y un módulo estrella — **Observador del Alumno (Student Follow-Ups)** — que alcanzó el nivel de release candidate (`v1.0.2-rc.1`) y es el benchmark de madurez técnica del proyecto.

La conclusión principal: **hoy Agenda Escolar es un "Functional MVP" fragmentario orientado a administración**. El backend y el RBAC están al nivel de un MVP funcional; el frontend tiene CRUD completo para casi todos los módulos administrativos. **Sin embargo**, varios flujos de negocio **críticos para la operación real de un colegio no están cerrados end-to-end** (matrícula no alimenta horarios/calificaciones de forma automática, no hay cierre de periodo ni boletín, no hay reportes/exportación, **no existe módulo de Asistencia**), y el **producto "Agenda/Calendario" es solo una vista de solo lectura** (no permite crear eventos), lo cual es contraintuitivo para un producto llamado "Agenda Escolar".

No hay despliegue real a la nube ni CI/CD con Docker build ni deploy; el CI corre lint/typecheck/unit tests/E2E Playwright pero **no ejecuta los 553 tests de integración API** y **no construye imágenes Docker**.

**Estado de producto: C. Functional MVP (con núcleo backend muy sólido, pero N bloques de operación escolar sin cerrar).**

---

## 2. Audit Scope

- **Alcance:** repositorio completo — backend NestJS (`apps/api`), frontend React (`apps/web`), paquete compartido (`packages/shared`), Prisma (`apps/api/prisma`), Docker/Infra (`apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.prod.yml`, `infra/docker`), CI (`.github/workflows/ci.yml`), testing (unidad, integración API, E2E Playwright), documentación (`docs/`).
- **Fuera de alcance:** modificación de código, migraciones, cambios de permisos, refactors, deployments.
- **Método:** verificación de código fuente real (controllers, services, modules, DTOs, seed de permisos, schema Prisma, rutas de frontend, tests, config). Cada afirmación está respaldada por hallazgos de código.
- **Convención de clasificación:** `COMPLETE`, `BACKEND_COMPLETE`, `FRONTEND_ONLY`, `PARTIAL`, `FOUNDATION_ONLY`, `PLANNED/DOCUMENTED`, `MISSING`, `ENHANCEMENT`.

---

## 3. Repository Inventory

### 3.1 Estructura raíz

| Ruta | Tipo | Descripción |
|---|---|---|
| `apps/api` | Backend NestJS (TypeScript, Prisma, PostgreSQL) | API REST bajo prefijo `/api/v1` |
| `apps/web` | Frontend React 19 + Vite 6 + Tailwind 4 + react-query | SPA |
| `packages/shared` | Paquete TS compartido | Tipos/utilidades |
| `infra/docker` | Compose de desarrollo (Postgres) | Desarrollo local |
| `docker-compose.prod.yml` | Compose de producción local | api + web + postgres |
| `.github/workflows/ci.yml` | CI | lint, typecheck, test, build, e2e |
| `docs/` | Documentación (00–88) | 80+ documentos |
| `scripts/` | Vacío | — |
| `playwright.config.ts` | Config E2E | 2 proyectos (chromium, mobile) |

### 3.2 Aplicaciones

- **API (`@agenda/api`):** NestJS 11, 26 archivos de controller activos + 1 controller no registrado (`follow-up-categories.controller.ts`), 30 módulos registrados en `app.module.ts`.
- **WEB (`@agenda/web`):** React 19, SPA con react-router (createBrowserRouter), ~50 páginas de módulo + 5 raíz.
- **SHARED (`@agenda/shared`):** paquete de tipos compartidos.

### 3.3 Nota de git

- Working tree: `docs/85,86,87,88,89*` y `test-output.txt` sin seguimiento. (Los 85-88 quedaron como untracked aunque existen; el 89 se crea en esta auditoría.)
- **No se realizaron commits ni cambios funcionales en esta auditoría.**

---

## 4. Backend Module Inventory

`apps/api/src/modules/` — 30 módulos registrados en `app.module.ts`.

| Módulo | Controller | Service | DTOs | Module | Estado funcional |
|---|---|---|---|---|---|
| Auth | ✅ | ✅ | ✅ | ✅ | COMPLETE (global) |
| Institutions | ✅ | ✅ | ✅ | ✅ | COMPLETE (plataforma/SUPER_ADMIN) |
| Users | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Memberships | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Students | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Courses | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Subjects | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Grades | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Schedules | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Tasks | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Task Assignments | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Task Submissions | ✅ (2 controllers) | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Communications | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Communication Recipients | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Signature Requests | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Notifications | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| School Grades | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Academic Periods | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Guardians | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Enrollments | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Teacher Assignments | ✅ | ✅ | ✅ | ✅ | COMPLETE (backend) |
| Files | ✅ | ✅ | ✅ (+interfaces/storage) | ✅ | COMPLETE (backend) |
| Agenda | ✅ | ✅ | ✅ | ✅ | COMPLETE (solo lectura) |
| Student Follow-Ups | ✅ | ✅ | ✅ | ✅ | COMPLETE (**release candidate**) |
| Follow-Up Categories | (controller NO registrado) | ✅ | ✅ | — | Servicio usado por StudentFollowUpsController |
| Health | ✅ | — | — | ✅ | COMPLETE (liveness/readiness públicos) |

**Hallazgo:** `follow-up-categories.controller.ts` existe como archivo pero **no se registra** en `student-follow-ups.module.ts` (que solo registra `StudentFollowUpsController`). Las rutas de categorías se sirven correctamente desde `StudentFollowUpsController`. El controller huérfano es deuda técnica (archivo muerto).

---

## 5. API Endpoint Inventory

Prefijo global real: **`/api/v1`** (`app.setGlobalPrefix('api/v1')`). El agente de exploración leyó los 26 controllers completos; inventario consolidado (~120 rutas):

| Método | Ruta (`/api/v1/...`) | Módulo | Permiso | Estado |
|---|---|---|---|---|
| GET | `health`, `health/readiness` | Health | — (público) | ✅ |
| POST | `auth/login`, `auth/refresh`, `auth/logout`, `auth/forgot-password`, `auth/reset-password` | Auth | — (público/throttle) | ✅ |
| GET | `auth/profile`, `auth/institutions`, `auth/tenant`, `auth/my-permissions`, `auth/authorization-check` | Auth | token/permiso | ✅ |
| POST | `auth/tenant/select` | Auth | token | ✅ |
| POST/GET/PATCH | `institutions` (CRUD + deactivate) | Institutions | `institution:*` | ✅ |
| POST/GET/PATCH | `users` (CRUD + deactivate) | Users | `users:*` | ✅ |
| POST/GET/PATCH/DELETE | `institutions/:institutionId/memberships/...` (7 rutas) | Memberships | `memberships:*` | ✅ |
| POST/GET/PATCH | `students` (CRUD + deactivate) | Students | `students:*` | ✅ |
| POST/GET/PATCH | `courses` (CRUD + deactivate) | Courses | `courses:*` | ✅ |
| POST/GET/PATCH | `subjects` (CRUD + deactivate) | Subjects | `subjects:*` | ✅ |
| POST/GET/PATCH | `grades` (CRUD + deactivate) | Grades | `grades:*` | ✅ |
| POST/GET/PATCH | `schedules` (CRUD + deactivate) | Schedules | `schedules:*` | ✅ |
| POST/GET/PATCH | `tasks` (CRUD + publish + close + deactivate + attachments ×3) | Tasks | `tasks:*` | ✅ |
| POST/GET/PATCH | `task-assignments` (CRUD + deactivate) | TaskAssignments | `tasks:*` | ✅ |
| POST/GET/PATCH | `task-assignments/:id/submission` | TaskSubmissions | `tasks:read` | ✅ |
| PATCH | `submissions/:id/grade` | TaskSubmissions | `grades:manage` | ✅ |
| POST/GET/PATCH | `communications` (CRUD + publish + deactivate + attachments ×3) | Communications | `communications:*` | ✅ |
| GET/PATCH | `communication-recipients` (+ unread-count, mark-all-read, :id/read) | CommRecipients | `communications:read` | ✅ |
| POST/GET/PATCH | `signature-requests` (CRUD + publish + sign + decline + deactivate) | Signatures | `signatures:*` | ✅ |
| POST/GET/PATCH/DELETE | `notifications` (CRUD + mark read/all + delete/all) | Notifications | `notifications:*` | ✅ |
| POST/GET/PATCH | `school-grades` (CRUD + deactivate) | SchoolGrades | `school-grades:*` | ✅ |
| POST/GET/PATCH | `academic-periods` (CRUD + deactivate) | AcademicPeriods | `academic-periods:*` | ✅ |
| POST/GET/DELETE | `guardians/students/:studentId` (link/unlink/list) | Guardians | `guardians:*` | ✅ |
| POST/GET/PATCH | `enrollments` (CRUD + deactivate) | Enrollments | `enrollments:*` | ✅ |
| POST/GET/PATCH | `teacher-assignments` (CRUD + deactivate) | TeacherAssignments | `teacher-assignments:*` | ✅ |
| POST/GET/DELETE | `files` (upload/download/delete) | Files | `files:*` | ✅ |
| GET | `agenda` (agregado por rango de fechas) | Agenda | `agenda:read` | ✅ |
| POST/GET/PATCH/DELETE | `student-follow-ups/...` (categorías + CRUD + close/escalate/follow-up/resolve/reopen + entries + commitments + attachments) ~27 rutas | StudentFollowUps | `student-follow-ups:*` | ✅ |

### 5.1 Hallazgos de endpoints

1. **No existe `@Public()`** en el código. Los endpoints "públicos" lo son solo por no declarar guards (health) o por usar solo `@Throttle`/`AccessTokenGuard` sin permiso (auth). Es un riesgo de diseño/baja claridad.
2. **`institutions` no está aislado por tenant** (service con 0 usos de `institutionId`). Es cross-tenant por diseño (SUPER_ADMIN), pero `GET /institutions` usa `institution:read` (que INSTITUTION_ADMIN también tiene) — un INSTITUTION_ADMIN podría listar *todas* las instituciones. **Posible IDOR/fuga de catálogo de instituciones.**
3. **Memberships:** el `:institutionId` de la URL se ignora en favor de `req.tenant.institutionId` (parametría redundante/confusa).
4. **Task Submissions usa dos controllers** sobre rutas base distintas (`task-assignments/:id/submission` y `submissions/:id/grade`) con permisos de otros dominios (`tasks:read`, `grades:manage`). Coherente en uso pero conceptualmente mezclado.
5. **No hay endpoints de** dashboard/stats agregado, reportes, exports (CSV/PDF/Excel), cierre de periodo, asistencia, calendario de eventos (crear).

---

## 6. Frontend Inventory

`apps/web/src/` — React 19 + Vite + react-router v7 + react-query v5 + Tailwind 4. Cliente HTTP propio con `fetch`.

### 6.1 Rutas (createBrowserRouter, `src/app/router.tsx`)

**Públicas (AuthLayout):** `/login`, `/unauthorized`, `*` (NotFound).
**Protegidas (ProtectedRoute + AppLayout):**
- `/`, `/select-institution`, `/dashboard`, `/agenda`
- `/students` (+ `/new`, `/:id`, `/:id/edit`) — form gated por `STUDENTS_MANAGE`
- `/courses` (+ new/:id/edit)
- `/subjects` (+ new/:id/edit)
- `/grades` (+ new/:id/edit)
- `/schedules` (+ new/:id/edit)
- `/tasks` (+ new/:id/edit)
- `/task-assignments` (+ new/:id)
- `/task-submissions` (+ `/:id`, `/:id/new`)
- `/communications` (+ new/:id/edit), `/communication-inbox`
- `/signatures` (+ new/:id/edit)
- `/notifications` (+ `/:id`)
- `/academic-periods` (+ new/:id/edit)
- `/school-grades` (+ new/:id/edit)
- `/guardians` (+ /new)
- `/enrollments` (+ new/:id)
- `/teacher-assignments` (+ new/:id)
- `/student-follow-ups` (+ new/:id/edit/categories) — form gated por `STUDENT_FOLLOW_UPS_CREATE`

### 6.2 Navegación (Sidebar)

Filtrada **100% por permiso** (no por rol): dashboard, agenda, students, courses, subjects, grades, schedules, tasks, task-assignments (TASKS_READ), task-submissions (TASKS_READ), communications, communication-inbox, signatures, notifications, academic-periods, school-grades, guardians, enrollments, teacher-assignments, student-follow-ups, categories.

### 6.3 Estado por módulo (frontend)

| Módulo | Frontend | Integración API | UX | Estado |
|---|---|---|---|---|
| Auth/Login | ✅ | ✅ | ✅ | COMPLETE |
| Students | ✅ | ✅ | ✅ | COMPLETE |
| Courses | ✅ | ✅ | ✅ | COMPLETE |
| Subjects | ✅ | ✅ | ✅ | COMPLETE |
| Grades | ✅ | ✅ | ✅ | COMPLETE |
| Schedules | ✅ | ✅ | ✅ | COMPLETE |
| Tasks | ✅ | ✅ | ✅ | COMPLETE |
| Task Assignments | ✅ | ✅ | ✅ | COMPLETE |
| Task Submissions | ✅ | ✅ | ✅ | COMPLETE |
| Communications | ✅ | ✅ | ✅ | COMPLETE |
| Communication Inbox | ✅ | ✅ | ✅ | COMPLETE |
| Signatures | ✅ | ✅ | ⚠️ (UUIDs crudos en textarea) | PARTIAL UX |
| Notifications | ✅ | ✅ | ✅ | COMPLETE |
| Academic Periods | ✅ | ✅ | ✅ | COMPLETE |
| School Grades | ✅ | ✅ | ✅ | COMPLETE |
| Guardians | ✅ | ✅ | ⚠️ (UUID crudo) | PARTIAL UX |
| Enrollments | ✅ | ✅ | ✅ | COMPLETE |
| Teacher Assignments | ✅ | ✅ | ✅ | COMPLETE |
| Student Follow-Ups | ✅ (26 hooks, 4 páginas) | ✅ | ✅ | COMPLETE (benchmark) |
| Agenda | ✅ (calendario solo lectura) | ✅ | ✅ | COMPLETE (solo lectura) |
| Dashboard | ✅ (KPIs cliente-side) | ✅ | ✅ | COMPLETE |
| Files | ✅ (adjuntos embebidos) | ✅ | ✅ | COMPLETE (subcomponentes) |
| Children (selector PARENT) | ✅ | ✅ | ✅ | COMPLETE |
| **Users** | ❌ (solo hook lectura `useUsers`) | parcial | — | MISSING UI (backend ok) |
| **Memberships** | ❌ (solo en tipos) | — | — | MISSING UI |
| **Institutions** | ❌ (solo selector post-login) | — | — | MISSING UI |
| **Roles** | ❌ (solo constantes) | — | — | MISSING UI |
| **Audit** | ❌ (solo permiso) | — | — | MISSING UI |

### 6.4 Seguridad de tokens

- Access/refresh token en **sessionStorage** (`agenda_access_token`, `agenda_refresh_token`, `agenda_institution_id`) + token en memoria del apiClient.
- Header de tenant **`X-Institution-Id`** inyectado tras `POST /auth/tenant/select`.

---

## 7. Prisma Domain Inventory

`schema.prisma` (1030 líneas) — **33 modelos**, 22 enums, PostgreSQL.

### 7.1 Modelos

`Institution`, `User`, `UserInstitution` (Membership), `Role`, `Permission`, `RolePermission`, `UserRole`, `GlobalUserRole`, `AuditLog`, `RefreshToken`, `PasswordResetToken`, `Student`, `Course`, `Subject`, `Grade`, `Schedule`, `Task`, `TaskAssignment`, `TaskSubmission`, `Communication`, `CommunicationRecipient`, `CommunicationAttachment`, `SignatureRequest`, `SignatureRecipient`, `Notification`, `SchoolGrade`, `AcademicPeriod`, `Enrollment`, `TeacherAssignment`, `GuardianStudent`, `FileAsset`, `TaskAttachment`, `StudentFollowUp`, `FollowUpEntry`, `Commitment`, `FollowUpCategory`, `FollowUpAttachment`.

### 7.2 Enums clave

`RoleType`, `UserStatus`, `InstitutionStatus`, `MembershipStatus`, `StudentStatus`, `GradeStatus`, `TaskStatus` (DRAFT/PUBLISHED/CLOSED/INACTIVE), `CommunicationAudience` (ALL/TEACHERS/PARENTS/STUDENTS), `SignatureRequestStatus`, `SignatureRecipientStatus`, `NotificationType` (+ STUDENT_FOLLOW_UP, COMMITMENT_UPDATE), `EnrollmentStatus`, `TeacherAssignmentStatus`, `TaskAssignmentStatus`, `TaskSubmissionStatus`, `CommunicationRecipientStatus`, `FileAssetStatus`, **`FollowUpType`, `FollowUpSeverity`, `FollowUpStatus`, `FollowUpConfidentiality`, `FollowUpEntryType`, `CommitmentStatus`, `CommitmentResponsibleRole`** (Observador).

### 7.3 Observaciones de diseño

- **Multi-tenancy fuerte**: TODOS los modelos de dominio tienen `institutionId` + `@@index([institutionId*])`. 
- `createdById`/`updatedById`/`deletedById` **solo están en el dominio del Observador** (`StudentFollowUp.createdById`, `FollowUpEntry.createdById`, `FileAsset.uploadedByUserId`). El resto de módulos (courses, subjects, grades, tasks, etc.) **no registran quién creó/modificó** — solo AuditLog puede trazarlo, y AuditLog no cubre todos los cambios.
- `onDelete: Restrict` (mayoría) evita deletes en cascada peligrosos; `Cascade` solo en membership/roles. Buen diseño defensivo.
- Índices compuestos con `institutionId` como primer campo en todos los modelos de dominio → buen soporte de tenant isolation.
- **NO existe** modelo `Event`, `CalendarEntry`, `Attendance`, `Absence`, `Justification`, `EnrollmentReport`, `Gradebook`, `Bulletin`.

---

## 8. Domain Map

```
Institution (tenant)
├── UserInstitution (Membership) ─ USER (identidad global)
│     └── UserRole ─ Role ─ RolePermission ─ Permission
├── GlobalUserRole (SUPER_ADMIN) ─ Role
├── AuditLog, RefreshToken, PasswordResetToken
├── SchoolGrade ← Enrollment → Course ─ Schedule → Subject
├── AcademicPeriod ← Enrollment, TeacherAssignment
├── Student ← Enrollment → Course
│     ├── Grade (Student×Course×Subject×Period)
│     ├── GuardianStudent ─ User (PARENT)
│     ├── TaskAssignment ─ Task ─ TaskSubmission
│     └── StudentFollowUp → FollowUpEntry / Commitment / FollowUpAttachment / FollowUpCategory
├── Task ─ TaskAttachment
├── Communication ─ CommunicationRecipient / CommunicationAttachment
├── SignatureRequest ─ SignatureRecipient
├── Notification
└── FileAsset
```

**Relaciones de negocio clave:**
- **Quién enseña a quién:** `TeacherAssignment` (User×Course×Subject×AcademicPeriod) — empower TEACHER para course/subject.
- **Quién evalúa a quién:** `Grade` (Student×Course×Subject). **Nota:** `Grade.period` es un `String` libre, no una FK a `AcademicPeriod` → **no hay vinculación real ni consistencia de periodo** ni consolidación posible (bloquea reportes/boletín).
- **Quién se comunica con quién:** `Communication.audience` + `CommunicationRecipient` (bulk).
- **Quién ve qué (padre):** vía `GuardianStudent` + filtrado en services (students, grades, tasks, agenda, follow-ups).

---

## 9. Roles and Permissions

### 9.1 Roles (seed)
- **SUPER_ADMIN** (GLOBAL): 63 permisos (ALL_PERMISSIONS).
- **INSTITUTION_ADMIN** (TEMPLATE): 63 permisos (todas las operativas).
- **TEACHER** (TEMPLATE): ~38 permisos (CRUD de courses/subjects/grades/tasks/follow-ups; lee students, etc.).
- **PARENT** (TEMPLATE): ~17 permisos (solo lectura + signatures:sign, communications:create).
- **STUDENT** (TEMPLATE): ~12 permisos (solo lectura + tasks:update).

Nota: el seed actual asigna permisos *template* y *tenant* de la Demo School. La lógica de versión imprime "32 permisos" para SUPER_ADMIN pero el array es de 63 — el mensaje de log está desactualizado (cosmético, no funcional).

### 9.2 Matriz de acceso por Módulo

| Módulo | ADMIN | TEACHER | PARENT | STUDENT | SUPER_ADMIN |
|---|---|---|---|---|---|
| Institutions | ⚠️ read | ❌ | ❌ | ❌ | ✅ |
| Users | ✅ | ❌ | ❌ | ❌ | ✅ |
| Memberships | ✅ | ❌ | ❌ | ❌ | ✅ |
| Students | ✅ | ⚠️ read | ⚠️ read (hijos) | ⚠️ (perfil) | ✅ |
| Courses | ✅ | ⚠️ read | ❌ | ❌ | ✅ |
| Subjects | ✅ | ⚠️ read | ❌ | ❌ | ✅ |
| Grades | ✅ | ✅ CRUD | ⚠️ read (hijos) | ⚠️ read | ✅ |
| Schedules | ✅ | ⚠️ read | ⚠️ read | ⚠️ read | ✅ |
| Tasks | ✅ | ✅ CRUD | ⚠️ read | ⚠️ read/update | ✅ |
| Task Assignments | ✅ | ✅ | ⚠️ read | ⚠️ read | ✅ |
| Task Submissions | ✅ | ✅ grade | ⚠️ read | ✅ submit | ✅ |
| Communications | ✅ | ✅ create | ⚠️ read/create | ⚠️ read | ✅ |
| Signatures | ✅ | ⚠️ read/sign | ⚠️ read/sign | ❌ | ✅ |
| Notifications | ✅ | ⚠️ read | ⚠️ read | ⚠️ read | ✅ |
| School Grades / Periods | ✅ | ⚠️ read | ⚠️ read | ⚠️ read | ✅ |
| Guardians | ✅ | ❌ | ⚠️ read | ❌ | ✅ |
| Enrollments | ✅ | ⚠️ read | ⚠️ read | ⚠️ read | ✅ |
| Teacher Assignments | ✅ | ⚠️ read | ❌ | ❌ | ✅ |
| Files | ✅ | ✅ | ⚠️ read | ⚠️ read | ✅ |
| Agenda | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Observador** | ✅ | ✅ (no categories) | ⚠️ read | ⚠️ read (confidentiality) | ✅ |
| Audit | ✅ | ❌ | ❌ | ❌ | ✅ |

### 9.3 Hallazgos RBAC
- **Permisos seeded pero sin endpoint/UI:** `audit:read`, `roles:read`, `roles:manage`, `memberships:*` (UI ausente), `notifications:manage` (los endpoints de notif usan `notifications:read`).
- **Endpoints sin permiso claro:** la mayoría de `GET` de entidades se protegen solo por READ, pero los services hacen scoping por rol (padre/profesor) dentro del servicio — la autorización a nivel recurso es **desigual** según módulo (fuerte en students/grades/tasks/agenda/follow-ups; ausente/simple en el resto por ser puramente institucionales).
- **Permisos no usados en la UI:** se filtran por `hasPermission` en la mayor parte; solo 3 `PermissionGate` (Agenda, StudentForm, FollowUpForm). Coherente aunque con menos barreras a nivel de ruta que de componente.
- **`STUDENT` no puede** ver signature requests ni comunicaciones dentro de la bandeja de forma plena según permisos (solo read). Coherente con lectura.

---

## 10. Multi-Tenancy Audit

**Mecanismo:** `TenantContextGuard` lee header `X-Institution-Id`, valida membresía (`validateTenantAccess`), fija `req.tenant = { institutionId, userInstitutionId }`. Controllers pasan `institutionId` a services; estos filtran TODAS las queries por `institutionId`.

| Área | Estado |
|---|---|
| Students | STRONG |
| Guardians | STRONG |
| Courses | STRONG |
| Subjects | STRONG |
| Grades | STRONG |
| Schedules | STRONG |
| Tasks | STRONG |
| Communications | STRONG |
| Notifications | STRONG |
| Signatures | STRONG |
| Enrollments | STRONG |
| Teacher Assignments | STRONG |
| Files | STRONG |
| Agenda | STRONG |
| Student Follow-Ups | STRONG (aislamiento + confidentiality) |
| Institutions | **RISK** (cross-tenant, 0 usos de institutionId; `institution:read` alcanzable por admin) |
| Memberships | STRONG |

**Nota:** `CommunicationAudience` y los `teacherAssignment`/`enrollment` se filtran por institutionId en queries, y los services de padre/profesor añaden scoping por usuario. El enfoque es **consistente y robusto**; el único punto débil real es el módulo Institutions.

---

## 11. Security Audit

| Tema | Implementación | Clasificación |
|---|---|---|
| Password hashing | argon2id (memoryCost 65536, t=3, p=4) | GOOD |
| JWT access | corto (15m por defecto) | GOOD |
| Refresh tokens | persistidos hasheados (`tokenHash`), revocables | GOOD |
| Password reset | token hasheado, expiración, one-time | GOOD |
| Throttling | ThrottlerGlobal (50/60s), auth específicos (login 50/60s, refresh 20/60s, recover 100/h) | GOOD |
| Helmet | vía SecurityModule (crossOriginEmbedderPolicy off) | GOOD |
| CORS | limitado a `CORS_ORIGIN` (lista), credentials true | ADEQUATE |
| Validation | ValidationPipe whitelist+transform+forbidNonWhitelisted | GOOD |
| Request ID | RequestIdMiddleware (X-Request-Id) | GOOD |
| Error handling | AllExceptionsFilter + LoggingInterceptor | GOOD |
| File uploads | máximo 10MB, límites por adjunto, storage local + checksum, validación mime en parte | ADEQUATE (sin antivirus/CDN) |
| SQL/Prisma injection | Prisma parametrizado | GOOD |
| IDOR/BOLA | débil en `institutions` (ver multitenancy); el resto scoped | **HIGH (institutions)** |
| Privilege escalation | RBAC por permisos, scoping por usuario en services | GOOD |
| `@Public()` | inexistente — "público" implícito por ausencia de guard | MEDIUM (claridad) |
| Secretos | `.env` no commiteado; `JWT_ACCESS_SECRET` dev-only en .env.example | GOOD dev / según prod |
| Super Admin | GLOBAL role con todos permisos, flujo separado | GOOD |
| CORS origin en prod | "warn sin CORS" si no se configura | MEDIUM (riesgo de configuración) |

**Vulnerabilidades reales identificadas (sin inventar):**
- **HIGH — IDOR de catálogo de instituciones:** `GET /institutions` requiere `institution:read` (que un INSTITUTION_ADMIN posee) y no filtra. Un admin institucional puede enumerar todas las instituciones del SaaS.
- **MEDIUM — Estrategia de "público" implícito:** la ausencia de `@Public()` hace frágil el modelo; si alguien agrega `PermissionGuard` globalmente rompería health/login, y hoy la seguridad de eso depende de recordar NO poner guard en auth/health.
- **MEDIUM — CORS sin restricción en prod por defecto** y DTOs de recursos institucionales que aceptan `institutionId` no verificados contra el tenant en algunos casos (aunque los services lo sobrescriben).

---

## 12. End-to-End Functional Flows

### FLUJO 1 — Alta institucional (Institution→Admin→Users→Roles)
✅ **Backend COMPLETO** (Institutions, Users, Memberships, Roles, Permissions). ❌ **Frontend MISSING** (no hay UI de alta institucional ni gestión de usuarios/roles/instituciones). En la práctica, un colegio **no puede auto-configurarse desde la UI**; solo desde API/seed.

### FLUJO 2 — Configuración académica (Period→SchoolGrade→Course→Subject→TeacherAssignment)
✅ **COMPLETO end-to-end** (backend + frontend CRUD completo en todos). Bien cerrado a nivel administrativo.

### FLUJO 3 — Matrícula (Student→Guardian→Enrollment→Course→Period)
✅ **BACKEND COMPLETO + Frontend COMPLETO** (CRUD). ⚠️ **No está cerrado el encadenamiento**: la matrícula no genera automáticamente taskAssignments ni horarios/calificaciones por curso; se crean manualmente.

### FLUJO 4 — Docente (Teacher→Course→Subject→Students→Schedule)
⚠️ **PARTIAL.** El docente ve courses/subjects (read) y schedules (read) y califica, pero **no tiene dashboard docente dedicado** ni vista de "mis cursos → mis estudiantes" consolidada; depende de navegar a cada módulo.

### FLUJO 5 — Evaluación (Teacher→Student→Subject→Grade→Period→Result)
⚠️ **PARTIAL/critical gap.** Existe CRUD de `Grade` (backend+frontend). **FALTA:** vincular `Grade` a `AcademicPeriod` (es un `String period` libre), cierre de periodo, consolidación, promedio, boletín, reporte, exportación.

### FLUJO 6 — Tareas (Teacher→Task→Student→Submission→Status)
✅ **COMPLETO end-to-end** (Task CRUD + publish/close + attachments + assignments + submissions + grading con feedback). Es el segundo flujo mejor cerrado después del Observador.

### FLUJO 7 — Comunicación (Admin/Teacher→Communication→Recipient→Notification→Read)
✅ **COMPLETO** (CRUD + publish + audience + recipients + read tracking + bandeja).

### FLUJO 8 — Observador (Student→FollowUp→Entry→Commitment→Notification→Lifecycle→Close)
✅ **COMPLETO — RELEASE CANDIDATE** (`v1.0.2-rc.1`). Benchmark de madurez: tipo/severidad/confidencialidad, lifecycle (open→in_progress→escalated→resolved→closed, reopen), entries timeline, commitments con responsable/vencimiento/overdue, attachments, categorías, notificaciones, stats, resource authorization con confidentiality tiers.

### FLUJO 9 — Firma (Document→Request→Recipient→Signature→Completed/Declined)
✅ **COMPLETO** (request + publish + recipients + sign/decline). UX débil (destinatarios por UUID crudo).

---

## 13. Role Experience Audit

- **ADMIN:** puede administrar casi todo (institution/usuarios/roles — la mayoría **solo backend**; students/courses/subjects/grades/schedules/tasks/communications/signatures/notifications/periods/school-grades/guardians/enrollments/teacher-assignments/observador/reportes-NO). Sin UI de alts institucional.
- **TEACHER:** dashboard genérico (no docente dedicado), courses/subjects read, students read, grades/tasks CRUD, comms create, observador completo, agenda. Sin reportes.
- **PARENT:** hijos (via selector), calificaciones/tareas/horarios/comunicaciones/notificaciones/observador **solo lectura** de sus hijos vinculados; firma; agenda. Bien cubierto en lectura.
- **STUDENT:** horario/tareas/entregas/calificaciones/comunicaciones/notificaciones/agenda **solo lectura** (más submit). Observador solo lectura (con confidentiality). Bien cubierto.

---

## 14. Dashboards

- **Dashboard general (`/dashboard`):** ✅ funciona, permisos-aware. KPIs (students, courses, subjects, tasks, enrollments, signatures, communications) **obtenidos vía counts de listados** (`?limit=1` → `meta.total`), no de un endpoint agregado. Tareas/notificaciones/firmas pendientes "recientes" (listados). Enlaces rápidos.
- **No hay dashboards por rol dedicados** (no hay dashboard docente/padre/estudiante especializado).
- **No hay analytics/gráficas.**

---

## 15. Reports

| Reporte | Estado |
|---|---|
| Boletín académico | ❌ MISSING |
| Consolidación de notas | ❌ MISSING |
| Reporte de estudiantes | ⚠️ igual a listado con filtros |
| Reporte de asistencia | ❌ MISSING (no hay asistencia) |
| Reporte de observador | ⚠️ stats simples + listado; sin PDF |
| Reporte de compromisos | ❌ MISSING |
| Exportación CSV/Excel | ❌ MISSING |
| PDF / impresión | ❌ MISSING |
| HTTP endpoints de reporte | ❌ MISSING (sin `/reports`, `/exports`) |

---

## 16. Attendance

**MISSING — POTENTIAL CORE SCHOOL MODULE.**

No existe en todo el repositorio (ni modelo Prisma `Attendance`/`Absence`, ni controller/service, ni ruta frontend, ni permiso, ni documento 00-88 dedicado). La asistencia es una funcionalidad **central** para la operación diaria de un colegio y **no está implementada en absoluto**.

---

## 17. Calendar / Agenda

Contradicción de producto: un producto llamado "Agenda Escolar" tiene un módulo `Agenda` que es **solo un agregador de solo lectura** (tareas, horarios, comunicaciones, firmas) por rango de fechas (`GET /agenda`), con vista día/semana/mes en frontend. **No permite crear eventos propios** (exámenes, reuniones, actividades institucionales, recordatorios), y **no existe modelo `CalendarEntry`/`Event`**.

**Estado: PARTIAL (solo lectura agregada; sin creación de eventos).** Para el nombre del producto esto es un gap importante.

---

## 18. Documents / Files

- Existe infraestructura de **`FileAsset`** (upload/download/delete, checksum, storage local, límites) y anexos embebidos en Tareas, Comunicaciones y Observador.
- **NO existe** una verdadera "gestión documental" (repositorio institucional, categorías de documentos, permisos por carpeta, búsqueda, MIME/antivirus, almacenamiento en la nube - solo local `./storage`).

**Estado: BACKEND infraestructura COMPLETA; función de "biblioteca/repositorio de documentos" MISSING.**

---

## 19. Institutional Configuration

- **Puede configurar ADMIN:** school grades, academic periods, courses, subjects, schedules, teacher assignments, enrollments, students, guardians, follow-up categories. ✅
- **NO puede configurar:** logo, datos institucionales (solo name/slug/status), escala de calificación (no existe), año académico global unificado, parámetros por institución.
- **Institution:** backend CRUD pero sin UI (solo SUPER_ADMIN vía API).

**Estado: PARTIAL.** Configuración académica operativa completa; configuración institucional/marca/parámetros ausente.

---

## 20. Notifications

- **Record:`** hay modelo `Notification` + endpoints + trigger en algunos módulos (signature, task update, communication, follow-ups, commitments), con unread/read/mark-all/delete en UI + badge en Topbar.
- **Sin embargo:** es **solo in-app, sin canales reales** (sin email real, sin push; el proveedor de email es `dev-email.provider.ts` = dummy de desarrollo). No hay polling ni real-time (websocket/SSE) — el frontend usa react-query con staleTime.
- **Trigger coverage:** el Observador genera notificaciones (STUDENT_FOLLOW_UP, COMMITMENT_UPDATE) y signatures/communications/tasks las generan. **No todos los módulos** generan notificaciones (ej. nueva matrícula, nuevo estudiante, nuevo horario no notifican).

**Estado: PARTIAL.** In-app completo; multicanal (email/push) y cobertura de triggers MISSING.

---

## 21. Audit / Traceability

- **AuditLog** existe (userId, institutionId, action, entityType, entityId, old/newValues, ip, createdAt).
- **Cobertura:** usada principalmente por el **Observador** (que audita lifecycle) y auth. **La mayoría de los módulos CRUD NO escriben AuditLog** de forma sistemática.
- `createdById/updatedById` solo existen en el dominio del Observador y en FileAsset.uploadedByUserId.
- **API de lectura de audit:** existe permiso `audit:read` pero **no hay endpoint ni UI** para consultar el log.

**Estado: PARTIAL (cobertura baja, sin UI de consulta).**

---

## 22. Testing

### Backend unitario (Jest, mockean Prisma)
- **36** spec files, **~641** tests. Cubren todos los services.
- **Sin unit tests de controllers** (excepto health).

### API e2e / integración (Jest + supertest, con DB real)
- **25** archivos e2e-spec.ts, **~553** tests (auth, rbac, tenant-context, todos los módulos, openapi).
- ⚠️ **NO se ejecutan en CI** (`ci.yml` solo corre `npm test` = unit). El `test:e2e` del API queda fuera.

### Frontend unitario (Vitest)
- **55** archivos de test (infraestructura + casi todos los módulos + Partial del Observador).

### E2E Playwright
- **14** spec files, **111** tests (auth, navigation, dashboard, agenda, tasks, comms, signatures, notifications, files, multi-tenancy, rbac, responsive, accessibility, academic-flow).
- ⚠️ **El Observador del Alumno NO tiene cobertura Playwright ni integración API dedicada** — es el módulo más maduro y, paradójicamente, uno de los menos cubiertos en E2E.

### Resumen

| Suite | Archivos | Tests | En CI |
|---|---|---|---|
| API unit | 36 | ~641 | ✅ |
| API e2e (integración real) | 25 | ~553 | ❌ |
| Web unit (Vitest) | 55 | — | ✅ |
| Playwright E2E | 14 | ~111 | ✅ |
| Observador E2E | 0 | 0 | ❌ |

**Testing status: ADEQUATE-PARTIAL.** Amplio en unit e integración, pero integración API fuera de CI y sin E2E/CI del módulo estrella.

---

## 23. CI/CD

- **CI:** ✅ lint, typecheck, test (unit), build, e2e Playwright (contra dev servers). Gated secuencialmente.
- **Faltan en CI:** integración API (`test:e2e`), **Docker build** de las imágenes, deploy, staging, secrets de prod, rollback.
- **CD:** ❌ **No existe.** No hay deploy a ninguna nube ni script de release. El `docker-compose.prod.yml` y `Dockerfile`s existen pero **no se construyen ni despliegan en ningún pipeline**.

**Estado: CI PARTIAL (unit+E2E ok, sin integración API ni Docker build); CD MISSING.**

---

## 24. Infrastructure

- **Desarrollo:** docker-compose de Postgres + `npm run dev:*`. ✅
- **Staging/Producción:** `docker-compose.prod.yml` con postgres+api+web, volumes nombrados, healthchecks, nginx como proxy inverso + SPA fallback. ✅ (local, listo para levantar)
- **NO hay:** Redis, storage en la nube (solo local `./storage`), dominio, TLS/HTTPS por defecto en nginx (no configurado), monitoring/logging agregado, backups automatizados.
- **Cloud readiness en 86-88 docs** describe preparación, pero **no hay infraestructura cloud real desplegada** en el repositorio.

**Estado: DESARROLLO ✅ / PRODUCCIÓN LOCAL ✅ / CLOUD 🚫 (documentado, no desplegado).**

---

## 25. UX / Product Readiness

| Aspecto | Estado |
|---|---|
| Navegación/sidebar | GOOD |
| Consistencia | GOOD |
| Formularios validación | ADEQUATE (signatures/guardians usan UUIDs crudos) |
| Loading/empty/error | GOOD |
| Responsive | GOOD (validado, pasa responsive + accessibility WCAG AA) |
| Accesibilidad | GOOD (axe + accessibility.spec) |
| Búsqueda/filtros | ADEQUATE (filtros básicos por listado) |
| Paginación | ADEQUATE (limit/meta; count por `limit=1`) |
| Acciones destructivas/confirmaciones | ADEQUATE |
| Dashboard | ADEQUATE (no por rol, sin charts) |

**Estado general: GOOD** para el conjunto de funcionalidades existentes; con parches de UX (UUIDs, dashboard por rol).

---

## 26. Master Gap Analysis

| ID | Área | Gap | Severidad | Impacto |
|---|---|---|---|---|
| G1 | Asistencia | No existe módulo de asistencia/ausencias/justificaciones | **BLOCKER** (para operación real) | Colegio no puede operar |
| G2 | Reportes/Boletines | No hay boletín, consolidación, exportación | **BLOCKER** | No hay salida académica |
| G3 | Cierre/Periodo Académico | `Grade` no vinculada a `AcademicPeriod`; sin cierre/consolidación | **CRITICAL** | Boceto sin ciclo académico |
| G4 | Alta institucional (UI) | Sin UI de users/roles/institutions/memberships | **CRITICAL** | Colegio no se auto-configura |
| G5 | Agenda/Calendario creación | Solo lectura; sin eventos propios | **HIGH** | Nombre del producto |
| G6 | Dashboard por rol | Solo dashboard genérico | **HIGH** | Experiencia por actor débil |
| G7 | Notificaciones multicanal | In-app only; sin email/push real | **HIGH** | Comunicación incompleta |
| G8 | Auditoría full | Cobertura parcial; sin UI consulta | **MEDIUM** | Trazabilidad |
| G9 | Config institucional/marca | Sin logo/parámetros/escala | **MEDIUM** | Personalización |
| G10 | CD / Nube | Sin deploy, sin Docker build en CI | **HIGH** | No producible |
| G11 | Integración API en CI | 553 tests fuera de CI | **HIGH** | Calidad |
| G12 | IDOR instituciones | `GET /institutions` alcanzable | **HIGH** | Seguridad |
| G13 | UX UUIDs (signatures/guardians) | Formularios con UUIDs crudos | **LOW** | Usabilidad |
| G14 | E2E Observador | Sin E2E del módulo estrella | **MEDIUM** | Confianza |
| G15 | Reporte observador | stats simple; sin PDF | **LOW** | Analítica |

---

## 27. MVP Definition (para un colegio real)

### MUST HAVE (piloto)
1. Alta institucional desde UI (usuarios, roles, admin).
2. Configuración académica (periodos, grados, cursos, asignaturas) — ⚠️ ya existe.
3. Matrícula + estudiantes + acudientes — ⚠️ ya existe (falta encadenar).
4. **Calificaciones con cierre de periodo** + consolidación + **boletín/reporte** (exportable).
5. **Asistencia** (marcar, consultar, reporte). — 🔴 NO existe.
6. Tareas + entregas + comunicación — ⚠️ ya existe.
7. **Agenda/Calendario con creación de eventos** (exámenes, reuniones, actividades).
8. Roles: acceso correcto de admin/docente/padre/estudiante.

### SHOULD HAVE
9. Notificaciones con email real.
10. Dashboard por rol (docente/padre).
11. Audit UI.
12. Config institucional (logo, escala de calificación).

### COULD HAVE
13. Firma digital end-to-end pulida (sin UUIDs).
14. Observador con reporte PDF.
15. Reportes de observador y compromisos.

### FUTURE
16. App móvil, IA, gamificación, marketplace, BI avanzado, integraciones.

---

## 28. Product Completeness Matrix

| Módulo | Backend | Frontend | DB | RBAC | Tenant | Tests | E2E | UX | E2E Flow | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| Auth | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Institutions | ✅ | ❌ | ✅ | ✅ | ⚠️ | ✅ | ✅ | — | ⚠️ | PARTIAL |
| Users | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ⚠️ | PARTIAL |
| Memberships | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ⚠️ | PARTIAL |
| Students | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Courses | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Subjects | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Grades | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | PARTIAL (sin cierre) |
| Schedules | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Task Assignments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Task Submissions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Communications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Comm Recipients | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | COMPLETE |
| Signatures | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | COMPLETE (UX⚠️) |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE (in-app) |
| School Grades | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Academic Periods | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Guardians | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | COMPLETE (UX⚠️) |
| Enrollments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | COMPLETE |
| Teacher Assignments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Files | ✅ | (embebido) | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | COMPLETE |
| Agenda | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | PARTIAL (solo lectura) |
| Observador | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | COMPLETE (**RC**) |
| Dashboard | (counts) | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE (genérico) |
| Audit | ⚠️ | ❌ | ✅ | ✅ | ✅ | ⚠️ | ❌ | — | ❌ | PARTIAL |
| **Attendance** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| **Reports** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| **Calendar Entries** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **MISSING** |

---

## 29. Product Maturity Score

**Metodología** (ponderación del prompt, evaluación conservadora basada en evidencia):

| Dimensión | Peso | Evaluación | Puntos |
|---|---|---|---|
| Domain/Backend | 20% | Muy completo (todos los CRUD + auth + RBAC + tenancy); faltan asistencia/reportes/cierre periodo | 15/20 |
| Frontend | 15% | CRUD completo casi todos los módulos; faltan users/institutions/reports/attendance/alts | 10/15 |
| End-to-End Flows | 20% | Sólo tareas, comunicaciones, observador cerrados E2E; faltan matrícula-encadenada, evaluación-cierre, asistencia | 9/20 |
| Security/Authz | 15% | Excelente base (argon2, RBAC, tenancy, resource auth en Observador); IDOR en institutions, no `@Public` | 11/15 |
| Testing | 10% | Amplio (641 unit + 553 int + 55 vit + 111 pw); integración API fuera de CI, sin E2E observador | 6/10 |
| UX/Product | 10% | GOOD general; UX parches (UUIDs), dashboards por rol | 6/10 |
| Reporting/Analytics | 5% | Casi nulo (sin boletín/reportes/export) | 0.5/5 |
| Infra/Deploy | 5% | Dev✅, Prod local✅, CI parcial (sin Docker/deploy), Cloud🚫 | 2/5 |

```
PRODUCT MATURITY SCORE = (15+10+9+11+6+6+0.5+2) = 59.5 / 100 ≈ 60%
```

- **MVP READINESS (para colegio real): MEDIUM** (~55%). Faltan asistencia, reportes/boletín, cierre de periodo, alta institucional UI, agenda con eventos.
- **PRODUCTION READINESS: LOW-MEDIUM.** Necesita cerrar gaps G1–G6, G10–G11.
- **CLOUD READINESS: LOW.** Documentado (docs 86-88) pero sin despliegue, sin CI Docker/deploy, sin infra cloud real.

---

## 30. Missing Modules

### CORE MISSING
1. **Asistencia (Attendance)** — presente/ausente/excusa/tardanza/justificación/consulta/reporte. Usuarios: teacher(admin), parent/student(consulta). Dependencias: Student, Course, Subject, Schedule, AcademicPeriod. **Prioridad: CRÍTICA.**
2. **Cierre de Periodo y Consolidación de Notas** — cerrar periodo, calcular promedios, definitivas. Dependencias: Grades, AcademicPeriod, Enrollment. **Prioridad: CRÍTICA.**
3. **Reportes / Boletín / Exportación** — boletín, reporte de notas, listas, export CSV/Excel, PDF. Dependencias: Grades, Attendance, Reports. **Prioridad: CRÍTICA.**
4. **Alta institucional UI (Users/Roles/Institutions/Memberships management UI)** — flujo de onboarding multi-tenant. Dependencias: backend existente. **Prioridad: ALTA.**
5. **Agenda/Calendario con creación de eventos** (CalendarEntry: exámenes, reuniones, actividades). **Prioridad: ALTA** (por el nombre del producto).

### OPTIONAL
6. Notificaciones multicanal (email real, push). 7. Dashboard por rol. 8. Audit UI. 9. Config institucional (logo, escala).

### FUTURE
10. BI/Analytics avanzada. 11. App móvil nativa. 12. Firma digital robusta (PDF incrustado). 13. IA. 14. Marketplace/integraciones.

---

## 31. Missing Functionalities (dentro de módulos existentes)

| Módulo | Existe | Falta | Prioridad |
|---|---|---|---|
| Grades | CRUD | Vincular a AcademicPeriod, cierre, promedio, boletín, export | CRÍTICA |
| Agenda | Vista solo lectura | Crear eventos, recordatorios, tipos | ALTA |
| Institutions | CRUD backend | UI de alta/edición institucional | ALTA |
| Users | CRUD backend | UI de gestión | ALTA |
| Roles/Permissions | seed + guard | UI de gestión | ALTA |
| Audit | log parcial | Endpoint + UI de consulta, cobertura total | MEDIA |
| Notifications | in-app | Email real, más triggers | MEDIA |
| Signatures | full | Selector de destinatarios (no UUID), PDF | MEDIA |
| Guardians | full | Selector de estudiante (no UUID) | BAJA |
| Dashboard | genérico | Dashboards por rol | MEDIA |
| Observador | full (RC) | Reporte PDF, E2E dedicado | MEDIA |

---

## 32. Dependencies (orden lógico)

```
Alta institucional (Users/Roles/Institutions/Onboarding UI)
        ↓
Config académica (Periodos → Grados escolares → Cursos → Asignaturas)  [ya existe]
        ↓
Estudiantes + Acudientes + Matrícula  [ya existe, falta encadenar]
        ↓
Asignación docente (Teacher Assignment)  [ya existe]
        ↓
Asistencia (depende de Student/Enrollment/Schedule)  <-- NUEVO CORE
        ↓
Calificaciones con AcademicPeriod (FK) + Cierre de periodo  <-- REQUERIDO para boletín
        ↓
Reportes / Boletín / Exportación  [depende de Grades + Attendance + Cierre]
        ↓
Agenda con creación de eventos  [puede ir en paralelo temprano]
```

---

## 33. Recommended Roadmap

### FASE 1 — COMPLETAR CORE MVP (bloque inmediato)
- Cerrar Alta institucional UI (users/roles/institutions).
- Vincular `Grade` a `AcademicPeriod` + validar única nota por (student/course/subject/period) + cierre de periodo + promedio/definitiva.
- Implementar **Asistencia** (marcar por clase, consultar, reporte).
- Implementar **Agenda/Calendario con creación de eventos**.
- Reportes básicos (boletín + export CSV) derivados de lógica cerrada.

### FASE 2 — OPERACIÓN ESCOLAR
- Dashboard por rol (docente/padre).
- Notificaciones email real.
- Config institucional (logo, escala).
- Encadenar matrícula→taskAssignments/horarios/notas.

### FASE 3 — ANALÍTICA Y REPORTES
- Reporte de asistencia, observador PDF, consolidación avanzada, export Excel/PDF, audit UI.

### FASE 4 — PRODUCCIÓN / ESCALABILIDAD
- Agregar test:e2e API a CI, Docker build en CI, deploy a nube (docs 86-88), storage no local (S3), monitoring, backups, TLS, secretos de prod.
- Corregir IDOR de instituciones, definir `@Public()` explícito, endurecer CORS prod.

### FASE 5 — FUTURO
- BI, IA, app móvil, gamificación, marketplace.

---

## 34. Recommended PROMPTS 90+

| PROMPT | Nombre | Objetivo | Dependencias | Criterio de finalización |
|---|---|---|---|---|
| 90 | Academic Period Link & Grade Consolidation | Vincular Grade→AcademicPeriod, validar unicidad, cierre de periodo, promedio/definitiva | Grade, AcademicPeriod, Enrollment | Debe existir endpoint de cierre + nota consolidada |
| 91 | Attendance Module | Asistencia: marcar, consultar, justificar, reporte | Student, Enrollment, Schedule, Period | Backend + frontend + reporte |
| 92 | Institution Onboarding UI | UI de users/roles/institutions/memberships | Backend existente | Colegio se auto-configura desde UI |
| 93 | Agenda Creation (Calendar Events) | Crear/editar eventos institucionales en el calendario | Event model, Agenda | CRUD de eventos + vista |
| 94 | Reports / Report Cards | Boletín, reporte de notas/asistencia, export CSV/PDF | 90, 91 | Exportación real |
| 95 | Production Readiness / CI+CD+Cloud | test:e2e en CI, Docker build, deploy, secretos, S3, fix IDOR | 90–94 | Pipeline verde + despliegue |
| 96 | Role Dashboards & Notifications Email | Dashboard por rol, email real | — | Mejora UX |

---

## 35. Scope Creep / Future (NO HACER AHORA)

- IA / asistentes inteligentes.
- Gamificación / badges.
- Marketplace / e-commerce.
- App móvil nativa (React Native) — primero PWA de la web existente.
- Integraciones externas (SMS, Payments).
- BI avanzado / data warehouse — primero reportes básicos.
- Firma digital avanzada criptográfica — primero UX del flujo existente.

---

## 36. Observador del Alumno (Benchmark)

- **Nivel del Observador (release candidate):** dominio rico (tipo/severidad/confidencialidad/status lifecycle), resource authorization dedicada con confidentiality tiers, CRUD completo (entries, commitments, attachments, categories), notificaciones, audit, frontend completo (26 hooks, 4 páginas), unit tests (5 archivos). **Es el módulo de mayor calidad del sistema.**
- **Módulos al nivel del Observador:** **Ninguno** alcanza su profundidad de autorización a nivel recurso + lifecycle + dominio. Los más cercanos: Tasks, Communications, Signatures (completos E2E, pero sin resource-confidentiality sofisticada).
- **Módulos por debajo:** Institutions (sin tenant isolation adecuada), Users/Memberships/Roles (sin UI), Attendance/Reports (inexistentes), Agenda (solo lectura).
- **Módulos por encima:** Ninguno.
- **Nota crítica:** el Observador, el módulo más maduro, es paradójicamente uno de los **menos cubiertos en E2E Playwright y en integración API de CI** (sin `.e2e-spec.ts` propio en `apps/api/test`).

---

## 37. Product Decision

**Estado principal: C. Functional MVP.**

Justificación:
- Es un producto **usable** para tareas de administración (CRUD completo), comunicación, tareas y observador.
- **No** alcanza **D. Pilot Ready** porque faltan bloques que un colegio real necesita para operar un ciclo completo: **asistencia**, **cierre de periodo/boletín/reportes**, **alta institucional desde UI**, **agenda con creación de eventos**, y **CD a producción/cloud**.
- El backend, el modelo de datos, el RBAC, la multi-tenancy y el Observador están en un nivel **muy sólido** (por eso no es "Early MVP"), pero el **producto como servicio escolar diario está incompleto** (por eso no es "Pilot Ready").

---

## 38. Executive Matrix

| Área | Estado | Prioridad | Acción |
|---|---|---|---|
| Auth | ✅ Listo | Alta | mantener |
| RBAC | ✅ Listo | Alta | UI de gestión de roles |
| Multi-tenancy | ⚠️ (Institutions IDOR) | Alta | fix IDOR, `@Public` |
| Usuarios | ⚠️ backend, sin UI | Alta | PROMPT 92 |
| Estudiantes | ✅ Listo | — | — |
| Guardians | ✅ Listo (UX UUID) | Baja | selector |
| Cursos | ✅ Listo | — | — |
| Asignaturas | ✅ Listo | — | — |
| Matrículas | ✅ Listo | Media | encadenar |
| Periodos | ✅ Listo (CRUD) | — | link a Grades |
| Horarios | ✅ Listo | — | — |
| Calificaciones | ⚠️ sin cierre | **Crítica** | PROMPT 90 |
| Tareas | ✅ Listo | — | — |
| Comunicaciones | ✅ Listo | — | — |
| Notificaciones | ⚠️ in-app only | Media | email real |
| Firmas | ✅ Listo (UX UUID) | Baja | selector |
| Observador | ✅ RC | — | E2E dedicado |
| **Asistencia** | 🔴 Missing | **Crítica** | PROMPT 91 |
| **Agenda/Calendario** | ⚠️ solo lectura | Alta | PROMPT 93 |
| Dashboards | ⚠️ genérico | Media | por rol |
| **Reportes** | 🔴 Missing | **Crítica** | PROMPT 94 |
| Analítica | 🔴 Missing | Futura | — |
| Documentos/Archivos | ⚠️ infra only | Media | repositorio |
| Config institucional | ⚠️ parcial | Media | marca/logo/escala |
| Testing | ⚠️ int API fuera de CI | Alta | llevar 553 a CI |
| CI/CD | ⚠️ CI parcial / CD no | **Alta** | PROMPT 95 |
| Cloud | 🚫 documentado | **Alta** | PROMPT 95 |

---

## 39. PO Summary

### LO QUE YA TENEMOS (funciona de verdad)
- Auth completa (login/refresh/logout/password reset/tenant select/profile).
- RBAC por permisos con 5 roles + multi-tenancy fuerte por institución.
- CRUD administrativo completo (backend + frontend): estudiantes, cursos, asignaturas, grados, horarios, períodos, grados escolares, matrículas, acudientes, asignaciones docentes, tareas (+entregas+calificación), comunicaciones (+bandeja), firmas, notificaciones.
- **Observador del Alumno end-to-end** (release candidate): seguimiento completo con entradas, compromisos, adjuntos, categorías, ciclo de vida, confidencialidad, stats.
- Agenda agregada de solo lectura (tareas/horarios/comunicaciones/firmas).
- Base de seguridad sólida (argon2, JWT+refresh, throttle, helmet, validación, request-id).
- Testing amplio (641 unit + 553 integración + 55 vit + 111 E2E) y UI responsive/accesible (WCAG AA).

### LO QUE ESTÁ INCOMPLETO
- Calificaciones **sin** cierre de periodo ni consolidación ni boletín.
- Agenda **sin** creación de eventos.
- Dashboard genérico **sin** versión por rol.
- Notificaciones **solo in-app** (sin email real).
- Auditoría **parcial** y sin UI de consulta.
- Instituciones **sin** frontera de tenant clara (IDOR) y **sin** UI.
- Alta institucional (users/roles/institutions) **solo backend**.
- CI **sin** integración API (553 tests) ni Docker build.

### LO QUE FALTA (módulos)
- **Asistencia** (core ausente).
- **Reportes / Boletín / Exportación** (ausente).
- **Cierre de periodo** (ausente, bloquea reportes).
- **Agenda/Calendario con eventos** (falta creación).
- **Alta institucional UI**.
- **CD / despliegue cloud real**.

### LO QUE NO DEBEMOS HACER TODAVÍA
- IA, gamificación, marketplace, app móvil nativa, BI avanzado, integraciones externas, firma criptográfica avanzada.

### PRÓXIMO BLOQUE DE DESARROLLO
Cerrar los **gaps críticos para operar un colegio**: (1) vincular calificaciones a periodo + cierre + consolidación, (2) **asistencia**, (3) **reportes/boletín/exportación**, (4) **alta institucional UI**, (5) **agenda con eventos**, y llevar el **test:e2e API + Docker build al CI**. Esto convierte el "Functional MVP administrativo" en un **Pilot Ready** escolar.

### ESTADO REAL DEL PRODUCTO (conclusión)
Agenda Escolar es un sólido **backend-first** con un modelo de datos, RBAC, multi-tenancy y autenticación bien ejecutados, y un CRUD administrativo casi completo en frontend. Su módulo estrella (Observador) es de calidad release-candidate y sirve de referencia. Sin embargo, **es un producto de "administración académica" más que una "agenda escolar operativa"**: carece de asistencia, boletines/reportes, cierre de periodo y capacidad de crear eventos de calendario, y un colegio aún **no puede auto-provisionarse ni producir resultados académicos** desde la plataforma. El camino a pilot está bien definido y el intestino técnico permite alcanzarlo; falta principalmente completar los bloques de negocio y cerrar el despliegue a la nube.

---

## 40. Final Verdict

**Estado: C. Functional MVP (a un paso de Pilot Ready).**

El intestino técnico (backend, datos, seguridad, tenancy, Observador) es de calidad **muy alta** — equiparable a pilot. El **producto funcional para un colegio real** está **incompleto** en Asistencia, Reportes/Boletín, Cierre de Periodo, Alta institucional UI, Agenda con eventos y CD/Cloud. Cerrar esos gaps (PROMPTS 90–95) convierte a Agenda Escolar en **D. Pilot Ready / E. Production Ready**.

---

*Fin del documento — Auditoría basada en código real en `e7dca4a` (`v1.0.2-rc.1`). Sin cambios funcionales. NO COMMIT / NO PUSH / NO TAG.*
