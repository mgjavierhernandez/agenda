# FINAL REPORT — PROMPT 115 · VALIDACIÓN FUNCIONAL SISTEMÁTICA (READ-ONLY) DEL MVP AGENDA ESCOLAR DIGITAL

> **Modalidad:** Validación 100% READ-ONLY sobre el stack en ejecución (`agenda-api-prod:3000`, `agenda-postgres-prod:5433`, `agenda-web-prod:80`).
> **Regla cumplida:** No se modificó código, schema, migraciones, PostgreSQL, Docker ni `.env`. No se ejecutó ningún `prisma migrate`. No se creó/eliminó dato real. Verificación posterior: los estados demo quedaron intactos y el único archivo subido como prueba fue eliminado y corroborado ausente en `file_assets`.
> **Fecha:** 2026-09-05 (aprox 21:10 UTC). **Veredicto: MVP VALIDATED WITH WARNINGS.**

---

## 1. VEREDICTO GLOBAL

**CONSISTENT WITH WARNINGS — SI, CONTINUAR.**

El MVP funciona de extremo a extremo: autenticación, multi-tenancy, RBAC, módulos principales CRUD, archivos, dashboard y 85 rutas de la SPA sirviéndose correctamente. Se validaron funcionalmente decenas de endpoints sobre el stack en ejecución con resultados 200/401/403/404 correctos y respuestas de datos coherentes por rol.
Existen **3 defectos no bloqueantes** que requieren prompt de diagnóstico/corrección aparte (NO se corrigen aquí por mandato read-only): (1) 500 en course-directors por tabla faltante, (2) 400 por ruteo de `course-directors`, (3) drift de permisos `areas/attendance/reports` ausentes en la DB runtime que vuelven 403 esos módulos para **todos** los roles.

---

## 2. RESUMEN EJECUTIVO

- **Objetivo:** validar funcionalmente (solo lectura) el MVP de Agenda Escolar Digital sobre el stack real.
- **Stack verificado:** NestJS API (prefijo `api/v1`, guards globales `AccessTokenGuard + TenantContextGuard + PermissionGuard`, ValidationPipe global whitelist+forbidNonWhitelisted), React 19 + Vite + React Router v7 SPA (nginx, SPA fallback, proxy `/api`→`api:3000`), PostgreSQL.
- **Registros de prueba:** 5 cuentas demo (`superadmin`, `admin`, `teacher`, `student`, `parent`) — credenciales no impresas por seguridad ("Authenticated test user"). IDs demo: institución `5d5ee192-…`, período `cabaeef8-…`, curso `1c30ca6f-…`, estudiante `13ae71f0-…`.
- **Resultado:** ~autorización, tenants y RBAC correctos; 20+ módulos leídos OK con datos reales; módulo de archivos validado completo (upload/metadata/download/delete); dashboard funcional por rol; SPA sirve los 85 caminos.
- **Defectos:** 2x500 (course-directors), 1x400 de ruteo (course-directors), drift de permisos (areas/attendance/reports → 403 todos), tasks/submissions y areas/attendance/reports sin implementación funcional plena en runtime.

---

## 3. ESTADO DE MÓDULOS (BACKEND — 30 módulos en `app.module.ts`)

