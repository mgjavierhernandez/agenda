# 📋 Frontend: Dashboard + MVP Integration (PROMPT 45)

## Resumen del Módulo

Módulo dashboard que integra datos de todos los módulos existentes en la plataforma, proporcionando una vista consolidada para el usuario con métricas, tareas recientes, notificaciones y firmas pendientes. Implementa RBAC para secciones sensibles y acceso rápido a módulos frecuentes.

## Architectural Decisions

### Sin endpoints dedicados de estadísticas

El backend no expone endpoints de dashboard/estadísticas. Las métricas se derivan de los listados existentes (`GET /students?limit=1`, `GET /courses?limit=1`, etc.) extrayendo `meta.total` de cada respuesta paginada.

### DashboardPage es un componente de página (no módulo)

`DashboardPage.tsx` se mantiene en `apps/web/src/pages/` (no dentro de un módulo) ya que es una vista compuesta que integra datos de múltiples módulos. Los hooks específicos del dashboard se organizan en `apps/web/src/modules/dashboard/hooks/`.

### Polling para comunicaciones no leídas

El conteo de comunicaciones no leídas se obtiene del hook existente `useUnreadCommunicationsCount` que hace polling cada 30 segundos a `GET /communication-recipients/unread-count`.

### RBAC por secciones

Cada sección del dashboard (estadísticas, tareas, notificaciones, firmas, acceso rápido) se renderiza condicionalmente según los permisos del usuario. Las secciones de admin (estadísticas, acceso rápido) se ocultan para roles limitados.

### Sin notificaciones de label constants

No existen constantes de label para notificaciones. El tipo `NotificationStatus` solo define los valores `'UNREAD' | 'READ'`. Se renderiza el valor raw del status.

## API Endpoints Utilizados

| Método | Endpoint | Uso en Dashboard |
|--------|----------|------------------|
| `GET` | `/students?limit=1` | Conteo total de estudiantes |
| `GET` | `/courses?limit=1` | Conteo total de cursos |
| `GET` | `/subjects?limit=1` | Conteo total de asignaturas |
| `GET` | `/tasks?limit=1` | Conteo total de tareas |
| `GET` | `/enrollments?limit=1` | Conteo total de matrículas |
| `GET` | `/communications?limit=1` | Conteo total de comunicaciones |
| `GET` | `/signature-requests?limit=1` | Conteo total de firmas |
| `GET` | `/tasks?limit=5` | Tareas recientes (5 más nuevas) |
| `GET` | `/notifications?limit=5` | Notificaciones recientes (5 más nuevas) |
| `GET` | `/signature-requests?status=PUBLISHED&limit=5` | Firmas pendientes de firma |
| `GET` | `/communication-recipients/unread-count` | Conteo de comunicaciones no leídas (polling 30s) |

## API Types Utilizados

```typescript
interface DashboardStats {
  students: number;
  courses: number;
  subjects: number;
  tasks: number;
  enrollments: number;
  signatures: number;
  communications: number;
}

interface UnreadCountResponse {
  count: number;
}
```

## Archivos Creados/Modificados

### Nuevos

| Archivo | Descripción |
|---------|-------------|
| `modules/dashboard/index.ts` | Barrel export del módulo |
| `modules/dashboard/hooks/index.ts` | Barrel export de hooks |
| `modules/dashboard/hooks/useDashboardStats.ts` | 7 queries paralelas para métricas |
| `modules/dashboard/hooks/useRecentTasks.ts` | Tareas recientes (limit=5) |
| `modules/dashboard/hooks/useRecentNotifications.ts` | Notificaciones recientes (limit=5) |
| `modules/dashboard/hooks/usePendingSignatures.ts` | Firmas pendientes (status=PUBLISHED, limit=5) |
| `modules/dashboard/__tests__/dashboard-hooks.test.tsx` | Tests de hooks (9 tests) |
| `modules/dashboard/__tests__/dashboard-page.test.tsx` | Tests de página (17 tests) |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `pages/DashboardPage.tsx` | Reescrito completamente con métricas, secciones, RBAC |

