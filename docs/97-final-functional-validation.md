# PROMPT 97 — VALIDACIÓN FUNCIONAL INTEGRAL Y GATE DE PRODUCTO — AGENDA ESCOLAR DIGITAL

## 1. Executive Summary

Se ejecutó una validación funcional integral del producto **Agenda Escolar Digital** sobre el estado REAL del repositorio (sin modificar código, sin commits, sin migraciones, sin ampliar alcance). El objetivo fue determinar, con evidencia, si el producto está listo para piloto/staging.

**Resultado técnico (FASE 2):**

| Compuerta | Resultado |
|---|---|
| Prisma validate | PASS |
| TypeScript API | PASS |
| TypeScript Web | PASS |
| API unit (Jest) | PASS 782/782 |
| API E2E (Jest) | **666/668** (2 fallos ambientales) |
| Web Vitest | PASS 510/510 |
| API build | PASS |
| Web build | PASS |
| Lint | **FAIL** (API 13 errores / Web 4) — preexistente |
| Playwright | Configurado + en CI; ejecución local BLOCKED (puertos ocupados por stack prod) |

**Hallazgos clave que impiden declarar "listo sin matices":**
- **Firmas NO están integradas con el Observador del Alumno** (módulo independiente; sin FK a seguimiento/entrada/compromiso/citación).
- **No existe el concepto de "citación"** en esquema, servicio ni frontend.
- **Observador del Alumno no tiene cobertura e2e** (solo unit ~200 casos); es el dominio prioritario y no se ejercita por el stack HTTP+DB real.
- **La suite e2e no es reproducible sobre base compartida**: 2 fallos permanentes por fixtures huérfanos, y 9 fallos transitorios no reproducibles (test-pollution).
- **Lint en rojo** en código preexistente → el job `lint` del CI fallaría.
- **Modo oscuro NO implementado** (solo modo claro).
- **Múltiples fugas de UUIDs internos en la UI** (listas y tarjetas "Metadatos"), formulario de firmas pide pegar UUIDs crudos, y no hay sistema de toasts (feedback de guardado inconsistente).

**Veredicto:** **B. READY FOR PILOT WITH FIXES.** No hay BLOCKER ni CRITICAL en flujos centrales; la seguridad/tenant-isolation está validada de forma robusta; los flujos centrales funcionan. Pero existen HIGH conocidos (integración firmas↔Observador, citación ausente, inestabilidad e2e sobre base compartida, lint rojo en CI, Observador sin e2e) que conviene corregir antes de un piloto amplio o de staging productivo.

---

## 2. Validation Scope

Dominios evaluados (FASES A–AD del prompt): autenticación, dashboard, administración institucional, estudiantes, acudientes, cursos, materias, docentes/asignaciones, horarios, asistencia, calificaciones, períodos, cierre de períodos, Observador del Alumno, compromisos, archivos/evidencias, comunicaciones, firmas, notificaciones, agenda/eventos, reportes, boletines, export PDF/CSV, email, seguridad/RBAC, multi-tenancy, auditoría, responsive/UX, modo oscuro, CI/build/docker.

Método: revisión de repositorio + ejecución real de las suites + inspección de código (backend y frontend) + Playwright (definido). No se creó funcionalidad; no se corrigieron defectos; no se ejecutaron scripts destructivos.

---

## 3. Repository State

- Branch: `main`
- HEAD: `e7dca4a feat(student-follow-ups): complete Observador del Alumno module`
- Tags: `v1.0.0`, `v1.0.1`, **`v1.0.2-rc.1`** (protegidos)
- Cambios sin commit: gran volumen (prompts 90–96 no commiteados). No se realizó commit/push/tag durante esta validación.
- PROMPT 90–96 presentes en `docs/` (85–96). CI configurado en `.github/workflows/ci.yml`.
- Estado: sin modificaciones funcionales inesperadas por parte de esta validación.

---

## 4. Technical Validation

Comandos reales ejecutados (scripts del proyecto):

| Comando | Resultado | Tests | Notas |
|---|---|---|---|
| `npx prisma validate` (apps/api) | PASS | — | Schema válido |
| `npm run typecheck` (api) | PASS | — | tsc --noEmit |
| `npm run typecheck` (web) | PASS | — | tsc --noEmit |
| `npm test` (api) | PASS | 782/782 | 43 suites |
| `npm run test:e2e` (api) | **FAIL parcial** | 666/668 | 2 ambientales reproducibles |
| `npm test` (web) | PASS | 510/510 | 64 suites |
| `npm run build` (api) | PASS | — | nest build |
| `npm run build` (web) | PASS | — | tsc+vite (aviso chunk>500kB) |
| `npx eslint .` (api) | FAIL | 13 errores | preexistente |
| `npx eslint .` (web) | FAIL | 3 err + 1 warn | preexistente |
| Playwright | BLOCKED local | — | puerto 3000 ocupado por API prod |