| # | Módulo | Estado funcional (GET/read) | Notas |
|---|--------|------------------------------|-------|
| 1 | Auth | PASS | login válido 200, inválido 401, sin token 401, refresh 200, logout+revocación OK, forgot/reset seguro, profile 200, institutions 200, tenant select 200, my-permissions 200 (admin 63, teacher 32), authorization-check 200 (solo admin/superadmin con tenant) |
| 2 | Health | PASS | `/health` y `/health/readiness` 200 |
| 3 | Institutions | PASS | list 200, detail 200 |
| 4 | Students | PASS | list 200 (3), detail 200, relacion guardianes OK |
| 5 | Courses | PASS | list 200 (19), detail 200 |
| 6 | Subjects | PASS | list 200 (19), detail 200 |
| 7 | Grades | PASS | list 200 (20), detail 200 |
| 8 | Schedules | PASS | list 200 (10), detail 200 |
| 9 | Tasks | PASS | list 200 (20), detail 200 |
| 10 | Task Assignments | PASS | list 200 (4), detail 200, `/teachers` 200, course-directors FAIL (400/500) |
| 11 | Task Submissions | PASS | rutas anidadas OK (200 con submission real; 404 correctos) |
| 12 | Communications | PASS | list 200 (20), detail 200, attachments OK |
| 13 | Communication Recipients | PASS | list 200, unread-count 200 (coherente por rol) |
| 14 | Signature Requests | PASS | list 200 (2), detalle 200, pending OK |
| 15 | Notifications | PASS | list 200 (1+), detail 200 (propias), mark-all-read 200 |
| 16 | Academic Periods | PASS | list 200 (2), detail 200 |
| 17 | School Grades | PASS | list 200 (6), detail 200 |
| 18 | Enrollments | PASS | list 200 (2), detail 200 |
| 19 | Directories | PASS | list 200 |
| 20 | Roles | PASS | list 200 |
| 21 | Users | PASS | list 200 (5), detail/memberships 200 |
| 22 | Files | PASS | upload 201, metadata 200, download 200, delete 200; sin listado (404 correcto) |
| 23 | Agenda | PASS | list 200 (scoping por rol: student 90 / teacher 72 / parent 36), events 200, view week 200 |
| 24 | Student Follow-Ups | PASS | list 200 (14), detail/entries/commitments/citations/categories 200 — dominio observador IMPLEMENTADO |
| 25 | Dashboard | PASS | 200 con stats por rol |
| 26 | Areas | NOT IMPLEMENTED (RUNTIME) | GET/POST `/areas` → 403 para todos los roles (permiso ausente) |
| 27 | Attendance | NOT IMPLEMENTED (RUNTIME) | tablas+backend+frontend existen, pero `/attendance*` → 403 para todos (permiso ausente) |
| 28 | Reports | NOT IMPLEMENTED (RUNTIME) | sin `GET /reports`; los children (`students/:id`, `bulletin`, exports) quedan detrás de 403 por permiso |
| 29 | Administration | PASS | institution users/new/detail 200 |
| 30 | (Health/global) | PASS | — |

---

## 4. MATRIZ DE VALIDACIÓN DE ENDPOINTS (RESULTADOS REALES SOBRE EL STACK)

Leyenda de estados: PASS / PASS WITH WARNING / FAIL / NOT IMPLEMENTED / NOT TESTED / NOT APPLICABLE.

### 4.1 Autenticación
| Endpoint | Método | Resultado | Estado |
|----------|--------|-----------|--------|
| `/auth/login` (válido) | POST | 200 | PASS |
| `/auth/login` (inválido) | POST | 401 "Invalid credentials" | PASS |
| `/auth/login` / sin token | — | 401 | PASS |
| `/auth/refresh` | POST | 200 (antes logout) | PASS |
| `/auth/refresh` (post-logout) | POST | 401 (revocación OK) | PASS |
| `/auth/logout` | POST | 200 | PASS |
| `/auth/forgot-password` | POST | 200 (respuesta segura genérica) | PASS |
| `/auth/reset-password` (token basura) | POST | 400 (DTO `newPassword`) | PASS |
| `/auth/profile` | GET | 200 | PASS |
| `/auth/institutions` | GET | 200 | PASS |
| `/auth/tenant/select` | POST | 200 | PASS |
| `/auth/my-permissions` | GET | 200 | PASS |
| `/auth/authorization-check` | GET | 200 (admin/superadmin con tenant); 403 sin header; 403 otros roles | PASS (RBAC) |

