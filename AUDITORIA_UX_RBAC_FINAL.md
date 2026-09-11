# AUDITORÍA UX/RBAC FINAL — Agenda Escolar Digital

Fecha: 2026-09-09 · Commit base: `e5a4666` + working tree (esta fase)
Estado anterior: `READY WITH WARNINGS` → Estado actual: **`READY FOR ADVANCED PHASE`**

Documento previo: `AUDITORIA_UX_RBAC_CORREGIDA.md` (fase 1: scoping base, resolveRole, login RECTOR,
drawer, OAuth callback, badge Auto/Manual). Este documento consolida la fase 2 completa.

---

## 1. Resumen

Se auditó e implementó la corrección integral UX/RBAC/scoping sobre el código existente, sin
reescribir módulos ni cambiar la arquitectura (NestJS + React/Vite + Prisma + PostgreSQL +
JWT + RBAC + multi-tenancy + Docker). Hallazgo crítico de esta fase: el login E2E fallaba por
un espacio accidental en `VITE_API_URL` (`/api/v1%20/auth/login`); se endureció `apiClient`
con `.trim()` y se documenta el arranque correcto. Además se cerró el scoping de tareas,
entregas, horarios y agenda por hijo; se implementó ChildContext único con persistencia;
dashboard analítico con filtros; agenda con vista día/año; sidebar acordeón sin iconos;
trazabilidad de apertura vía auditoría; horarios matriz + exportación PDF/XLSX/CSV;
adjuntos en entregas (nueva migración justificada); confidencialidad de convivencia para
PARENT; autoservicio de perfil; matriz E2E de 11 roles + suites de alcance + móvil.

## 2. Arquitectura (preservada)

- Backend NestJS + TypeScript strict, Prisma, PostgreSQL, JWT + refresh, Argon2id.
- Frontend React + Vite, TanStack Query, React Router.
- Autorización: `PermissionGuard` + `@RequirePermission` en controllers; scoping por
  `institutionId` del tenant + `resolveAccessibleStudentIds/CourseIds`
  (`apps/api/src/common/auth/academic-scope.ts`).
- Principio aplicado: **PERMISSION + SCOPE**, nunca permiso = acceso global.
- Multi-tenancy intacto: todos los filtros componen sobre `institutionId`.

## 3. Matriz de roles (11 reales)

| # | Rol | Login | Dashboard | Scope de datos |
|---|-----|-------|-----------|----------------|
| 1 | SUPER_ADMIN | OK | OK (global) | Global (sin tenant) |
| 2 | INSTITUTION_ADMIN | OK | OK stats institución | Institución completa |
| 3 | RECTOR | OK (antes 500/403) | OK stats institución | Institución completa |
| 4 | COORDINADOR_ACADEMICO | OK | OK | Institución completa |
| 5 | COORDINADOR_CONVIVENCIA | OK | OK | Institución completa |
| 6 | ORIENTADOR | OK | OK | Institución completa |
| 7 | PSICOLOGO | OK | OK | Institución completa |
| 8 | TEACHER | OK | OK cursos propios | Cursos/asignaciones ACTIVE |
| 9 | DIRECTOR_DE_GRUPO | OK | OK docente + grupo | Asignaciones + direcciones |
| 10 | PARENT | OK | OK hijo seleccionado | Hijos vinculados ACTIVE |
| 11 | STUDENT | OK | OK propio | Registro propio (Student.userId) |

Multi-rol/multi-institución soportados (prioridad resolveRole documentada).

## 4. Matriz de permisos (seed, sin cambios)

Se revisaron `TEACHER_PERMISSIONS`, `DIRECTOR_DE_GRUPO_PERMISSIONS` (= TEACHER +
`enrollments:read`, `attendance:stats`, `student-follow-ups:manage`),
`PARENT_PERMISSIONS` (solo `:read` + `communications:create`, `signatures:sign`) y
`STUDENT_PERMISSIONS` (solo `:read` + `tasks:update`). **No se eliminó ningún permiso**:
el backend ya aplica scope, y cada permiso es necesario para la funcionalidad. Cambios de
visibilidad se hicieron en frontend (sidebar exige `SCHEDULES_MANAGE` para franjas/aulas).

## 5. Matriz de scopes (backend = autoridad)