**E2E — análisis de reproducibilidad (regla FASE 2):**
- Ejecución A (completa): 657/668, 11 fallos en 3 suites (incl. roles con 401).
- Ejecución B (completa): 666/668, 2 fallos (solo tenant-context).
- Ejecución C (completa): 666/668, 2 fallos (solo tenant-context).
- `roles.e2e-spec` en aislamiento: **PASS** → los 401 fueron **transitorios** (interferencia entre suites sobre base compartida), no defecto de producto.
- `tenant-context.e2e-spec` en aislamiento: 2 fallos reproducibles, **ambos ambientales**: `prisma.institution.create({ slug: 'inactive-institution'|'inactive-membership-school' })` choca con `Unique constraint` porque **quedaron instituciones huérfanas en la BD** de corridas anteriores cuyo `finally` nunca limpió. Verificado en BD (slugs presentes). No es defecto funcional: el fixture muere en el setup, antes del aserto `.expect(403)`.

**Clasificación de los errores:** ambientales / de infraestructura de test (test-pollution de base compartida), no funcionales.

---

## 5. Authentication

Evidence: `auth.e2e-spec.ts` (17 casos) + `password-recovery.e2e-spec.ts` (18) + unit `auth.service.spec`, `password-recovery.service.spec`, `password.service.spec`, `email-templates.spec`.

- Login válido/inválido (401), refresh token, perfil, logout, selección/lista de tenants: **PASS**.
- Recovery: mensaje genérico (anti-enumeración), token de un solo uso, expiración, rechazo de token manipulado: **PASS**.

**Resultado: PASS.**

## 6. Roles

Roles reales en el sistema (seed + `permission.constants.ts` ROLE_NAMES): **SUPER_ADMIN** (global), **INSTITUTION_ADMIN**, **TEACHER**, **PARENT**, **STUDENT** (template/tenant). No existe rol "ADMIN" independiente en el set activo (existe la constante `ADMIN` en un enum del esquema, pero no se siembra como rol; el admin de institución es `INSTITUTION_ADMIN`).

Evidence: `roles.e2e-spec.ts` (listado de roles del tenant, denegación teacher, aislamiento cross-tenant), `rbac-authorization.e2e-spec.ts` (20 casos, gating por permisos por rol, SUPER_ADMIN).

**Resultado: PASS** (roles definidos y validados por gating de permisos).

## 7. Dashboard

Evidence: `dashboard.e2e-spec.ts` (8 casos, aislamiento second-institution, cross-tenant negado, 401/403), frontend `DashboardPage.tsx` + `useRoleDashboard`.

- Datos por rol: INSTITUTION_ADMIN/SUPER_ADMIN (stats institucionales + follow-ups completos), TEACHER (cursos), PARENT (hijos), STUDENT (cursos). **PASS.**
- Quick actions gated por permisos (`hasPermission`). **PASS.**
- Estados loading/error/empty presentes. **PASS.**
- No filtra datos de otra institución (e2e cross-tenant). **PASS.**
- Falta de datos de `Student` vinculado al usuario → stats vacías controladas (comportamiento correcto).

**Resultado: PASS** (con nota: estudiante demo sin `Student` vinculado → stats vacías, controlado).

## 8. Administration

Evidence: `institutions.e2e-spec.ts` (18), `users.e2e-spec.ts` (13), `memberships.e2e-spec.ts` (16), frontend `modules/administration` (InstitutionProfile, InstitutionUsers, UserDetail, CreateUser).

- CRUD institucional y de usuarios con búsqueda/paginación/detalle/roles/memberships. **PASS.**
- Aislamiento: admin de A no administra B (e2e cross-tenant → 404/403, fixtures de segundo tenant). **PASS.**
- Feedback de guardado en InstitutionProfile: banner "Cambios guardados correctamente." (mejor que el resto). **ACCEPTABLE.**

**Resultado: PASS.**

## 9. Students

Evidence: `students.e2e-spec.ts` (29), unit `students.service.spec` (19), frontend Students.

- Creación/consulta/edición, relación con institución. **PASS.**
- Formulario gated por `STUDENTS_MANAGE` (PermissionGate). **PASS.**

## 10. Guardians

Evidence: `guardians.e2e-spec.ts` (10), unit `guardians.service.spec` (14), `parent multi-child filtering` en auth.

- Relación acudiente→estudiante, consulta de hijos, acceso únicamente a estudiantes autorizados (padre→estudiante del hijo). **PASS.**

## 11. Courses