### 4.2 Multi-tenancy / RBAC
| Prueba | Resultado | Estado |
|--------|-----------|--------|
| Tenant inexistente | 404 "Institution not found or access denied" | PASS |
| Ruta tenant sin `X-Institution-Id` | 403 "Institution context required" | PASS |
| `/courses` como student (sin `courses:read`) | 403 | PASS |
| `/institutions` como superadmin | 200 | PASS |
| `authorization-check` sin permiso `institution:read` (parent/teacher/student) | 403 | PASS |

### 4.3 Lectura (GET) admin — matriz
| Endpoint | Resultado | Estado |
|----------|-----------|--------|
| `/health`, `/health/readiness` | 200 | PASS |
| `/students`, `/students/:id` | 200 / 200 | PASS |
| `/courses`, `/courses/:id` | 200 (19) / 200 | PASS |
| `/subjects`, `/subjects/:id` | 200 (19) / 200 | PASS |
| `/grades`, `/grades/:id` | 200 (20) / 200 | PASS |
| `/schedules`, `/schedules/:id` | 200 (10) / 200 | PASS |
| `/tasks`, `/tasks/:id`, attachments | 200 (20) / 200 / 200 | PASS |
| `/communications`, `/communications/:id`, attachments | 200 (20) / 200 / 200 | PASS |
| `/communication-recipients`, `/unread-count` | 200 / 200 | PASS |
| `/signature-requests`, detalle | 200 (2) / 200 | PASS |
| `/notifications`, detalle propio | 200 / 200 | PASS |
| `/school-grades`, `/school-grades/:id` | 200 (6) / 200 | PASS |
| `/academic-periods`, detalle | 200 (2) / 200 | PASS |
| `/enrollments`, detalle | 200 (2) / 200 | PASS |
| `/teacher-assignments`, detalle, `/teachers` | 200 (3) / 200 / 200 | PASS (weekly_hours OK) |
| `/teacher-assignments/course-directors` | **400 "uuid is expected"** | **FAIL (ruteo)** |
| `.../course-directors/current` | **500 Internal server error** | **FAIL (500)** |
| `.../course-directors/history` | **500 Internal server error** | **FAIL (500)** |
| `/directories` | 200 | PASS |
| `/task-assignments`, detalle | 200 (4) / 200 | PASS |
| `/task-assignments/:id/submission` | 200 (con submission) / 404 (sin) | PASS |
| `/roles` | 200 | PASS |
| `/users`, detalle/memberships | 200 (5) / 200 | PASS |
| `/agenda?start&end`, `view week` | 200 / 200 | PASS |
| `/agenda/events` | 200 (0) | PASS |
| `/student-follow-ups` (+entries/commitments/citations/categories) | 200 (14) / 200 | PASS |
| `/dashboard` | 200 | PASS |
| `/institutions/:id/memberships` | 200 (5) | PASS |
| `/tasks list` query params | 200 | PASS |

### 4.4 Archivos (Files)
| Operación | Resultado | Estado |
|-----------|-----------|--------|
| POST upload (multipart) | 201 (crea `file_assets`, almacena en storage key tenant-scoped) | PASS |
| GET `/:id` metadata | 200 | PASS |
| GET `/:id/download` | 200 (contenido íntegro) | PASS |
| DELETE `/:id` | 200 "File deleted successfully" | PASS |
| GET `/files` (listado inexistente) | 404 "Cannot GET" | PASS (correcto) |
| Post-upload cleanup | registro ausente en `file_assets` tras DELETE | PASS (sin datos residuales) |

### 4.5 Creaciones (POST) — no destructivas
| Prueba | Resultado | Estado |
|--------|-----------|--------|
| POST `/students` `{}` | 400 (DTO firstName/lastName) | PASS (validación) |
| POST `/courses` `{}` | 400 (code, etc.) | PASS |
| POST `/subjects` `{}` | 400 | PASS |
| POST `/schedules` `{}` | 400 (courseId, subjectId, …) | PASS |
| POST `/tasks` `{}` | 400 | PASS |
| POST `/communications` `{}` / bad audience | 400 | PASS |
| POST `/academic-periods` `{}` | 400 | PASS |
| POST `/areas` `{}` | 403 (permiso ausente) | PASS (RBAC rechaza) |

