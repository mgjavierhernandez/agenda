# AUDITORÍA UX/RBAC CORREGIDA — Agenda Escolar Digital

Fecha: 2026-09-07 · Commit base auditado: `e5a4666`

## 1. Resumen ejecutivo

Se implementaron correcciones reales (no solo documentación) sobre los 13 hallazgos de la
auditoría. Causa raíz más importante encontrada: `DashboardService.resolveRole()` solo
reconocía 5 de los 11 roles → RECTOR, coordinadores, ORIENTADOR, PSICOLOGO y
DIRECTOR_DE_GRUPO recibían `403 No active role` y el E2E agotaba el timeout esperando
`/dashboard`/`select-institution`. Corregido en backend + frontend.

## 2. Estado inicial

`PARTIAL — existen brechas críticas de UX/RBAC` (13 hallazgos, ver prompt de la tarea).

## 3. Problemas encontrados (confirmados en código)

| # | Problema | Severidad |
|---|----------|-----------|
| 1 | `GET /courses`, `/enrollments` sin scoping: cualquier `courses:read`/`enrollments:read` (STUDENT, PARENT) listaba toda la institución | P0 |
| 2 | `GET /grades?studentId=<otro>` burlaba el filtro de padre; `GET /grades/:id` sin verificación | P0 |
| 3 | `GET /guardians/students/:id/guardians` enumerable por cualquier `guardians:read`; `linkStudent` permitía vincular cualquier `userId` | P0 |
| 4 | `resolveRole()` dashboard solo 5 roles → 403 para RECTOR y otros 5 roles (causa del timeout) | P0 |
| 5 | `InstitutionSelectPage` no navegaba tras seleccionar (se quedaba en `/select-institution`) | P0 |
| 6 | `StudentsService.update/deactivate` sin chequeo de alcance | P1 |
| 7 | `Mi perfil` dentro de `Administración` para todos | P1 |
| 8 | `Importar estudiantes` vs `Estudiantes` + quick-access duplicado en Dashboard (mismo accessible name) | P1 |
| 9 | Drawer móvil sin `max-w`, sin botón cerrar, sin bloqueo de scroll de fondo | P1 |
| 10 | `GoogleCallbackPage`: rama `not-configured` muerta; no persistía `institutionId`; no sincronizaba `AuthProvider` | P1 |
| 11 | Sin indicador de asignaciones docentes automáticas | P2 |
| 12 | Sin matriz E2E de 11 roles | P2 |
| 13 | `/admin/audit`, `/reports/export`, `/files` sin ruta frontend (ver §11 — no es bug) | Info |

## 4. Correcciones realizadas

### 4.1 Backend (autoridad final, nada solo-oculto-en-frontend)

- **Nuevo** `apps/api/src/common/auth/academic-scope.ts`: `getUserRoleNames`,
  `hasFullAccess`, `resolveAccessibleStudentIds`, `resolveAccessibleCourseIds`.
- `courses.service.ts` + controller: `findAll`/`findOne` aceptan `userId` y filtran por
  cursos enseñados/dirigidos/matriculados/de los hijos.
- `enrollments.service.ts` + controller: idem por estudiante y curso; `studentId`/`courseId`
  fuera de alcance → `404`.
- `grades.service.ts` + controller: `findAll` exige alcance incluso con `?studentId`
  explícito (cierra el bypass); `findOne` verifica titularidad.
- `guardians.service.ts` + controller: `linkStudent` solo permite auto-vínculo salvo rol
  administrativo; `findByStudent` exige vínculo, titularidad o rol administrativo.
- `students.service.ts`: `update`/`deactivate` verifican alcance (defensa en profundidad).
- `dashboard.service.ts`: `DashboardRole` ampliado a 11 roles; `resolveRole` con prioridad;
  stats admin para RECTOR/coordinadores/orientador/psicólogo; stats docente para
  DIRECTOR_DE_GRUPO (+ cursos dirigidos); `eventVisibleToRole` para staff y director.
- `teacher-assignments.service.ts`: `findOne` devuelve `autoBackfilled` derivado de
  auditoría `SCHEDULE_TEACHER_BACKFILLED` (sin migración).

### 4.2 Frontend