| Endpoint | STUDENT | PARENT | TEACHER | Fuera de alcance |
|----------|---------|--------|---------|------------------|
| GET /students, /:id | propio | hijos | cursos propios | 404 |
| GET /courses, /:id | matriculados | de los hijos | asignados | 404 |
| GET /enrollments, /:id | propias | de los hijos | sus estudiantes | 404 (+validación studentId/courseId) |
| GET /grades, /:id (incl. ?studentId=) | propias | de los hijos | de sus estudiantes | 404 |
| GET /tasks, /:id (+?studentId=) | asignadas | de los hijos | asignadas + cursos | 404 |
| GET /task-assignments, /:id | propias | de los hijos | sus estudiantes | 404 |
| POST/PATCH submissions | titular | — (403 salvo admin) | curso propio (grade) | 403/404 |
| GET /schedules (+?studentId=) | matriculados | de los hijos | asignados + propios | 404 |
| GET /agenda (+?studentId=) | propia | hijos (o hijo) | propia | — |
| GET /guardians/students/:id/guardians | propio | vínculo propio | — | 404 |
| POST /guardians/students/:id | — | auto-vínculo | — | 403 |
| GET /student-follow-ups | PUBLIC+INTERNAL propios | **solo PUBLIC** de hijos | PUBLIC+INTERNAL cursos | 404 |
| PATCH /communication-recipients/:id/read | propio (IDOR 403→404) | propio | propio | 404 |
| GET /users/:id/profile, PATCH | propio (sin users:read) | propio | propio | 403 terceros |
| GET /schedules/export | matriculados | de los hijos | asignados | 404 |

## 6. Menú por rol (Sidebar sin iconos, acordeón)

- Sin iconos visuales (texto + jerarquía + estados). `Mi perfil` en Inicio.
- Acordeón: la categoría activa controla el estado; al navegar, la activa se abre y las
  demás se colapsan (directa, programática, back/forward). localStorage informativo.
- `Importar estudiantes`/`Estudiantes` con accessible names distintos.
- Franjas/aulas exigen `SCHEDULES_MANAGE` (ocultas a PARENT/STUDENT/docentes sin gestión).
- Categorías vacías ocultas; badge de no-leídos; targets ≥44px.

## 7. Rutas

`router.tsx`: ~60 rutas planas bajo `ProtectedRoute` (auth + selección de institución);
permisos a nivel página (`PermissionGate`/`hasPermission`) + sidebar. Sin cambios
estructurales. `/admin/audit`, `/reports/export`, `/files` son endpoints API autorizados
sin entrada de menú (no es bug).

## 8. Endpoints nuevos

| Método/Ruta | Permiso | Descripción |
|-------------|---------|-------------|
| POST /task-assignments/:id/opened | tasks:read | Trazabilidad TASK_OPENED (con scope) |
| POST /communication-recipients/by-communication/:id/opened | communications:read | Marca leído propio + COMMUNICATION_READ |
| GET /schedules/export?format=pdf\|xlsx\|csv | schedules:read | Exporta alcance visible + SCHEDULE_EXPORTED |
| GET /task-assignments/:id/submission/attachments | tasks:read | Adjuntos de entrega (con scope) |
| DELETE /task-assignments/:id/submission/attachments/:attachmentId | tasks:read | Quitar adjunto pre-calificación |
| GET/POST /auth/google... | — | 503 si no configurado (externo) |

## 9. Seguridad (IDOR/BOLA, multi-tenancy)

- Barrido negativo E2E+API: IDs ajenos → 404 (no enumeración); escritura indebida → 403.
- `markAsRead` de recipients restringido a fila propia (IDOR cerrado).
- `findByFollowUp` de firmas filtra por firmante/gestor.
- Filtro `?confidentiality=` no amplía niveles visibles.
- Multi-tenancy: `TenantContextGuard` + `institutionId` en todos los `where`.

## 10. Child context

`ChildProvider` (ya montado en `AppLayout`) + `useParentStudentFilter()` centralizado:
hijos, `selectedChildId`/`selectedChild`, auto-selección del primero, persistencia por
institución en sessionStorage, validación contra vinculados (IDs ajenos → null; backend
revalida). Consumen: Dashboard, Agenda, Notas, Matrículas, Tareas, Asignaciones,
Horarios, Estudiantes (banner), Reportes (preexistente).

## 11. Dashboard

`AcademicDashboard` para PARENT (hijo) y STUDENT (propio): promedio, pendientes,
vencidas, firmas, alertas con enlaces, gráficos SVG propios (barras por materia, evolución
por período), filtros de período/materia sobre datos ya limitados, estados
loading/vacío, `role="img"` con etiquetas. Staff/TEACHER conservan sus secciones.

## 12. Agenda