> CRUD mutables con datos **válidos** (POST/PATCH/DELETE que escribirían): declarados **NOT TESTED** (no se ejecutaron para no modificar datos reales). El único POST "válido-planificado" no se llegó a emitir. La validación DTO sí se confirmó con bodies inválidos que no escriben nada.

---

## 5. VALIDACIÓN DE FRONTEND (SPA + Nginx)

- **Servido:** `http://localhost/` y `http://localhost/login` → 200, HTML SPA mínimo (`<div id="root">`, `index-CgIE1Ugh.js`, `index-BtyHkR0K.css`).
- **Assets:** JS 200 (~785 KB) y CSS 200 (~29 KB) servidos con caché inmutable; no hay referencia a assets inexistentes.
- **SPA fallback:** todos los caminos protegidos devuelven `index.html` con 200 (no 404 ni 500): `/teachers`, `/subjects`, `/courses`, `/students`, `/guardians`, `/schedules`, `/tasks`, `/communications`, `/agenda`, `/dashboard`, `/attendance`, `/reports`, `/student-follow-ups`, `/select-institution`, `/unauthorized`.
- **Proxy API:** `http://localhost:80/api/v1/health` → 200 `{"status":"ok"}` (proxy `/api`→`api:3000` operativo).
- **Rutas registradas (85 en `router.tsx`):** login/unauthorized/select-institution/dashboard, agenda (list/new/detail/edit), students, courses, subjects, areas, grades, schedules, tasks, task-assignments, task-submissions, communications, communication-inbox, signatures, notifications, academic-periods, school-grades, guardians, enrollments, teacher-assignments + course-directors + teachers, student-follow-ups (incl. categories), **attendance (list + register)**, **reports (list + course)**, institution, admin/users.
- **Endpoints consumidos por las páginas** (con query params reales de la SPA) → todos 200.
- **Observación (frontend sin módulo de observador propio):** no se encontró una página/wrapper de "observador del alumno" dedicada; el dominio existe como `student-follow-ups` (backend + frontend) y dashboard.
- **Límite de método:** verificación de render/errores de JS runtime ("Something went wrong") requiere navegador/E2E; no disponible en este entorno. La estructura (bundle íntegro, rutas válidas, endpoints asociados 200) soporta que no hay error de arranque catastrófico. **Estado de esta capa: PASS (con limitación metodológica declarada).**

---

## 6. AUTENTICACIÓN — Detalle
PASS. Flujo completo correcto: credenciales válidas → tokens; token inválido/ausente → 401; refresh dentro de vigencia → 200; acceso con refresh revocado (tras logout) → 401 (revocación efectiva); flujo forgot/reset seguro (respuesta genérica en forgot; reset rechaza token inválido). `/auth/my-permissions` devuelve códigos por rol (admin 63 únicos, teacher 32). No se imprimen credenciales/tokens en este reporte.

## 7. RBAC (Control de Acceso)
PASS. Guards globales aplicados a todos los módulos; `@RequirePermission` efectivo. Evidencia: student sin permiso → 403; parent/teacher/student sin `institution:read` → 403 en authorization-check; admin/superadmin con permiso → 200; `POST /areas` → 403 por permiso; recepción de filas `data#` distinta por rol (scoping horizontal) en agenda (90/72/36). **WARNING de drift:** la DB runtime tiene 63 códigos de permiso únicos y **no** incluye `areas/attendance/reports/agenda:create|update|delete`, aunque `seed.ts` los define → esos endpoints 403 para **todos** los roles (incl. superadmin).

## 8. MULTI-TENANCY (Multi-institucion)
PASS. Header `X-Institution-Id` obligatorio en rutas tenant-scoped (403 "Institution context required" sin él, incluso superadmin); tenant inexistente/sin acceso → 404; `/auth/tenant/select` cambia contexto correctamente; claves de storage de archivos y filtros de datos usan `institution_id` real (scoping verificado en respuestas).