- `Sidebar.tsx`: `Mi perfil` movido a `Inicio`; `Importar estudiantes` → `Importar`;
  `min-h-[44px]` en botones/enlaces; contenedor móvil con altura completa y scroll contenido.
- `AppLayout.tsx`: drawer `max-w-[85vw]`, `max-h-screen`, botón `Cerrar menú`, bloqueo de
  scroll de fondo, contenedor con scroll propio.
- `InstitutionSelectPage.tsx`: navega a `/dashboard` tras seleccionar.
- `DashboardPage.tsx`: `isAdmin` incluye los 7 roles staff; STATs docente para
  DIRECTOR_DE_GRUPO; quick-access `Estudiantes` con `aria-label="Ir a Estudiantes"`.
- `useRoleDashboard.ts`: tipo `DashboardRole` de 11 roles.
- `GoogleCallbackPage.tsx`: detecta `error=not-configured`, persiste institución,
  recarga para sincronizar `AuthProvider`.
- `TeacherAssignmentDetailPage.tsx`: badge `Auto`/`Manual` informativo.
- **Nuevo** `apps/web/e2e/roles-matrix.spec.ts`: matriz de 11 roles + test RECTOR sin timeout.

## 5. Cambios frontend — ver §4.2.

## 6. Cambios backend — ver §4.1.

## 7. Cambios Prisma

Ninguno. GAP-7 resuelto sin migración (origen inferido de auditoría). `source` MANUAL/AUTO
queda como MEJORA FUTURA si se requiere consulta masiva eficiente.

## 8. Cambios RBAC

Sin cambios de seed/permisos: los permisos existentes son correctos una vez que el backend
aplica scoping. STUDENT/PARENT conservan `:read` con alcance forzado.

## 9. Scoping implementado

- STUDENT: solo su registro, sus cursos/matrículas/notas, sus guardians.
- PARENT: solo hijos vinculados (`guardianStudent` ACTIVE).
- TEACHER: solo estudiantes/cursos de sus asignaciones ACTIVE.
- DIRECTOR_DE_GRUPO: asignaciones + direcciones; dashboard docente.
- Staff (RECTOR, coordinadores, ORIENTADOR, PSICOLOGO): visibilidad institucional completa
  (igual que antes en students; ahora consistente en dashboard).
- Respuestas fuera de alcance: `404` (no revela existencia), salvo vínculo indebido en
  escritura: `403`.

## 10. Multi-tenancy

Sin cambios: `TenantContextGuard` + `institutionId` en todos los `where`. Todos los nuevos
filtros componen sobre `institutionId`, nunca lo sustituyen.

## 11. Login Rector

Causa raíz: `resolveRole()` → `403` + página vacía + `InstitutionSelectPage` sin navegar.
Corregido (backend + frontend). Comportamiento: 1 institución → auto-selección; N →
`select-institution` + navegación a dashboard; 0 → error comprensible.

## 12. Google OAuth

Estado: **IMPLEMENTACIÓN LISTA — CONFIGURACIÓN EXTERNA PENDIENTE**.
Variables: `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` (backend, `.env.example`); frontend sin
variables propias. Sin credenciales reales en el repo (correcto).

## 13. Mobile UX

Drawer dentro del viewport (`max-w-[85vw]`), abre/cierra (botón ✕, overlay, Escape),
categorías expandibles, cierra tras navegar (`onNavigate`), targets ≥44px, sin overflow
lateral nuevo. E2E móvil pendiente de ejecución en entorno vivo.

## 14. GAP-1 a GAP-8

| GAP | Estado |
|-----|--------|
| GAP-1 STUDENT listados completos | CORREGIDO (scoping courses/enrollments/grades/guardians) |
| GAP-2 PARENT institucional | CORREGIDO (scoping por `guardianStudent`) |
| GAP-3 TEACHER `/students` API | CORREGIDO (scoping ya existía en students; extendido al resto) |
| GAP-4 RECTOR timeout | CORREGIDO (causa raíz `resolveRole` + navegación) |
| GAP-5 Sidebar móvil viewport | CORREGIDO (código; E2E vivo pendiente) |
| GAP-6 Duplicado Estudiantes | CORREGIDO (etiquetas + `aria-label` distintos) |
| GAP-7 Docente auto-asignado | CORREGIDO sin migración (badge informativo vía auditoría) |
| GAP-8 (rutas huérfanas/permisos amplios) | ACLARADO: `/admin/audit`, `/reports/export`, `/files` son endpoints API autorizados sin entrada de menú — no es bug; `AUDIT_READ`/`FILES_*`/`REPORTS_EXPORT` se exigen en backend |

