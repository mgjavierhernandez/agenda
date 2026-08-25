# PROMPT 49 — Agenda Digital Implementation

**Fecha**: 2026-08-24
**Estado**: COMPLETADO

## Objetivo
Implementar el modulo de **Agenda Escolar Digital** (AF-050 a AF-056, EU-040 a EU-03), un panel de lectura que agrega tareas, horarios, comunicaciones y firmas en una vista de calendario unificada.

## Arquitectura
- **Sin nuevo modelo Prisma**: la Agenda es una vista de solo lectura que consulta tablas existentes (Tasks, Schedules, Communications, SignatureRequests).
- **Nuevo permiso**: `agenda:read` agregado a todos los roles.
- **Student.userId FK**: relacion `User` → `Student` agregada al schema para resolver el estudiante del usuario autenticado.
- **Deteccion de rol**: `resolveUserContext()` determina si el usuario es admin, docente, estudiante o padre, y filtra eventos segun el rol.

## Endpoints
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/agenda` | Agenda unificada con filtros |

### Query Parameters
- `start` (ISO date) — inicio del rango (requerido)
- `end` (ISO date) — fin del rango (requerido)
- `view` (day | week | month) — vista del calendario
- `eventTypes` (SCHEDULE | TASK | COMMUNICATION | SIGNATURE) — filtro por tipo
- `page` / `limit` — paginacion

### Response
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "SCHEDULE",
      "title": "Matematicas — Algebra",
      "description": "Aula 101",
      "start": "2026-08-25T08:00:00.000Z",
      "end": "2026-08-25T09:30:00.000Z",
      "allDay": false,
      "status": "ACTIVE",
      "sourceId": "uuid",
      "sourceType": "SCHEDULE",
      "route": "/schedules/uuid",
      "metadata": { "dayOfWeek": "MONDAY", "room": "101" }
    }
  ],
  "meta": { "total": 15, "page": 1, "limit": 50, "totalPages": 1 }
}
```

## Fuentes de datos
| Tipo | Tabla fuente | Filtro por rol |
|------|-------------|----------------|
| SCHEDULE | Schedule → Course, Subject | teacher: courses asignados; student: enrollments; parent: enrollments hijos |
| TASK | Task → TaskAssignment, Course, Subject | teacher: tasks de sus cursos; student/parent: assignments del estudiante |
| COMMUNICATION | Communication → CommunicationRecipient, Course | teacher: ALL/TEACHERS; student/parent: recipient |
| SIGNATURE | SignatureRequest → SignatureRecipient | todos: solo PENDING, filtrado por recipient |

## Frontend
- **Pagina**: `apps/web/src/modules/agenda/pages/AgendaPage.tsx`
- **Hook**: `apps/web/src/modules/agenda/hooks/useAgenda.ts`
- **Tipos**: `AgendaView`, `AgendaEventType`, `AgendaEvent`, `AgendaResponse` en `apps/web/src/api/types.ts`
- **Vistas**: Dia, Semana, Mes con navegacion
- **Filtros**: por tipo de evento (SCHEDULE, TASK, COMMUNICATION, SIGNATURE)
- **Ruta**: `/agenda`
- **Sidebar**: entrada "Agenda" con icono 📅

## Tests
| Area | Nuevos | Total |
|------|--------|-------|
| Backend (agenda.service.spec.ts) | 9 | 418 |
| Frontend (useAgenda + AgendaPage) | 12 | 407 |
| **Total** | **21** | **825** |

## Archivos creados
- `apps/api/src/modules/agenda/` (module, controller, service, DTOs, tests)
- `apps/web/src/modules/agenda/` (hooks, pages, tests)
- `docs/49-agenda-digital.md`

## Archivos modificados
- `apps/api/prisma/schema.prisma` — userId FK en Student, Student relation en User
- `apps/api/prisma/seed.ts` — agenda:read en todos los arrays de permisos
- `apps/api/src/app.module.ts` — AgendaModule
- `apps/api/src/main.ts` — Swagger tag Agenda
- `apps/web/src/api/types.ts` — tipos de Agenda
- `apps/web/src/permissions/permission.constants.ts` — AGENDA_READ
- `apps/web/src/app/router.tsx` — ruta /agenda
- `apps/web/src/components/layout/Sidebar.tsx` — entrada Agenda