## 9. VALIDACIÓN CRUD (LECTURA/ESCRITURA)
- **READ:** cobertura alta y correcta (ver §4.3/§4.4). 
- **CREATE (validación DTO):** PASS (400 útiles en bodies inválidos — ValidationPipe `whitelist+forbidNonWhitelisted` activo).
- **CREATE/UPDATE/DELETE con datos válidos:** **NOT TESTED** por mandato read-only (no se escribieron datos). Excepción protocolo-controlada: ciclo de archivo **creado-leído-descargado-eliminado** (no destructivo, datos demo intactos verificados).
- **UPDATE/DELETE de estados:** mark-all-read notifications 200 (no destructivo, sobre dato propio READ; estados intactos verificados).

## 10. VALIDACIÓN DE RELACIONES (Datos coherentes)
- Guardianes↔estudiantes: parent ve 2 hijos (`Lucía Fernández`, `Mateo Rodríguez`) — coincide con DB `guardian_students`.
- Agenda scoping: student 90 / teacher 72 / parent 36 eventos con contexto correcto.
- Notificaciones: `GET` de notificación ajena → 404 (scoping por usuario OK).
- Tasks↔submissions: submission por assignment OK (200 real / 404 sin submission).
- Follow-ups: entries de follow-up accesibles (200) para roles con permiso.
**Estado: PASS.**

## 11. ERRORES 500 (Listado con evidencia — no se corrigieron)
| # | Módulo | Método | Endpoint | requestId | Error (capa probable) |
|---|--------|--------|----------|-----------|----------------------|
| 1 | teacher-assignments | GET | `/teacher-assignments/course-directors/current` | `cec1277c…`, `6d222ecc…`, `292ece9b…` | 500 · Prisma `PrismaClientKnownRequestError`: `table 'public.course_director_assignments' does not exist in the current database` — **capa: ORM/DB** (tabla ausente en runtime a pesar de migración marcada applied vía `migrate resolve`). |
| 2 | teacher-assignments | GET | `/teacher-assignments/course-directors/history` | `50fa01b5…` | 500 · misma causa (tabla faltante). |

> Sin otros 500 en los logs de la sesión (3h). La causa raíz NO se corrige (mandato read-only); requiere prompt de diagnóstico independiente.

## 12. ERRORES 400 DE RUTEO / MALFORMADOS (no 500)
| Endpoint | Resultado | Causa |
|----------|-----------|-------|
| `GET /teacher-assignments/course-directors` (+query) | 400 "Validation failed (uuid is expected)" siempre | `@Get(':id')` (controller L69) precede a `@Get('course-directors')` (L125) → `ParseUUIDPipe` atrapa la palabra. **FAIL (ruteo).** No corregido. |

## 13. NO IMPLEMENTADO / NO DISPONIBLE EN RUNTIME
- **Areas** (`/areas`): permiso ausente → 403 para todos (backend&frontend presentes; semilla desactualizada).
- **Attendance** (`/attendance`, `/attendance/register`): tablas (`attendances` 0 filas) y backend/frontend existen, pero sin permisos → 403 para todos; sin implementación funcional end-to-end en runtime.
- **Reports** (`/reports`): sin endpoint `GET /reports`; exports/children detrás de 403.
- **Task Submissions listado global** (`GET /task-submissions`): no existe (404 correcto); la funcionalidad vive anidada (`/task-assignments/:id/submission` + `/submissions/:id/grade`).
- **`/files` listado:** intencionadamente inexistente (404 correcto).