Evidence: `courses.e2e-spec.ts` (27), unit `courses.service.spec` (14), frontend Courses.

- CRUD, asignaciones, estudiantes relacionados, aislamiento de tenant. **PASS.**

## 12. Subjects

Evidence: `subjects.e2e-spec.ts` (28), unit `subjects.service.spec` (15), frontend Subjects. **PASS.**

## 13. Teacher Assignments

Evidence: `teacher-assignments.e2e-spec.ts` (18), unit `teacher-assignments.service.spec` (18), frontend TeacherAssignments.

- Asignación docente↔curso↔asignatura, RBAC, tenant. **PASS.**

## 14. Schedules

Evidence: `schedules.e2e-spec.ts` (32), unit `schedules.service.spec` (20), frontend Schedules.

- CRUD, relación curso/materia/docente, filtros, aislamiento. **PASS.** (Verificación de "conflictos de datos" no automatizada; se valida CRUD y aislamiento por e2e.)

## 15. Attendance

Evidence: `attendance.e2e-spec.ts` (33), unit `attendances.service.spec` (36) + `attendance-authorization.spec` (30), frontend Attendance.

- Flujo completo: seleccionar curso/fecha, registrar estados, guardar, consultar, editar, persistencia, autorización fina (crear/leer/modificar/eliminar por rol, docente-curso, padre-hijo), **SUPER_ADMIN sin bypass**, IDOR/cross-tenant negado. **PASS.**
- Comportamiento periodo CLOSED: aviso/banner en UI; bloqueo por lógica de periodo. **PASS.**

## 16. Grades

Evidence: `grades.e2e-spec.ts` (35), unit `grades.service.spec` (26), `school-grades.e2e-spec.ts` (22), frontend Grades.

- Consulta/creación/actualización, relación Grade↔AcademicPeriod, RBAC, tenant, unicidad de código por tenant (409) / cross-tenant permitido, body-tampering rechazado (400). **PASS.**

## 17. Academic Periods

Evidence: `academic-periods.e2e-spec.ts` (30), unit `academic-periods.service.spec` (22), frontend AcademicPeriods. CRUD, RBAC, tenant, cierre. **PASS.**

## 18. Period Closure

Caso obligatorio (crear/modificar calificación en ACTIVE → cerrar → intentar modificar/crear → rechazo → permanece CLOSED):
- Implementado y cubierto por `grades.e2e-spec.ts` + `academic-periods.e2e-spec.ts` + unit `grades.service.spec` (22 del servicio) + `useCloseAcademicPeriod` en frontend.
- No se intentó CLOSED→OPEN. **PASS.**

## 19. Observador del Alumno

Evidence: unit `student-follow-ups.service.spec` (**109**), `student-follow-up-authorization.spec` (42), `follow-up-categories.service.spec` (17), `follow-up-notification.helper.spec` (19), `commitment-overdue.helper.spec` (13); Playwright smoke `observador.spec.ts` (crear, entrada, compromiso, resolver, notificación, confidencialidad 401).

- **Funcionalidad backend y autorización MUT bien cubiertas por unit (~200 casos)**: CRUD, categorías, estados, confidencialidad por rol, IDOR, cross-tenant, entrada, compromiso, adjunto, notificación.
- **GAP de cobertura crítica**: **NO existe `student-follow-ups.e2e-spec.ts`** → el dominio prioritario NUNCA se ejercita por el stack HTTP+DB real. **PARTIAL (validación) / funcionalidad implementada.**
- Frontend completo (lista/detalle/form/categorías) con estados loading/error/empty y confirmaciones.
- Playwright smoke existe y va en CI; ejecución local BLOCKED por puertos.

**Resultado: PASS funcional (por unit) / PARTIAL en cobertura e2e (hallazgo HIGH).**

## 20. Observador Traceability

Determinado por inspección del esquema y servicio:

| Elemento | Estado | Evidencia |
|---|---|---|
| Estudiante | IMPLEMENTADO | FK `studentId` |
| Fecha | IMPLEMENTADO | `createdAt` DateTime |
| Hora | IMPLEMENTADO | DateTime con precisión |
| Autor/responsable | IMPLEMENTADO | `createdById`, `responsibleUserId`/`responsibleRole` |
| Tipo de entrada | IMPLEMENTADO | enum `FollowUpEntryType` |
| Contenido | IMPLEMENTADO | título/resumen/entrada |
| Categoría | IMPLEMENTADO | FK `FollowUpCategory` |
| Acción realizada | IMPLEMENTADO | tipos de entrada + `AuditLog.action` |
| Acción requerida | IMPLEMENTADO | modelo `Commitment` (quién/qué/cuándo/estado) |
| Citación | **NO IMPLEMENTADO** | sin modelo/campo/UI (0 coincidencias "citacion") |
| Notificación a acudiente | IMPLEMENTADO | in-app vía helper a guardianes (gated por confidencialidad) |
| Solicitud de firma | **NO IMPLEMENTADO** | sin FK a seguimiento/entrada/compromiso |
| Firma/recibido | **NO IMPLEMENTADO** | solo en módulo de firmas independiente |
| Compromiso | IMPLEMENTADO | modelo dedicado + state machine + audit |
| Evidencia/archivo | IMPLEMENTADO | `FileAsset` + `FollowUpAttachment` (upload/list/remove) |
| Cambio de estado | IMPLEMENTADO | enum + máquina de estados + audit |
| Fecha de compromiso | IMPLEMENTADO | `Commitment.dueDate` + OVERDUE computado |
| Cumplimiento | IMPLEMENTADO | estado + `completedAt` + audit |
| Historial de modificaciones | IMPLEMENTADO | `AuditLog.oldValues/newValues` JSON |
| Auditoría | IMPLEMENTADO | `AuditLog` (userId, institutionId, action, entityType, entityId, ip, old/new) |

**Estado general de trazabilidad: buena y estructurada (modelos FK + Auditoría dif). GAPS: citación (NO), solicitud de firma desde Observador (NO), firma/recibido por observación (NO).**

## 21. Commitments

Evidence: `Commitment` model + service CRUD + `commitment-overdue.helper` (13) + `follow-up-notification.helper` (19).

- Crear/editar/completar/reabrir, responsable, fecha, cumplimiento, estados, OVERDUE computado en lectura, auditoría, notificación (COMMITMENT_UPDATE). **PASS.**
- GAP: no hay notificación proactiva de vencimiento (solo detección en lectura). **MEDIUM.**

## 22. Attachments

Evidence: `FollowUpAttachment` + `FileAsset`, unit `files.service.spec` (17) + `dev-local-storage.provider.spec` (11), `files.e2e-spec.ts` (18).

- Upload/lista/remoción de evidencias, checksum, auditoría al añadir/remover. **PASS.**

## 23. Communications

Evidence: `communications.e2e-spec.ts` (34), unit `communications.service.spec` (33), frontend Communications + communication-inbox.

- Crear/editar/publicar/desactivar, audiencia (ALL/TEACHERS/PARENTS/STUDENTS), expiración, adjuntos, destinatarios, notificaciones, email (sendCommunication con exclusión del publicador + dedupe). **PASS.**
- Verificado: el publicador no recibe email/notificación duplicada; desigualdad entre instituciones (isolación); comunicación desactivada se comporta como INACTIVE. **PASS.**

## 24. Signatures

Evidence: `signatures.e2e-spec.ts` (29), unit `signatures.service.spec` (26), frontend Signatures.

- Crear solicitud, seleccionar firmantes (por `recipientUserIds` de la institución), publicar (notificaciones in-app `SIGNATURE_REQUEST` + email `sendSignatureRequest`), abrir como firmante, firmar (SIGNED + `signedAt`), declinar, estado COMPLETED cuando todos firman, EXPIRED por dueDate, auditoría. **PASS.**
- **MUY IMPORTANTE — Integración con Observador: NO INTEGRADA.** `SignatureRequest` no tiene FK a `StudentFollowUp`/`FollowUpEntry`/`Commitment` ni citación. No existe "firma por observación/entrada/citación". Módulo **independiente**. → **GAP/HALLAZGO HIGH.**

## 25. Notifications

Evidence: `notifications.e2e-spec.ts` (28), unit `notifications.service.spec` (14), frontend Notifications.

- Enums: `SIGNATURE_REQUEST`, `SIGNATURE_COMPLETED`, `SIGNATURE_DECLINED`, `COMMUNICATION`, `TASK_UPDATE`, `GENERAL`, `STUDENT_FOLLOW_UP`, `COMMITMENT_UPDATE`. **PASS.**
- Lectura, contador `unreadCount` en cada listado, marcar leído (idempotente), marcar todo, eliminar. **PASS.**
- Aparición: se crean en follow-up, entradas, compromisos, comunicaciones, firmas. **PASS.**
- Deduplicación / confidencialidad: notificaciones SON punteros (type/title/message/entity), la confidencialidad se aplica en la capa de acceso a la entidad (no en la notificación). Respeta confidencialidad porque no transportan datos sensibles. **PASS** (nota de diseño).

## 26. Agenda

Evidence: `agenda.e2e-spec.ts` (36), unit `agenda-events.service.spec` (20) + `agenda.service.spec` (18), frontend Agenda + AgendaEvent pages.