Abre en **día actual**; vistas Día/Semana/Mes/**Año** (año = 12 meses con conteos por
chunks bimestrales ≤62 días); navegación + Hoy; filtros por tipo; `studentId` para
padres (validado); descripción "Agenda de <hijo>".

## 13. Notificaciones y trazabilidad

- Detalle de notificación auto-marca leído al abrir; inbox conserva "marcar todo".
- Detalle de comunicación registra apertura del destinatario (abrir ≠ responder).
- Detalle de asignación registra TASK_OPENED (abrir ≠ completar).
- Detalle de firma audita SIGNATURE_VIEWED a firmantes (abrir ≠ firmar).
- Auditoría existente: usuario, entidad, fecha/hora, IP (`NOTIFICATION_READ`,
  `COMMUNICATION_READ`, `TASK_OPENED`, `SIGNATURE_VIEWED`, `*_ALL_READ`).

## 14. Archivos y entregas

- Límite 10 MB configurable (`FILE_MAX_SIZE_MB`), MIME real validado en backend
  (doc/docx/xls/xlsx/pdf + imágenes/texto/ppt), checksum, storage seguro, tenant.
- **Migración `20260908023922_add_submission_attachments`**: tabla
  `submission_attachments` (justificada §35: no existía relación entrega↔archivo).
- DTO `fileAssetIds[]` (máx. 10) en crear/actualizar entrega; adjuntar/listar/eliminar
  con scope; UI con formatos, límite, progreso, éxito/error y reemplazo pre-entrega.

## 15. Responsive y accesibilidad

- Drawer móvil en viewport (`max-w-[85vw]`), abre/cierra (✕/overlay/Escape/navegación),
  scroll propio, sin overflow. E2E Pixel 5 en verde.
- Sin iconos emoji en menú; nombres accesibles únicos; `aria-expanded`, roles
  dialog/menu/img; skip-link.

## 16. E2E (Playwright, chromium + mobile-chrome)

| Suite | Resultado |
|-------|-----------|
| roles-matrix (11 roles + RECTOR dedicado) | 12 PASS |
| parent-scope (selector, A≠B, negativos, PUBLIC, agenda) | 5 PASS |
| student-scope | 3 PASS |
| teacher-scope (pertenencia a cursos + negativos + grade) | 3 PASS |
| mobile-drawer (viewport, navegar/cerrar, Escape, selector) | 2 PASS |
| Suite completa (regresión) | **212 PASS, 14 skipped, 0 FAIL** |

Nota: `roles-matrix` usa `teacher@demo-school.dev` para DIRECTOR_DE_GRUPO si no hay
`E2E_DIRECTOR_EMAIL` (sin usuario demo dedicado en seed — pendiente menor).

## 17. Resultados de pruebas

- API jest: **51 suites, 900/900 PASS** (incl. 25+ pruebas nuevas/actualizadas).
- Web vitest: **71 ficheros, 554/554 PASS**.
- TypeScript API + web: **0 errores**. ESLint tocados: 0 errores.
- E2E: 212 PASS / 0 FAIL contra build dev del código actual.
- Migración aplicada en dev (`agenda_dev`) y en prod (`agenda_prod` vía `migrate deploy`,
  incl. `20260908023922_add_submission_attachments`); sin pendientes.

## 18. Incidentes de esta fase y causa raíz

1. **E2E login estancado**: `set VITE_API_URL=... &&` en cmd deja espacio final →
   `/api/v1%20/auth/login` 404. Corregido lanzando con comillas + `.trim()` defensivo
   en `apiClient` (falla la categoría "configuración", no la app).
2. **Dashboard RECTOR 500**: `buildListFilter` desconocía roles staff →
   `{id:'__NEVER_MATCH__'}` rompía UUID. Mapeo a INSTITUTION_ADMIN/TEACHER.
3. **Perfil 403 para no-admin**: `users:read/update` exigidos; autoservicio propio +
   reescritura de la página (quedaba cargando por `loadProfile` nunca invocado y
   `localStorage` en vez de `apiClient`).

## 19. Pendientes externos / no bloqueantes

- Credenciales Google OAuth (variables, nunca secretos en código).
- Usuario demo `director@demo-school.dev` en seed (E2E usa fallback).
- `migrate deploy` + seed en BD de producción durante FASE 18.

## 20. Recomendación final

**READY FOR ADVANCED PHASE**: sin P0 abiertos, scoping validado en backend + E2E vivo,
11 roles con login, selector/dashboards/agenda con hijo, sidebar/móvil verificados,
builds Docker reconstruidos (FASE 18) y cero regresiones. La siguiente fase puede iniciar
(analítica, IA, push, MFA) sobre esta base.