## 15. Matriz de 11 roles

| Rol | Login | Dashboard | Sidebar | Scoping backend | E2E |
|-----|-------|-----------|---------|-----------------|-----|
| SUPER_ADMIN | OK | OK | OK | bypass global | spec creado |
| INSTITUTION_ADMIN | OK | OK | OK | full | spec creado |
| RECTOR | CORREGIDO | CORREGIDO | OK | full | spec creado + test dedicado |
| COORDINADOR_ACADEMICO | CORREGIDO | CORREGIDO | OK | full | spec creado |
| COORDINADOR_CONVIVENCIA | CORREGIDO | CORREGIDO | OK | full | spec creado |
| ORIENTADOR | CORREGIDO | CORREGIDO | OK | full | spec creado |
| PSICOLOGO | CORREGIDO | CORREGIDO | OK | full | spec creado |
| TEACHER | OK | OK | OK | cursos propios | spec creado |
| DIRECTOR_DE_GRUPO | CORREGIDO | CORREGIDO | OK | cursos + grupo | spec creado |
| PARENT | OK | OK | OK | hijos | spec creado |
| STUDENT | OK | OK | OK | propio | spec creado |

## 16. Pruebas ejecutadas

- `tsc --noEmit` API: PASS (0 errores). Web: PASS (0 errores).
- API jest: **875/875 PASS** (50 suites). Incluye specs actualizados
  (grades, students, guardians, teacher-assignments) + 2 pruebas negativas nuevas
  (grades rechaza `studentId` fuera de alcance; guardians rechaza vínculo ajeno no admin).
- Web vitest: **534/534 PASS** (68 ficheros), incluye sidebar actualizado.
- ESLint ficheros tocados: 0 errores (1 warning preexistente `react-refresh`).
- Playwright (incl. `roles-matrix.spec.ts` y proyecto `mobile-chrome`): **no ejecutado** —
  requiere entorno vivo con build actual (los contenedores en ejecución sirven el build
  anterior a estos cambios). Ver §18.

## 17. Resultados

P0 cerrados en código y cubiertos por unit tests. UX móvil/sidebar/OAuth corregidos en
código. E2E vivo pendiente de entorno.

## 18. Fallos restantes

1. E2E Playwright sin ejecutar en entorno vivo (builds Docker anteriores a los cambios).
   Acción: `docker compose build api web`, reiniciar, `npx playwright test`
   (incl. `roles-matrix.spec.ts` y proyecto `mobile-chrome`).
2. `DIRECTOR_DE_GRUPO` no tiene usuario demo dedicado en seed (el spec usa
   `E2E_DIRECTOR_EMAIL` o el teacher como aproximación). Recomendado: crear
   `director@demo-school.dev` en seed.

## 19. Riesgos

- Sin E2E vivo, regresiones de navegación solo cubiertas por vitest.
- `resolveRole` prioriza un rol cuando el usuario tiene varios (documentado y razonable,
  pero es una decisión de producto).
- `autoBackfilled` lee auditoría (1 query extra en detalle; despreciable).

## 20. Recomendaciones para fase avanzada

- Crear `director@demo-school.dev` en seed; documentar matriz de permisos por rol.
- Evaluar columna `source` (MANUAL/AUTO) si el indicador se usa en listados masivos.
- `POST /auth/tenant/select` podría devolver permisos efectivos y evitar un round-trip.
- MFA, push, IA, app móvil: arquitectura no bloqueada (RBAC extensible, tenant sólido,
  auditoría trazable).

## 21. VEREDICTO FINAL

**READY WITH WARNINGS** — todo P0 corregido en código con unit tests en verde; pendiente
únicamente la validación E2E en entorno vivo con builds actualizados (§18.1) antes de
abrir validación con usuarios reales.