- Consulta/creación/edición, fecha/hora/descripción, visualización, filtros por tipo, permisos (AGENDA_READ/CREATE). **PASS — Agenda es operativa (CRUD completo), no solo visualización.**
- Nota UX: eventos sin `route` renderizan como botón sin acción (placeholder), listado "Agenda" clásico en paralelo al nuevo "eventos". **LOW.**

## 27. Reports

Evidence: `reports.e2e-spec.ts` (18), unit `reports.service.spec` (14) + `reports-authorization.spec` (19), frontend Reports + CourseReport.

- Reporte de estudiante, reporte de curso, consolidación por estudiante+periodo, aislamiento tenant (todos los queries `institutionId`), confidencialidad de Observador excluida para no-admins, comportamiento con datos vacíos (sin errores), RBAC con IDOR probado. **PASS.**

## 28. Bulletin

Evidence: endpoint `GET /reports/students/:id/bulletin` (+ export). Consolidación por estudiante+periodo; datos vacíos manejados ("No hay calificaciones…"). **PASS.**

## 29. PDF/CSV

Evidence: `report-pdf.ts` (PDFKit, A4), `report-csv.ts` (RFC-4180 + BOM). Endpoints `/export` (PDF/CSV) y course CSV. **PASS.**

## 30. Email

Evidence: revisión de `auth/services/email/*`, `auth.module.ts`, unit `email-templates.spec` (5).

- Provider selection: `SMTP_HOST` set → SmtpEmailProvider; si no → DevEmailProvider. **PASS.**
- Plantillas (reset/comm/signature) usan `APP_WEB_URL`, escape HTML; test explícito de XSS. **PASS.**
- Communications → `sendCommunication` (excluye publicador, dedupe). **PASS.**
- Signatures → `sendSignatureRequest` + notificación. **PASS.**
- No hay credenciales comprometidas: `.env.example` con placeholders vacíos. **PASS.**
- **SMTP real NO configurado en este entorno** → envío real (transmisión SMTP) **BLOCKED/NOT CONFIGURED** (por regla no se solicita ni configuran credenciales). La infraestructura Dev funciona (log) y las plantillas están probadas.

## 31. Security

Evidence: `rbac-authorization.e2e-spec.ts` (20), `tenant-context.e2e-spec.ts` (17), `roles.e2e-spec.ts`, `institutions/students/school-grades` (body-tampering → 400), unit authorization/guard.

- Tenant isolation, IDOR, BOLA, RBAC resource-level, DTO authority fields, JWT, refresh, headers, CORS (en CI env), `SUPER_ADMIN` sin bypass en recursos tenant. **PASS.**
- Acceso directo por URL/API: el frontend **no tiene guard de ruta por rol** (solo `ProtectedRoute` auth); el gating es por componente (`PermissionGate`/`hasPermission`). El backend **sí** protege cada endpoint con guards+permisos, por lo que escribir una URL no concede acceso a datos (el backend devuelve 403/404). **PASS a nivel de datos** (el backend es la fuente de verdad); **LOW/MEDIUM UX**: rutas frontend visibles a usuarios sin permiso muestran tarjeta "sin permiso" en lugar de redirigir.
- Rate limiting: no verificado/evidenciado en este flujo (no documentado como bloqueado de forma excluyente). **INFO.**

## 32. Tenant Isolation

Evidence: `tenant-context` (17), `dashboard` (8, aislamiento), `rbac-authorization` (segundo tenant), fixtures de segundo tenant en la mayoría de specs. Aislamiento verificado de forma **robusta** (404 cross-tenant, membresía ACTIVE, inactive → 403, SUPER_ADMIN bypass definido). **PASS.**

## 33. Audit

Evidence: `AuditService.log()` en todas las mutaciones de Observador (tabla de acciones §20), NotificationsService (`NOTIFICATION_CREATED`), comunicaciones/firmas/calificaciones/cierre. Registra actor (userId), institución, acción, entidad, old/new JSON, ip, fecha/hora. **PASS.**

## 34. UX/UI

Verdicto global: **ACCEPTABLE con problemas.**

- GOOD: estados loading/error/empty consistentes (Spinner/EmptyState/ErrorState), confirmaciones modales para acciones destructivas/transiciones, doble render tablas/cards mobile, responsive sólido, skip-link y a11y básica.
- PROBLEMA (MEDIUM): 
  - **Fuga de UUIDs internos al usuario** en muchas páginas (tarjetas "Metadatos" de detalle muestran `id`/`institutionId` full; la lista de calificaciones muestra `studentId.slice(0,8)…`/`courseId.slice(0,8)…`/`subjectId.slice(0,8)…` en `font-mono` como si fueran nombres).
  - **Formulario de firmas pide pegar UUIDs crudos** (`placeholder="uuid-1, uuid-2..."`): UX técnico/bloqueante para seleccionar firmantes.
  - **Sin sistema de toasts**: el feedback de guardado es inconsistente (algunos navegan sin confirmación; pocos muestran banner inline).
  - `ErrorState` en inglés ("Something went wrong") y expone "Request ID". 
  - Mezcla de `window.confirm()` con modales propios.
  - Lista de asistencia muestra id crudo cuando no encuentra nombre en mapa cliente.