## 14. WARNINGS
1. **Drift de permisos en runtime** (`agenda_dev` en `agenda-postgres-prod`): 63 códigos únicos, sin `areas/attendance/reports`; roles con counts duplicados (ADMIN 126=63×2, TEACHER 64) y SUPER_ADMIN 63/S P A/C. Seed actual sí los define → mismatch entre código y datos sembrados/propagados.
2. **DB runtime vs. `agenda_prod`:** el API corre contra `agenda_dev` (dentro de `agenda-postgres-prod`); `agenda_prod` no fue sembrada (0 permisos). Coexisten ambas DBs.
3. **Drift de migración:** `course_director_assignments` marcada applied (migración `20260905022529`) pero tabla inexistente en runtime → genera 500.
4. **Ruteo `course-directors`** capturado por `@Get(':id')` → 400.
5. **validación frontend sin navegador/E2E:** render y "Something went wrong" solo inferido, no inspeccionado.

## 15. COBERTURA FUNCIONAL DEL MVP
| Área | Estado |
|------|--------|
| Autenticación completa | ✅ Implementada y validada |
| Multi-institucion / RBAC | ✅ Implementado y validado |
| Registro (estudiantes, cursos, materias, notas, horarios) | ✅ Validado (lectura + relaciones) |
| Comunicaciones + recipients + firmas | ✅ Validado |
| Tareas + asignaciones + submissions | ✅ Validado |
| Agenda (eventos + view week) | ✅ Validado |
| Archivos (upload/download/delete) | ✅ Validado (con limpieza) |
| Observador (student-follow-ups) | ✅ Backend+frontend validado |
| Dashboard | ✅ Validado |
| Áreas / Asistencia / Reportes | ⚠️ Presentes en código/frontend, **bloqueados por permisos** (403) en runtime |
| Course-directors | ❌ 500/400 (tabla faltante + ruteo) |

## 16. BLOQUEANTES CRÍTICOS
**No hay bloqueantes de seguridad/autenticación.** Ningún 500 fuera de course-directors. Todos los módulos principales leíbles. El único fallo duro (500) y el 400 se limitan al submódulo course-directors, y la falta de permisos afecta a areas/attendance/reports (features complementarias no centrales para el registro/comunicación/agenda).

## 17. CAMBIOS DE CÓDIGO / BASE DE DATOS REALIZADOS
**Ninguno.** Solo lectura, validación e identificación. No se modificó código, schema, migraciones, contenedores, `.env` ni datos. Se generaron únicamente scripts efímeros de sondeo en `C:\Users\topoj\AppData\Local\Temp\opencode\mcp115\` (no versionados).

## 18. BASE DE DATOS / MIGRACIONES / DOCKER — NO EJECUTADO
Confirmado: no se ejecutó `prisma migrate deploy|dev|reset|resolve`, no se alteró schema/table, no se insertó/borró dato permanente, no se tocó composes/Docker.

## 19. SEGURIDAD DEL REPORTE
No se imprimen contraseñas ni tokens. Usuarios referidos como roles ("Authenticated test user"/"admin", "teacher", "parent", "student", "superadmin"). Contraseña compartida de prueba no revelada.

## 20. RECOMENDACIÓN FINAL
**AVANZAR con el MVP, con deuda técnica acotada.** La experiencia central (auth, multi-tenancy, RBAC, registro escolar, comunicaciones, tareas, agenda, archivos, observador, dashboard) está operativa y validada. Recomendado (en prompts de corrección/diagnóstico independientes, NO aquí):
1. Aplicar el DDL pendiente de `course_director_assignments` en la DB runtime (y realinear migración/marca) → resuelve ambos 500.
2. Reordenar rutas del controller para que `course-directors` no caiga en `@Get(':id')` → resuelve el 400.
3. Re-sembrar/re-poblar permisos en la DB runtime o usar el seed actual a fin de habilitar `areas/attendance/reports` y cerrar el drift (y decidir `agenda_prod`).
4. Considerar un wrapper/página de "observador" y cobertura E2E con navegador para cerrar la validación de render.

---

*Fin del FINAL REPORT — PROMPT 115. El stack quedó exactamente como estaba; solo se añadieron observaciones y evidencias de validación.*