## Hooks Implementados

### useDashboardStats

```typescript
function useDashboardStats(enabled: boolean): {
  stats: DashboardStats;
  isLoading: boolean;
  error: Error | null;
}
```

Ejecuta 7 queries paralelas con `limit=1` para obtener el conteo total de cada entidad. Solo se ejecuta cuando `enabled=true`.

### useRecentTasks

```typescript
function useRecentTasks(enabled: boolean): UseQueryResult<PaginatedApiResponse<Task>>
```

Obtiene las 5 tareas más recientes ordenadas por `createdAt:desc`. Filtra tareas `INACTIVE` en el frontend.

### useRecentNotifications

```typescript
function useRecentNotifications(enabled: boolean): UseQueryResult<PaginatedApiResponse<Notification>>
```

Obtiene las 5 notificaciones más recientes.

### usePendingSignatures

```typescript
function usePendingSignatures(enabled: boolean): UseQueryResult<PaginatedApiResponse<SignatureRequest>>
```

Obtiene las 5 firmas con status `PUBLISHED` más recientes.

## DashboardPage - Secciones

1. **Bienvenida**: Saludo con nombre del usuario + institución
2. **Métricas** (8 tarjetas): Estudiantes, Cursos, Asignaturas, Tareas, Matrículas, Comunicaciones, Firmas, Notificaciones sin leer
3. **Tareas Recientes**: Lista de 5 tareas con badge de status
4. **Notificaciones Recientes**: Lista de 5 notificaciones con indicador unread
5. **Firmas Pendientes**: Lista de firmas con `PUBLISHED` status
6. **Acceso Rápido**: Links a módulos frecuentes con conteo de comunicaciones no leídas

## RBAC

| Sección | Permiso requerido |
|---------|-------------------|
| Estadísticas generales | `VIEW_STUDENTS` O `VIEW_COURSES` O `VIEW_SUBJECTS` O `VIEW_ENROLLMENTS` |
| Estadísticas de tareas | `VIEW_TASKS` |
| Estadísticas de comunicaciones | `VIEW_COMMUNICATIONS` |
| Estadísticas de firmas | `VIEW_SIGNATURE_REQUESTS` |
| Tareas recientes | `VIEW_TASKS` |
| Notificaciones | (siempre visible) |
| Firmas pendientes | `VIEW_SIGNATURE_REQUESTS` |
| Acceso rápido | `VIEW_ADMIN_DASHBOARD` |

## Tests

- **26 tests** (9 hooks + 17 página)
- Todos pasan con `npx vitest run src/modules/dashboard/`
- Suite completa: **373 tests** (0 failures)
- TypeScript: **0 errores**
- ESLint: **0 errores**
- Build: **PASS**

## Dependencias

- `@tanstack/react-query` para data fetching
- `@/api/client` para peticiones HTTP
- `@/api/types` para tipos (`Task`, `Notification`, `SignatureRequest`, `PaginatedApiResponse`)
- `@/auth/auth.store` para usuario actual
- `@/tenant/tenant.store` para institución seleccionada
- `@/permissions/usePermissions` para RBAC
- `@/components/ui/StatCard` para tarjetas de métricas
- `@/components/ui/Badge` para badges de status
- `@/components/ui/Spinner` para loading states
- `@/modules/communication-recipients/hooks/useUnreadCommunicationsCount` para conteo no leídas
- `react-router-dom` para navegación

## Notas de Implementación

- Los hooks `useRecentTasks` y `useRecentNotifications` filtran entidades `INACTIVE` en el frontend ya que el backend no soporta filtro por status en todos los endpoints
- El hook `usePendingSignatures` filtra por `status=PUBLISHED` en la query param, pero también filtra en frontend por si acaso
- Los stat cards muestran "0" cuando no hay datos, no ocultan la tarjeta
- El badge de comunicaciones no leídas en "Acceso Rápido" se actualiza cada 30 segundos
- Las secciones vacías muestran un estado vacío con icono y mensaje descriptivo