- INFO/LOW: `ErrorState` por defecto en inglés; botones de navegación como `<button>` en lugar de `<Link>`.

## 35. Dark Mode

**NO IMPLEMENTADO** (determinado por inspección real): sin selector, sin persistencia, sin ThemeProvider, sin `@media (prefers-color-scheme)`, sin clases `dark:`. Aplicación exclusivamente en modo claro. (No se implementó durante este prompt.)

## 36. Responsive

**GOOD.** Viewport meta presente; hamburguesa/drawer móvil (AppLayout/Topbar/Sidebar); doble render tabla→cards en Students, Grades, Follow-ups, Communications, Signatures, Attendance, Admin; grid responsive en Dashboard/Reports/Agenda/Login. Se valida por inspección de código (ejecución móvil en navegador no realizada por limitación de entorno; clasificado según evidencia de código).

## 37. CI/CD

Evidence: `.github/workflows/ci.yml` — jobs `lint`, `typecheck`, `test` (unit), `api-e2e` (jest runInBand + postgres service + migrate deploy + seed), `build`, `docker-build` (compose build api/web + config --quiet con secrets de verificación), `e2e` (Playwright chromium con dev servers en un paso). Pipeline completo y bien configurado.

**Problema:** el job `lint` ejecuta `npm run lint` (todo el repo) y **fallaría** por los 13+4 errores preexistentes. También `api-e2e` podría ser inestable por la contaminación de fixtures (aunque en CI cada job arranca una BD nueva con `migrate deploy`+seed, por lo que la contaminación local no aplica en CI; sí es un riesgo de mantenimiento local). **MEDIUM.**

## 38. Findings

### BLOCKER
Ninguno.

### CRITICAL
Ninguno.

### HIGH
- **H1 — Firmas no integradas con el Observador**: no hay FK de `SignatureRequest` a seguimiento/entrada/compromiso/citación; no existe "firma por observación/entrada/citación"; no se puede solicitar firma desde un seguimiento. (Funcionalidad GAP real; los módulos funcionan por separado.)
- **H2 — "Citación" inexistente**: no hay modelo/campo/UI (0 coincidencias en API+web).
- **H3 — Observador sin cobertura e2e**: dominio prioritario solo probado por unit (~200 casos); sin `student-follow-ups.e2e-spec.ts` por el stack HTTP+DB.
- **H4 — Suite e2e no reproducible sobre BD compartida**: fixtures huérfanos + intermittencia (9 fallos transitorios no reproducibles); 2 fallos permanentes ambientales en tenant-context.

### MEDIUM
- **M1 — Lint en rojo** (API 13 / Web 4) → el job `lint` del CI falla.
- **M2 — Fondos oscuros ausentes** el modo oscuro NO existe (podría ser requerimiento de piloto).
- **M3 — Notificaciones de Observador solo in-app** (sin canal email, a diferencia de firmas/comunicaciones); sin notificación proactiva de compromiso vencido.
- **M4 — Fuga de UUIDs internos en la UI** (Metadatos + calificaciones) y formulario de firmas pide UUIDs crudos.
- **M5 — Sin sistema de toasts**; feedback de guardado inconsistente; `ErrorState` en inglés.

### LOW
- **L1** — Eventos de agenda sin `route` son botones sin acción.
- **L2** — Mezcla de `window.confirm()` vs modales; botones `<button>` en vez de `<Link>`.
- **L3** — Rutas frontend sin guard de rol a nivel URL (backend lo protege; UX muestra tarjeta "sin permiso").
- **L4** — Dashboard de estudiante demo vacío (sin `Student` vinculado) — controlado.
- **L5** — Aviso de chunk>500kB en build web.

### INFO
- No hay `citacion`, ni firma por observación, ni email de seguimiento — registrados.
- `SUPER_ADMIN` sin bypass en tenant resources; acceso dashboard tratado como INSTITUTION_ADMIN.
- Rate limiting no evidenciado en la validación.

## 39. Acceptance Matrix

