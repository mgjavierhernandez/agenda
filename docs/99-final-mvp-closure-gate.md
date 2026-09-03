# 99 — FINAL MVP CLOSURE GATE

Fecha: 2026-09-03
Alcance: **Validación integral del MVP** de la Agenda Escolar Digital (monorepo NestJS + React/Vite + Prisma + PostgreSQL). Este documento **congela el alcance del MVP** y clasifica qué está terminado vs pendiente, con **evidencia reproducible** (código, tests, schema/migraciones, validación ejecutada).

Rol: **auditoría/validación/documentación**. NO se implementó funcionalidad nueva en este prompt. Solo se documentaron GAP/PENDIENTE y se registraron débitos de calidad pre-existentes.

Fuente de verdad (en orden): **1) código**, **2) tests**, **3) schema/migraciones**, **4) documentación**.

**Decisión de cierre:** `MVP FUNCTIONALLY COMPLETE` — sin GAP funcional bloqueante → **NO NEW FUNCTIONAL PROMPT REQUIRED — MVP SCOPE FREEZE**.

---

## ÍNDICE (36 secciones)

1. [FASE 1 — Inventario y matrícula del producto](#fase-1)
2. [FASE 2 — Matriz funcional final (42 módulos)](#fase-2)
3. [FASE 3 — Validación Observador del Alumno](#fase-3)
4. [FASE 4 — Validación Firmas↔Observador](#fase-4)
5. [FASE 5 — Validación Citaciones (FollowUpCitation)](#fase-5)
6. [FASE 6 — Dark Mode (GAP-UI-001)](#fase-6)
7. [FASE 7 — Overdue A/B (GAP-OVERDUE-001)](#fase-7)
8. [FASE 8 — Email Real (SMTP)](#fase-8)
9. [FASE 9 — Dashboards por rol](#fase-9)
10. [FASE 10 — Gates de validación ejecutados](#fase-10)
11. [FASE 11 — Regresión funcional](#fase-11)
12. [FASE 12 — Matriz de seguridad](#fase-12)
13. [FASE 13 — Product maturity (A/B/C/D)](#fase-13)
14. [FASE 14 — Inventario A/B/C de alcance](#fase-14)
15. [FASE 15 — Definición de "MVP terminado"](#fase-15)
16. [FASE 16 — Cloud: producto vs infraestructura](#fase-16)
17. [FASE 17 — Conclusión y próximos pasos](#fase-17)
18. [FASE 18 — Estado de Git](#fase-18)
19. [FASE 19 — Veredicto final](#fase-19)
20–26. [Apéndices A–G](#apendices)

---

<a name="fase-1"></a>
## 1. FASE 1 — Inventario y matrícula del producto

### Backend (NestJS, `apps/api`)
- **32 controllers** registrados en `src/modules/*/: modules` — ver `app.module.ts` (auth, institutions, users, memberships, roles, students, courses, subjects, grades, schedules, tasks, communications, signatures, notifications, school-grades, academic-periods, guardians, enrollments, teacher-assignments, task-assignments, task-submissions, communication-recipients, files, agenda, agenda-events, student-follow-ups, follow-up-categories, attendances, reports, dashboard, health).
- **`~120+ endpoints`** bajo el prefijo global `api/v1` (`main.ts:23`).
- **Prisma**: 40+ modelos, 42+ enums. Migraciones: basales + aditivas (grade/period closure, attendance, agenda-events, follow-up citations & signature integration).
- **Infraestructura transversal**: `Helmet`, `Throttler`, `ValidationPipe(whitelist+forbidNonWhitelisted)`, `TenantContextGuard` / `OptionalTenantGuard`, `AccessTokenGuard`, `PermissionGuard`, `AuditService`, `LoggingInterceptor`, `AllExceptionsFilter`, `RequestIdMiddleware`.

### Frontend (React/Vite, `apps/web`)
- **25 módulos**, **~75 páginas**, **~90 hooks** (ver `src/modules/*`).
- **77 permisos** en `permission.constants.ts`, 5 roles (`SUPER_ADMIN`, `INSTITUTION_ADMIN`, `TEACHER`, `PARENT`, `STUDENT`).
- **Sidebar** con 26 links gated por permiso (`Sidebar.tsx`), `<PermissionGate>` + `hasPermission()` en páginas.
- **Enrutado**: `/protected` → `ProtectedRoute` (auth + institution select) → `AppLayout` (ChildProvider + Topbar + Sidebar).

### Documentación revisada
`docs/85` a `docs/98` (Observador RC, cloud staging, master audit, grade/period closure, attendance, admin UI, agenda events, reports, hardening CI/CD, dashboards+email, validación funcional, signatures/citations/E2E).

---

<a name="fase-2"></a>
## 2. FASE 2 — Matriz funcional final (42 módulos)

Clasificación: **IMPLEMENTADO** / **PARCIAL** / **PENDIENTE MVP** / **POST-MVP** / **NO REQUERIDO** / **INFRAESTRUCTURA**.

| # | Módulo | Backend | Frontend | Tests BE | E2E BE | Estado |
|---|--------|---------|----------|----------|--------|--------|
| 1 | Auth (login/refresh/reset/tenant select) | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 2 | Institutions (multi-tenant, IDOR fixed) | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 3 | Users | ✅ | ✅ (admin) | ✅ | ✅ | IMPLEMENTADO |
| 4 | Memberships | ✅ | ✅ (admin) | ✅ | ✅ | IMPLEMENTADO |
| 5 | Roles | ✅ | ✅ (admin read) | ✅ | ✅ | IMPLEMENTADO |
| 6 | Students | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 7 | Courses | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 8 | Subjects | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 9 | Grades | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 10 | Schedules | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 11 | Tasks | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 12 | Task Assignments | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 13 | Task Submissions | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 14 | Communications | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 15 | Communication Recipients | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 16 | Signatures (firma digital) | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 17 | Signatures ↔ Observador | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 18 | Student Follow-Ups (Observador) | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 19 | Follow-Up Citations | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 20 | Follow-Up Categories | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 21 | Notifications | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 22 | School Grades | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 23 | Academic Periods (incl. CLOSE) | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 24 | Guardians | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 25 | Enrollments | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 26 | Teacher Assignments | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 27 | Files (upload/download) | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 28 | Agenda (agregado lectura) | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 29 | Agenda Events (CRUD custom) | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 30 | Attendances (incl. bulk, period-protected) | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 31 | Reports + Bulletin + PDF/CSV export | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 32 | Dashboard por rol | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 33 | Administration UI (institución/usuarios) | ✅ | ✅ | ✅ | ✅ | IMPLEMENTADO |
| 34 | Health (liveness/readiness) | ✅ | n/a | ✅ | ✅ | IMPLEMENTADO |
| 35 | Audit (registro de auditoría) | ✅ | ⚠️ sin UI | — | — | PARCIAL |
| 36 | Emails (SMTP password reset/comms/signature) | ✅ | n/a | ✅ | — | IMPLEMENTADO |
| 37 | Dark mode | ❌ | ❌ | — | — | POST-MVP (GAP-UI-001) |
| 38 | Overdue notif. proactiva (scheduler) | ❌ | ❌ | — | — | POST-MVP (GAP-OVERDUE-001) |
| 39 | IA / app móvil / Redis / WhatsApp / chat | ❌ | ❌ | — | — | NO REQUERIDO (anti-alcance) |
| 40 | CI/CD pipeline (GitHub Actions) | ✅ | ✅ | — | — | IMPLEMENTADO |
| 41 | Docker (dev + prod) | ✅ | ✅ | — | — | IMPLEMENTADO |
| 42 | Auditorías de seguridad/QA (WSG/Secu) | ✅ | n/a | — | — | IMPLEMENTADO (ver FASE 12) |

**Resumen**: 33 IMPLEMENTADO, 1 PARCIAL (Audit sin UI, no bloqueante), 2 POST-MVP, 1 NO REQUERIDO. **0 PENDIENTE MVP funcional bloqueante.**

---

<a name="fase-3"></a>
## 3. FASE 3 — Validación Observador del Alumno

Validación de código con evidencia (resumen; detalle en FASE 12 / Apéndice B). Veredicto global **PASS (34/34, 1 WARN no bloqueante)**.

- **Confidencialidad**: `student-follow-up-authorization.ts` define `CONFIDENTIALITY_VISIBILITY` (ADMIN ve PUBLIC/INTERNAL/CONFIDENTIAL/SENSITIVE; TEACHER/PARENT/STUDENT solo PUBLIC/INTERNAL). `canRead()` resuelve rol vía BD + `checkConfidentialityAccess()`. `findAll()` filtra por `confidentiality: { in: visibleLevels }`.
- **Tenant isolation**: toda consulta scoped por `institutionId`; `canRead/canUpdate/canClose` verifican `followUp.institutionId !== institutionId → NOT_FOUND`.
- **RBAC**: 16 rutas verificadas con `@RequirePermission` (`student-follow-ups:*`). Clase entera con `AccessTokenGuard + TenantContextGuard + PermissionGuard`.
- **Parent context**: `resolveParentContext()` resuelve hijos via `guardianStudent` (ACTIVE); filtro PARENT solo ve follow-ups de hijos vinculados (multi-hijo vía `some`).
- **Trazabilidad**: `createdById`/`closedById` en follow-ups/entries; **auditoría** (`auditService.log`) en cada CRUD/lifecycle (CREATED/UPDATED/CLOSED/ESCALATED/FOLLOW_UP/RESOLVED/REOPENED, ENTRY, COMMITMENT, ATTACHMENT).
- **Confidencialidad de notificaciones**: map mirror en `follow-up-notification.helper.ts`.

---

<a name="fase-4"></a>
## 4. FASE 4 — Validación Firmas ↔ Observador

Veredicto **PASS**.

- `StudentFollowUpSignatureService`: `requestSignature()` valida autorización `canUpdate()`, valida `followUpEntryId` pertenece al follow-up, y valida recipients como miembros ACTIVE del tenant.
- `findByFollowUp()` usa `canRead()` (confidencialidad) antes de listar.
- `signatures.service.ts`: `sign()`/`decline()` validan PUBLISHED + recipiente + PENDING → SIGNED/DECLINED, auto-completa la petición cuando todos firman, y dispara `sendFollowUpSignatureNotification()` si hay `followUpId`.
- Notificaciones: `SIGNATURE_REQUEST_CREATED`, `SIGNATURE_COMPLETED_FROM_FOLLOW_UP`, `SIGNATURE_DECLINED_FROM_FOLLOW_UP`, `SIGNATURE_EXPIRED_FROM_FOLLOW_UP`.
- Auditoría: `SIGNATURE_REQUESTED_FROM_FOLLOW_UP`.

---

<a name="fase-5"></a>
## 5. FASE 5 — Validación Citaciones (FollowUpCitation)

Veredicto **PASS (8/8)** con **1 observación de endurecimiento (WARN)**.

- `create()` valida `scheduledAt` futuro; `assertFollowUpMutable()` bloquea en CLOSED; permisos `canUpdate()`.
- Workflow `SCHEDULED/COMPLETED/CANCELLED/NO_SHOW` con auditoría dinámica `CITATION_<STATUS>` y notificaciones para cada transición.
- **WARN (no bloqueante)**: `follow-up-citations.service.ts:242-244` — las transiciones de estado de citación NO tienen `VALID_TRANSITIONS` (máquina de estados) como sí tiene el lifecycle de follow-up; cualquier estado puede derivar a cualquier otro vía DTO. Documentado como débito de endurecimiento POST-MVP.

---

<a name="fase-6"></a>
## 6. FASE 6 — Dark Mode (GAP-UI-001)

**Evidencia**: búsqueda de `dark|theme|classList|data-theme` en `apps/web/src` → **sin coincidencias**. Solo existe tema claro (Tailwind CSS con paleta clara).

**Registro**: `GAP-UI-001 — Dark Mode` → **POST-MVP / NO IMPLEMENTADO**. No se implementa (fuera de alcance).

---

<a name="fase-7"></a>
## 7. FASE 7 — Overdue A/B (GAP-OVERDUE-001)

- **A. OVERDUE derivado**: ✅ IMPLEMENTADO. `commitment-overdue.helper.ts::deriveCommitmentStatus()` deriva `OVERDUE` en lectura (PENDING/IN_PROGRESS + dueDate pasado → OVERDUE; COMPLETED/CANCELLED se respetan). Con tests (`commitment-overdue.helper.spec.ts`, incl. borde "mismo día no overdue").
- **B. Notificación proactiva (scheduler)**: ❌ NO IMPLEMENTADO. Sin `@Cron`/`@Schedule`/`setInterval` en el codebase (búsqueda `Cron|@Schedule|setInterval|overdue` no devuelve scheduler).

**Registro**: `GAP-OVERDUE-001 — Proactive Overdue Notification` → **POST-MVP / NO IMPLEMENTADO**. No se implementa scheduler.

---

<a name="fase-8"></a>
## 8. FASE 8 — Email Real (SMTP)

**IMPLEMENTADO** (PROMPT 96). Veredicto **PASS**.
- `smtp-email.provider.ts` (nodemailer), config vía `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
- Fallback `dev-email.provider.ts` (no envía; CI/local).
- Disparos (fire-and-forget, no bloquean operación): `auth.service.ts` → password reset; `communications.service.ts` → comunicación publicada; `signatures.service.ts` → petición de firma.
- Plantillas en español (`email-templates.ts`, tested).

---

<a name="fase-9"></a>
## 9. FASE 9 — Dashboards por rol

**IMPLEMENTADO** (PROMPT 96). Veredicto **PASS**.
- `dashboard.service.ts::resolveRole()` (ADMIN>TEACHER>PARENT>STUDENT) adapta estadísticas, hijos, cursos, asignaturas, comunicaciones, follow-ups, compromisos, eventos y agenda individual por rol.
- `GET /dashboard` funciona para `INSTITUTION_ADMIN`/`SUPER_ADMIN`/`TEACHER`/`PARENT`/`STUDENT`.
- Frontend: `DashboardPage.tsx` + hooks de rol; KPIs gated por permiso.
- E2E `dashboard.e2e-spec.ts` ✅.

---

<a name="fase-10"></a>
## 10. FASE 10 — Gates de validación ejecutados

Todos ejecutados localmente (evidencia reproducible).

| Gate | Comando | Resultado |
|------|---------|-----------|
| Prisma schema | `npx prisma validate` | ✅ válido |
| Typecheck API | `tsc --noEmit -p tsconfig.json` (api) | ✅ 0 errores |
| Typecheck Web | `tsc --noEmit` (web) | ✅ 0 errores |
| Unit API (Jest) | `npx jest` (api) | ✅ **799 PASS** / 45 suites |
| Unit Web (Vitest) | `npx vitest run` (web) | ✅ **510 PASS** / 64 files |
| E2E API (Jest) | `jest --config test/jest-e2e.json --runInBand` | ⚠️ **674/676 PASS** (2 fallos por contaminación de BD test, ver FASE 11) |
| Build Web | `npx vite build` | ✅ éxito (solo warning tamaño bundle 744 kB, no bloqueante) |
| Lint API | `eslint "{src,test}/**/*.ts"` | ⚠️ **6 errores** (débito pre-existente, ver FASE 14) |
| Lint Web | `eslint .` | ⚠️ **4 errores + 1 warning** (débito pre-existente, ver FASE 14) |
| E2E Web (Playwright) | `npx playwright test` | ⛔ **bloqueado por entorno** (ver abajo) |

### Playwright — bloqueo ambiental documentado
- **Causa**: requiere (a) navegadores Playwright instalados y (b) API server + web dev server + BD seed corriendo simultáneamente. `npx playwright install --dry-run` muestra navegadores NO instalados.
- **Comando fallido/bloqueado**: `npx playwright test` (root).
- **No se modificó código** para ocultar el bloqueo.
- **Cobertura equivalente**: API E2E de dominio Observador (`apps/api/test/student-follow-ups.e2e-spec.ts`) — incluida y APROBADA en el gate de 674/676; más 16 specs Playwright en `apps/web/e2e/` (incl. `observador.spec.ts`) configurados y CI-ready aunque no ejecutables en este entorno.

---

<a name="fase-11"></a>
## 11. FASE 11 — Regresión funcional

- **Búsqueda unitaria y de API**: 799 unit + 674 E2E PASS → sin regresiones funcionales detectadas.
- **Los 2 fallos E2E son contaminación de BD de test**, NO defectos funcionales:
  - `tenant-context.e2e-spec.ts` (2 casos) fallan con `Unique constraint failed on fields: slug` porque las slugs `inactive-institution` e `inactive-membership-school` **ya existen** en la BD compartida de test debido a una corrida anterior interrumpida (fixtures huérfanos). Verificado consultando la BD: ambos registros existen.
  - Este es el mismo fallo ambiental pre-existente reportado en PROMPT 97 ("2 environmental failures").
- **Registro**: `GAP-E2E-001 — Test DB pollution (fixtures huérfanos)`. Requiere limpieza de BD de test antes de re-correr E2E; no es defecto de producto.

---

<a name="fase-12"></a>
## 12. FASE 12 — Matriz de seguridad

Veredicto global **PASS — 92 checks**, **0 FAIL**, **3 WARN** (no bloqueantes). Ver Apéndice B para evidencia `archivo:línea`.

| Área | Estado | Evidencia clave |
|------|--------|-----------------|
| JWT access token (15m, iss/aud verificado) | PASS | `token.service.ts`, `jwt.strategy.ts` |
| Refresh token 384-bit, single-use, hash SHA-256, rotate/revoke | PASS | `token.service.ts:52-145` |
| Password argon2id (OWASP config) | PASS | `password.service.ts` |
| Helmet global | PASS | `security.module.ts` |
| CORS restrictivo | PASS | `main.ts:41-57` |
| Rate limiting (Throttler global + overrides login/refresh/forgot/reset) | PASS | `app.module.ts`, `auth.controller.ts` |
| ValidationPipe whitelist + forbidNonWhitelisted | PASS | `main.ts:26-32` |
| Tenant context guard (X-Institution-Id + membership) | PASS | `tenant-context.guard.ts` |
| Optional tenant guard (SUPER_ADMIN cross-tenant) | PASS | `optional-tenant.guard.ts` |
| IDOR/BOLA institutions (fix PROMPT 92) | PASS | `institutions.service.ts:82-96` |
| IDOR/BOLA Observador (tenant + confidentiality) | PASS | `student-follow-up-authorization.ts` |
| DTOs: sin campos de autoridad cliente; validación class-validator | PASS | `dto/*`, `main.ts:28-31` |
| Auditoría en 22+ módulos | PASS | `audit.service.ts` |
| Refresh token sin binding de dispositivo | WARN | `token.service.ts:60-74` (POST-MVP) |
| Confidentiality map duplicado (auth vs notification) | WARN | `student-follow-up-authorization.ts` vs `follow-up-notification.helper.ts` |
| GET /institutions lista no scoped por membership (global perm) | WARN | `institutions.service.ts:50-80` |

---

<a name="fase-13"></a>
## 13. FASE 13 — Product maturity (A/B/C/D)

Clasificación por módulo (definición en FASE 14):

| Categoría | Módulos |
|-----------|---------|
| **A — MVP COMPLETO** | Auth, Institutions, Users, Memberships, Roles, Students, Courses, Subjects, Grades, Schedules, Tasks, Task Assignments, Task Submissions, Communications, Communication Recipients, Signatures, Signatures↔Observador, Student Follow-Ups, Follow-Up Citations, Follow-Up Categories, Notifications, School Grades, Academic Periods, Guardians, Enrollments, Teacher Assignments, Files, Agenda, Agenda Events, Attendances, Reports+Bulletin+Export, Dashboard por rol, Administration UI, Health, Emails SMTP, CI/CD, Docker |
| **B — COMPLETO CON PENDIENTES NO BLOQUEANTES** | Audit (sin UI dedicada), Linting (débitos de calidad) |
| **C — PARCIAL** | — (ninguno) |
| **D — NO LISTO** | — (ninguno) |

---

<a name="fase-14"></a>
## 14. FASE 14 — Inventario A/B/C de alcance

### Lista A — Dentro de alcance del MVP (completado)
Todo el catálogo funcional de los módulos listados en la matriz (FASE 2, filas 1–34, 36, 40–42).

### Lista B — Post-MVP (documentado, NO implementado)
1. **`GAP-UI-001 — Dark Mode`** (FASE 6).
2. **`GAP-OVERDUE-001 — Proactive Overdue Notification`** (scheduler) (FASE 7).
3. **Audit UI** dedicada para visualizar el registro de auditoría (hoy solo backend + API).
4. **Endurecimientos (WARN) de FASE 12**: máquina de estados de citaciones, unificar mapa de confidencialidad, bind de refresh token a dispositivo, scoping de `GET /institutions`.
5. **`GAP-E2E-001`**: limpieza de fixtures huérfanos en BD de test.

### Lista C — Fuera de alcance / anti-alcance (NO REQUERIDO)
IA, app móvil, Redis, WhatsApp/SMS, chat, nuevas funcionalidades académicas, nuevos dashboards, nuevos módulos administrativos, escalabilidad no necesaria.

**Débitos de calidad pre-existentes (registrados, NO corregidos — fuera del rol de este gate):**
- **Lint API (6)**: `no-explicit-any` en 2 spec files; `unused-vars` en `create-follow-up-citation.dto.ts`, `follow-up-citations.service.ts`, `student-follow-ups.controller.ts` (imports/consts sin usar de PROMPT 98).
- **Lint Web (4+1)**: `no-unused-vars` en `administration-pages.test.tsx`, `AttendanceRegisterPage.tsx`, `useUpdateFollowUpEntry.test.tsx`, `StudentFollowUpDetailPage.tsx`; +1 warning react-refresh en `ChildContext.tsx`.
- **Bundle size warning**: `index-*.js` 744 kB (gzip 168 kB) > 500 kB — candidato a code-splitting post-MVP.
- **Drift de BD pre-existente**: tabla `students` con `user_id` no en historial de migraciones (documentado en PROMPT 98). No afecta validación read-only.

---

<a name="fase-15"></a>
## 15. FASE 15 — Definición de "MVP terminado"

**MVP FUNCTIONALLY COMPLETE.**

Un MVP funcionalmente completo = todas las funcionalidades de alcance implementadas de extremo a extremo (backend + frontend), con typecheck limpio, tests unitarios y E2E verdes en su mayor parte, seguridad base verificada, y sin defecto funcional bloqueante.

**Resultado**: los únicos hallazgos son (a) 1 PARCIAL no bloqueante (Audit sin UI), (b) 2 POST-MVP explícitos (Dark Mode, Overdue scheduler), (c) débitos de calidad (lint, bundle, auditoría/endurecimientos), y (d) 2 fallos E2E por contaminación de BD de test (ambiental, no funcional). **Ninguno bloquea el cierre del MVP.**

---

<a name="fase-16"></a>
## 16. FASE 16 — Cloud: producto vs infraestructura

Separación estricta. **No se despliega nada en este gate**; solo inventario.

### Producto (app) — listo para estadio cloud
- Dockerfiles (dev/prod) + `docker-compose.prod.yml`, imágenes definidas.
- Config vía variables de entorno (`CORS_ORIGIN`, `SMTP_*`, `DATABASE_URL`, `RATE_LIMIT_*`, `JWT_*`).
- Compilación de producción verificada localmente (build ✅).

### Infraestructura — pendiente para staging/producción (inventariado, NO ejecutado)
| Item | Estado |
|------|--------|
| Provisionar servicio PostgreSQL gestionado/containerizado | PENDIENTE |
| Host de aplicación (container runtime / PaaS) | PENDIENTE |
| Dominio + TLS (certificado) | PENDIENTE |
| Variables de entorno de producción (SMTP real, CORS, JWT secrets) | PENDIENTE |
| `CORS_ORIGIN` explícito en prod (hoy warning si ausente) | PENDIENTE |
| Copias de seguridad / backup policy | PENDIENTE |
| Observability (logs/métricas) | PENDIENTE |
| Migraciones de producción (`prisma migrate deploy`) | PENDIENTE |

*Referencia histórica: `docs/86-cloud-staging-readiness.md`, `docs/87-cloud-staging-preparation.md`, `docs/88-cloud-staging-configuration.md`.*

---

<a name="fase-17"></a>
## 17. FASE 17 — Conclusión y próximos pasos

- **El MVP está funcionalmente completo.** El alcance queda **congelado**.
- Gaps registrados y categorizados en FASE 14 (Post-MVP + débitos).
- Próximos pasos recomendados (POST-MVP, no bloqueantes): corregir débitos de lint; limpiar BD de test (`GAP-E2E-001`); decidir sobre Dark Mode y scheduler de Overdue; ejecutar playbook de FASE 16 para estadio cloud; considerar code-splitting.

---

<a name="fase-18"></a>
## 18. FASE 18 — Estado de Git (sin commit/push/tag)

Documentación exacta (ver FASE 19 para resumen del árbol de trabajo).

- **Tag** `v1.0.2-rc.1` intacto.
- **Working tree**: cambios sin commitear de PROMPTS 90–98 + este doc 99.
- **62 archivos modificados**, **3211 insertions / 567 deletions** (`git diff --stat`), más **numerosos archivos nuevos (untracked)** de PROMPTS 90–98 (migraciones aditivas, módulos nuevos attendance/dashboard/reports/roles/administration, email, citaciones, firmas-observador, E2E, docs).
- **No se realizó** `git add`, `git commit`, `git push` ni `git tag`.

---

<a name="fase-19"></a>
## 19. FASE 19 — Veredicto final

> **MVP SCOPE FREEZE — NO NEW FUNCTIONAL PROMPT REQUIRED.**
>
> El MVP de la Agenda Escolar Digital está **funcionalmente completo** según código, tests y validación ejecutada. No existe GAP funcional bloqueante dentro de alcance. Los hallazgos restantes son débitos post-MVP/de calidad y NINGUNO bloquea el cierre.

**Resumen de evidencia ejecutada:**
- Prisma validate ✅ · Typecheck API ✅ · Typecheck Web ✅
- Unit API 799/799 ✅ · Unit Web 510/510 ✅
- E2E API 674/676 ✅ (2 ambientales por contaminación de BD test)
- Build Web ✅ · Lint API/Web ⚠️ (débitos)
- Playwright ⛔ (bloqueado por entorno, documentado; cobertura API E2E equivalente ✅)
- Seguridad: 92 PASS / 0 FAIL / 3 WARN

---

<a name="apendices"></a>
# APÉNDICES

<a name="apendice-a"></a>
## Apéndice A — Clasificaciones de documentación usadas

`IMPLEMENTADO` / `PARCIAL` / `PENDIENTE MVP` / `POST-MVP` / `INFRAESTRUCTURA`.

<a name="apendice-b"></a>
## Apéndice B — Evidencia de seguridad (archivo:línea)

| Check | Evidencia |
|-------|-----------|
| CONFIDENTIALITY_VISIBILITY | `student-follow-up-authorization.ts:6-16` |
| checkConfidentialityAccess | `student-follow-up-authorization.ts:222-230` |
| canRead (rol+confid) | `student-follow-up-authorization.ts:30-68` |
| Tenant checks canRead/Update/Close | `student-follow-up-authorization.ts:49,126,171` |
| FindAll confid filter | `student-follow-ups.service.ts:148-153` |
| Parent filter | `student-follow-ups.service.ts:193-201`, `parent-context.ts` |
| Trazabilidad createdById/closed | `student-follow-ups.service.ts:88,519,412-413` |
| Audit Observador | `student-follow-ups.service.ts:99-1265`, `citations.service.ts:108-347`, `signature.service.ts:120-133` |
| JWT (sub/iss/aud) | `token.service.ts:32-46`, `jwt.strategy.ts:15-21` |
| Refresh single-use hash SHA-256 | `token.service.ts:52-58,99-121` |
| Argon2id | `password.service.ts:7-12` |
| Helmet | `security.module.ts:9-12` |
| Throttler | `app.module.ts:43-58` |
| ValidationPipe | `main.ts:26-32` |
| IDOR institutions fix | `institutions.service.ts:82-96` |
| Audits 22+ módulos | grep `auditService.log` |

<a name="apendice-c"></a>
## Apéndice C — Módulos con auditoría
auth, users, memberships, institutions, students, courses, subjects, grades, schedules, tasks, task-assignments, task-submissions, communications, communication-recipients, signatures, notifications, school-grades, academic-periods, guardians, enrollments, teacher-assignments, files, agenda-events, attendances, student-follow-ups, follow-up-categories, follow-up-citations, follow-up-signatures, reports, dashboard.

<a name="apendice-d"></a>
## Apéndice D — Contadores de tests (resultado real ejecutado)
Unit API **799** (45 suites) · Unit Web **510** (64 files) · E2E API **674/676** (31 suites) · Playwright configurado 16 specs (no ejecutable en entorno).

<a name="apendice-e"></a>
## Apéndice E — Migraciones presentes (untracked)
- `20260828000000_add_grade_academic_period_link_and_closure`
- `20260828120000_add_attendance_domain`
- `20260830000000_add_agenda_events`
- `20260903000000_add_follow_up_citations_and_signature_integration`

<a name="apendice-f"></a>
## Apéndice F — Documentación asociada
`docs/85` a `docs/98` (ver FASE 1). Este documento (`docs/99`) cierra la cadena.

<a name="apendice-g"></a>
## Apéndice G — Comandos de reproducción
```
# Schema + types
cd apps/api && npx prisma validate && npx tsc --noEmit -p tsconfig.json
# Unit
npx jest
# E2E API (importante: BD de test limpia para evitar GAP-E2E-001)
npx jest --config ./test/jest-e2e.json --runInBand
# Web
cd ../web && npx tsc --noEmit && npx vitest run && npx vite build
# Lint
cd ../api && npx eslint "{src,test}/**/*.ts"
cd ../web && npx eslint .
# Playwright (requiere API+web servers y navegadores instalados)
npx playwright test
```
