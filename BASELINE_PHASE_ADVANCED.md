# BASELINE — FASE AVANZADA
## Fecha: 2026-09-10

## Estado de Pruebas

| Suite | Resultado | Notas |
|-------|-----------|-------|
| API Unit Tests | 901/901 PASS | 51 suites, 90.2s |
| Web Unit Tests | 554/554 PASS | 71 archivos, 154.3s |
| TypeScript (API) | 0 errores | -- |
| TypeScript (Web) | 0 errores | -- |
| ESLint | 0 errores, 4 warnings | warnings en ScheduleBlocksPage (fast-refresh) |

## Docker

| Contenedor | Estado | Puerto |
|------------|--------|--------|
| agenda-api-prod | healthy | 3000 |
| agenda-web-prod | healthy | 80 |
| agenda-postgres-prod | healthy | 5433 |
| agenda-postgres (dev) | healthy | 5432 |

## E2E Playwright

| Suite | Chromium | Mobile | Total | Estado |
|-------|----------|--------|-------|--------|
| roles-matrix | 12/12 | 12/12 | 24/24 | PASS |
| parent-scope | 5/5 | 5/5 | 10/10 | PASS |
| student-scope | 3/3 | 3/3 | 6/6 | PASS |
| teacher-scope | 3/3 | 3/3 | 6/6 | PASS |
| mobile-drawer | skip | 2/2 | 2/2 | PASS |
| notifications | 5/5 | 5/5 | 10/10 | PASS |
| signatures | 3/3 | 3/3 | 6/6 | PASS |
| files | 2/2 | 2/2 | 4/4 | PASS |
| observador | 2/2 | 2/4 | 4/6 | FAIL mobile |
| dashboard | 4/4 | 3/7 | 7/10 | FAIL mobile sidebar |
| tasks | 7/7 | 6/7 | 13/14 | FAIL mobile |
| responsive | 29/30 | 29/30 | 58/60 | FAIL login flaky |
| communications | 4/4 | 4/6 | 8/10 | FAIL mobile login |

### Resumen E2E
- **Desktop (chromium):** Todos PASS excepto 2 flaky login en responsive
- **Mobile (mobile-chrome):** Fallas pre-existentes en sidebar navigation (dashboard, observador, tasks)
- **Causa mobile:** Sidebar mobile no muestra links de navegación correctamente en tests
- **Flakiness:** Login timeouts en ejecución sucesiva (rate limiting conocido)

## RBAC/Scoping
- STUDENT: acceso limitado a datos propios
- PARENT: acceso limitado a hijos vinculados
- TEACHER: acceso limitado a cursos/asignaciones
- DIRECTOR_DE_GRUPO: extensión de TEACHER
- Multi-tenancy: conservado
- IDOR/BOLA: principales cubiertos

## Rutas
- 85+ rutas protegidas definidas en router.tsx
- 10 categorías de menú en Sidebar
- RBAC filtering client-side en Sidebar
- Sin route-level RBAC guards

## Permisos
- 78 permisos definidos
- 11 roles del sistema
- Mapeo DB-driven (RolePermission table)
- PermissionGuard con AND semantics

## Bugs Conocidos (pre-existentes)
1. PARENT perfil carga inconsistente (verificado en auditoría previa)
2. Notificación follow-up INTERNAL leak para PARENT
3. SUPER_ADMIN puede ver compromisos pendientes en dashboard
4. StudentsService tiene resolveAccessibleStudentIds duplicado
5. EnrollmentsService.update sin scope check
6. Dashboard hooks huérfanos (useDashboardStats, useRecentTasks, etc.)
7. Sidebar sin loading state