| ID | Área | Funcionalidad | Resultado | Evidencia | Severidad | Observación |
|---|---|---|---|---|---|---|
| A1 | Autenticación | Login/logout/refresh | PASS | auth e2e 17 | — | |
| A2 | Autenticación | Password recovery | PASS | password-recovery e2e 18 | — | Anti-enumeración, token único |
| B1 | Roles | Set de roles | PASS | seed+ROLE_NAMES | — | SUPER_ADMIN, INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT |
| B2 | RBAC | Gating por permisos | PASS | rbac e2e 20 | — | Sin rol ADMIN separado |
| C1 | Dashboard | Por rol + aislamiento | PASS | dashboard e2e 8 | — | |
| D1 | Admin | Inic/Usuarios/Roles | PASS | institutions/users/memberships e2e | — | Aislamiento cross-tenant |
| E1 | Estudiantes | CRUD | PASS | students e2e 29 | — | |
| F1 | Acudientes | Relación hijos | PASS | guardians e2e 10 | — | |
| G1 | Cursos | CRUD | PASS | courses e2e 27 | — | |
| H1 | Materias | CRUD | PASS | subjects e2e 28 | — | |
| I1 | Docentes | Asignaciones | PASS | teacher-assignments e2e 18 | — | |
| J1 | Horarios | CRUD | PASS | schedules e2e 32 | — | |
| K1 | Asistencia | Flujo completo+authz | PASS | attendance e2e 33 + authz unit 30 | — | SUPER_ADMIN sin bypass |
| L1 | Calificaciones | CRUD+relación periodo | PASS | grades e2e 35 | — | |
| M1 | Períodos | CRUD | PASS | academic-periods e2e 30 | — | |
| M2 | Cierre de período | Bloqueo post-cierre | PASS | grades e2e + unit 22 | — | Case obligatorio cumplido |
| N1 | Observador | Funcionalidad | PASS | unit ~200 + Playwright smoke | HIGH(H3) | Sin e2e HTTP+DB |
| N2 | Observador | Trazabilidad | PARTIAL | esquema+servicio | HIGH(H1,H2) | GAP citación + firma/recibido |
| O1 | Compromisos | CRUD+overdue | PASS | commitment-overdue 13 | MEDIUM(M3) | Sin notif. vencimiento proactiva |
| P1 | Adjuntos | Evidencias | PASS | files e2e 18 + unit | — | |
| Q1 | Comunicaciones | CRUD+audiencia+email | PASS | communications e2e 34 | — | Excluye publicador, dedupe |
| R1 | Firmas | Flujo independiente | PASS | signatures e2e 29 | HIGH(H1) | No integradas con Observador |
| S1 | Notificaciones | Lectura+contador+tipos | PASS | notifications e2e 28 | — | |
| T1 | Agenda | Operativa CRUD | PASS | agenda e2e 36 | LOW(L1) | Eventos sin route placeholder |
| U1 | Reportes | Estudiante/curso | PASS | reports e2e 18 + authz | — | Confidencialidad respetada |
| V1 | Boletines | Consulta/export | PASS | bulletín controlador | — | |
| W1 | PDF/CSV | Export | PASS | report-pdf/csv | — | |
| X1 | Email | Infra+plantillas | PASS | email-templates unit 5 | MEDIUM(M6) | SMTP real BLOCKED/no config |
| Y1 | Seguridad | RBAC/IDOR/BOLA | PASS | rbac/tenant e2e + unit | — | |
| Z1 | Multi-tenancy | Aislamiento | PASS | tenant-context 17 + fixtures | HIGH(H4) | inestabilidad e2e por BD compartida |
| AA1 | Auditoría | Trazabilidad | PASS | AuditService + Observador | — | Actores/entidad/old-new/ip |
| AB1 | UX/UI | Estados/feedback | PROBLEMA | frontend | MEDIUM(M4,M5) | UUIDs, toasts, error en inglés |
| AC1 | Modo oscuro | — | NOT IMPLEMENTED | inspección | MEDIUM(M2) | Solo modo claro |
| AD1 | Responsive | Desktop/tablet/móvil | PASS | código (dual render) | — | Validado por inspección |
| AE1 | CI/CD | Pipeline | PARTIAL | ci.yml | MEDIUM(M1) | lint rojo |
| AF1 | Playwright | Smoke | CONFIGURED | observador.spec + ci | — | Local BLOCKED (puertos) |

## 40. Pilot Readiness

- Flujos centrales (auth, RBAC, admin, estudiantes/acudientes/cursos, asistencia, calificaciones, cierre, comunicaciones, firmas independientes, notificaciones, agenda, reportes/export) **funcionan y están validados** (backend con e2e+unit verde, frontend con vitest verde).
- Seguridad/tenant-isolation **validada de forma robusta** (sin BLOCKER ni CRITICAL).
- Existen **HIGH** que no impiden un piloto controlado pero deben corregirse pronto: integración firmas↔Observador, citación, Observador sin e2e, inestabilidad e2e en BD compartida, lint rojo.
- Modo oscuro inexistente; UX con fugas de UUIDs y sin toasts (aceptables para un piloto interno acotado, mejorables antes de staging).

## 41. Remaining Gaps

1. Integración firmas↔Observador (solicitar firma desde seguimiento/entrada/compromiso; vinculación y visualización) — **NO implementar durante este prompt**.
2. Entidad "citación" — inexistente.
3. `student-follow-ups.e2e-spec.ts` — ausente.
4. Limpieza/aislamiento del fixture compartido de e2e (riesgo de contaminación local).
5. Errorres de lint preexistentes (13 API / 4 Web) que rompen el job `lint` de CI.
6. Modo oscuro — inexistente.
7. Mejoras de UX (UUIDs, selector de firmantes por nombre, toasts, localización de errores).

## 42. Recommended Action

- **No ampliar alcance ni corregir en este prompt** (se documenta). 
- Antes de un piloto amplio o de staging productivo, priorizar: (1) integración firmas↔Observador y soporte de citación, (2) e2e para Observador + saneamiento de la suite compartida, (3) dejar el job `lint` de CI en verde, (4) decidir requerimiento de modo oscuro, (5) correcciones de UX de fuga de UUIDs y selector de firmantes.
- Para un **piloto controlado inmediato**, el producto es utilizable: los flujos centrales y la seguridad están en condiciones; los HIGH listados no bloquean la operación básica diaria de una institución piloto pequeña.

## 43. Final Verdict

**B. READY FOR PILOT WITH FIXES**

Justificación: no existen BLOCKER ni CRITICAL; los flujos centrales funcionan y están validados; la seguridad y el aislamiento multi-tenant están correctamente protegidos (respondido por e2e+unit). Sin embargo, existen HIGH conociados (integración firmas↔Observador, citación ausente, Observador sin e2e, inestabilidad e2e sobre base compartida, lint rojo en CI) y MEDIUM (modo oscuro, UX de UUIDs/toasts, notificaciones Observador solo in-app) que deben atenderse antes de declarar staging productivo o un piloto amplio. El producto puede ser usado por una institución piloto controlada bajo estas condiciones.

---

## FINAL REPORT — PROMPT 97 — VALIDACIÓN FUNCIONAL INTEGRAL — COMPLETE

**Estado general:** VALIDADO (gate de producto) · Sin BLOCKER · Sin CRITICAL · **Veredicto: READY FOR PILOT WITH FIXES**

- **Tests:** API unit 782/782 · API E2E 666/668 (2 ambientales) · Web Vitest 510/510 · typechecks/builds PASS · **lint FAIL (prexistente)**
- **Funcionalidades PASS:** autenticación, RBAC/roles, dashboard, admin, estudiantes, acudientes, cursos, materias, docentes, horarios, asistencia, calificaciones, períodos+cierre, observador (funcional), compromisos, adjuntos, comunicaciones, firmas (independientes), notificaciones, agenda, reportes, boletines, PDF/CSV, email (infra), seguridad, tenancy, auditoría, responsive
- **Funcionalidades PARTIAL:** Observador (sin e2e), trazabilidad (GAP firma/recibido y citación), CI (lint rojo)
- **Funcionalidades NOT IMPLEMENTED:** modo oscuro; "citación"; firma por observación/entrada/citación; integración firmas↔Observador; email de seguimientos; notificación proactiva de compromiso vencido
- **BLOCKER:** 0 · **CRITICAL:** 0 · **HIGH:** 4 (H1 firmas↔Observador, H2 citación, H3 Observador sin e2e, H4 e2e no reproducible) · **MEDIUM:** 5 · **LOW:** 5
- **Estado Observador:** funcional y con autorización robusta (unit ~200 + Playwright smoke); **sin e2e HTTP+DB**
- **Estado firmas:** módulo independiente funcional (29 e2e/26 unit); **NO integrado con Observador**
- **Estado trazabilidad:** buena y estructurada (FKs + Auditoría dif); GAP citación y firma/recibido
- **Estado modo oscuro:** **NO IMPLEMENTADO**
- **Estado responsive:** **GOOD** (doble render table/card, drawer móvil, viewport)
- **Estado seguridad:** **PASS** (RBAC, IDOR, BOLA, tenancy, body-tampering, SUPER_ADMIN sin bypass)
- **Estado staging:** readiness técnica OK (Docker, CI completo, health checks); no se realizó deployment
- **Veredicto final:** **B — READY FOR PILOT WITH FIXES** (corregir HIGH antes de piloto amplio/staging productivo)
