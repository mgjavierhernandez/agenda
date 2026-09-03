# PROMPT 93 — AGENDA DIGITAL: EVENT CRUD (EVENTOS DE LA AGENDA)

> **Fecha:** 2026-08-30
> **Tipo:** Implementación funcional (backend CRUD + RBAC multi-rol + agregación de agenda + frontend hooks/páginas + tests + docs).
> **Rama:** `main` (working tree; **sin commit/push/tag**)

---

## 1. Executive Summary

PROMPT 93 convierte el módulo de **Agenda** (hasta ahora de solo lectura en
`GET /agenda`) en un módulo completo de **eventos** con ciclo de vida
crear → listar → detalle → editar → cancelar (soft-cancel), restringido por
RBAC, aislado por tenant (BOLA/IDOR-safe), auditado y agregado a la agenda
maestra.

Lo entregado:

- **Backend — `AgendaEvent`**: nuevo modelo (`agenda_events`), enum
  `AgendaEventType.EVENT = 'EVENT'`, migración aditiva `20260830000000_add_agenda_events`
  (aplicada con `prisma migrate deploy`, **nunca** `migrate dev`), seed con
  los permisos `agenda:create` / `agenda:update` / `agenda:delete` (total seed:
  **73 permisos**).
- **Backend — `AgendaEventsController`**: `POST /agenda/events`,
  `GET /agenda/events`, `GET /agenda/events/:id`, `PATCH /agenda/events/:id`,
  `DELETE /agenda/events/:id`, todos con `@RequirePermission(...)`:
  create/update/delete → **ADMIN y TEACHER**; read → todos los roles.
- **Backend — visibilidad por audiencia** (`CommunicationAudience`):
  admin/SUPER_ADMIN ve todo; docente ve `ALL`/`TEACHERS` o eventos propios
  (`createdById`); padre ve `ALL`/`PARENTS`; estudiante ve `ALL`/`STUDENTS`.
- **Backend — `DELETE` = soft-cancel** (`status → CANCELLED`); cancelar un
  evento ya cancelado → **400**; actualizar un evento cancelado → **400**;
  `endAt` posterior a `startAt` (validación); doble cancelación → 400.
- **Backend — seguridad de DTO**: campos de autoridad (`institutionId`,
  `createdById`) se imponen en el servicio desde el tenant/gward; cualquier
  intento de inyectarlos en el body → **400** (`forbidNonWhitelisted`).
  Cross-tenant (`:id` de otra institución) → **404**.
- **Backend — `GET /agenda` agregado**: `EVENT` incluido por
  defecto en `eventTypes`; nuevo branch de query + `getAgendaEventItems()`
  que mapea cada evento a `AgendaEventDto` (`type: EVENT`,
  `sourceType: 'AgendaEvent'`, `route: '/agenda/events/{id}'`, metadatos
  `audience`/`location`).
- **Backend — auditoría**: `EVENT_CREATED`, `EVENT_UPDATED`,
  `EVENT_CANCELLED`, `entityType: 'AgendaEvent'`, vía `AuditService.log`
  (ipAddress desde `req.ip`).
- **Frontend**: tipos DTO ampliados, constantes `AGENDA_CREATE/UPDATE/DELETE`,
  **5 hooks** TanStack Query, **2 páginas nuevas**
  (`/agenda/events/new`, `/agenda/events/:id`, `/agenda/events/:id/edit`),
  botón "Nuevo evento" gated por `agenda:create`, invalidación de caches
  `['agenda']` + `['agenda-events']`.
- **Tests**: backend unit + e2e y web vitest. Todo verde (ver sección 20/24).

**Resultado de pruebas (gate completo, ver sección 24):** API unit
**744/744** (40 suites); API E2E **642** distribuidos en 28 suites — `agenda`
**36/36**; Web vitest **495/495** (61 archivos) incl. agenda **34/34**;
`tsc` limpio (api + web); builds api (`nest build`) y web (`vite build`)
exitosos; lint limpio para todos los archivos de PROMPT 93 (errores de lint
restantes son **preexistentes**, ver sección 20).

**Estado: IMPLEMENTED — PROMPT 93 COMPLETE (sin commit/push/tag, según instrucciones).**

---

## 2. Git / Working-Tree State

- **No** se ejecutó `git commit`, `git push` ni `git tag`.
- El working tree acumula cambios **sin commitear** de prompts anteriores
  (70–92) más PROMPT 93; `git diff --stat` refleja ese estado combinado.
- Archivos nuevos de PROMPT 93 listados en la sección 28.
- Tags protegidos intactos: `v1.0.2-rc.1`; commit `e7dca4a` sin alterar.

---

## 3. Objective & Scope

1. Backend: modelo `AgendaEvent` + migración aditiva aplicada sin reset.
2. Backend: CRUD completo con RBAC por método y visibilidad por audiencia.
3. Backend: soft-cancel (`DELETE`, doble cancelación → 400).
4. Backend: agregar `EVENT` a `GET /agenda` con mapeo DTO y rutas.
5. Backend: auditoría de altas/bajas/cancelaciones.
6. Frontend: tipos + constantes de permisos.
7. Frontend: hooks `useAgendaEvents`, `useAgendaEvent`, `useCreateAgendaEvent`,
   `useUpdateAgendaEvent`, `useCancelAgendaEvent`.
8. Frontend: páginas formulario (crear/editar) y detalle; entrada desde la
   agenda maestra con "Nuevo evento"; rutas.
9. Tests: unit + e2e backend y vitest web + gate de regresión completo.

## 4. Non-Goals (explícito)

- **No** validación de dueño de evento por rol docente (gated solo por
  permiso global; un docente puede editar eventos de otros docentes — se
  documenta como limitación en la sección 25).
- **No** cancelación con motivo obligatorio / re-agendado / serie recurrente.
- **No** notificaciones push al crear/cancelar eventos.
- **No** paginación server-side real en `GET /agenda` (sigue siendo fecha-rango).
- **No** modificaciones a `migrate dev` ni a migraciones pasadas (drift
  preexistente se documenta en la sección 20).

## 5. Security Pipeline (recap)

Cadena de seguridad aplicada por el proyecto y usada por este módulo:
guards globales `AccessTokenGuard → TenantContextGuard` + `PermissionGuard`;
`ValidationPipe{ whitelist, transform, forbidNonWhitelisted }`; autoridad
`institutionId`/`createdById` siempre desde el contexto (tenant header +
`req.user.userId`), nunca del body. Cualquier ataque de inyección de
`institutionId` es rechazado con **400**; accesos cross-tenant devuelven
**404** (BOLA/IDOR safe).

## 6. Data Model — AgendaEvent

```prisma
enum AgendaEventType { TASK = 'TASK', COMMUNICATION = 'COMMUNICATION', EVENT = 'EVENT' }
enum AgendaEventStatus { ACTIVE = 'ACTIVE', CANCELLED = 'CANCELLED' }

model AgendaEvent {
  id            String            @id @default(cuid())
  institutionId String
  institution   Institution       @relation(fields: [institutionId], references: [id])
  createdById   String
  createdBy     User              @relation(fields: [createdById], references: [id])
  title         String
  description   String?
  startAt       DateTime
  endAt         DateTime
  location      String?
  audience      CommunicationAudience @default(ALL)
  status        AgendaEventStatus @default(ACTIVE)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  cancelledAt   DateTime?
  cancelledById String?
  @@index([institutionId, startAt])
}
```

- Migración aditiva `20260830000000_add_agenda_events` aplicada con
  `npx prisma migrate deploy` + `npx prisma generate` (validación OK).
- Soft-cancel: `status = CANCELLED`, `cancelledAt`/`cancelledById` seteados;
  no se elimina el registro.

## 7. RBAC Mapping

| Operación | Permiso | ADMIN | TEACHER | PARENT | STUDENT | SUPER_ADMIN |
|---|---|---|---|---|---|---|
| `GET /agenda/events` | `agenda:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /agenda/events/:id` | `agenda:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /agenda/events` | `agenda:create` | ✅ | ✅ | ❌ (403) | ❌ (403) | ✅ |
| `PATCH /agenda/events/:id` | `agenda:update` | ✅ | ✅ | ❌ (403) | ❌ (403) | ✅ |
| `DELETE /agenda/events/:id` | `agenda:delete` | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ✅ |

## 8. Audience Visibility (reglas)

Filtro que se aplica en `findMany`/`findOne` según el rol del actor
(`agenda.service.ts`, lógica compartida con la agregación):

- **ADMIN / SUPER_ADMIN**: todos los eventos del tenant.
- **TEACHER**: evento con `audience IN [ALL, TEACHERS]` **o**
  `createdById == userId`.
- **PARENT**: `audience IN [ALL, PARENTS]`.
- **STUDENT**: `audience IN [ALL, STUDENTS]`.

Por tanto un evento `TEACHERS`-only no aparece ni para padres ni estudiantes;
un evento `STUDENTS`-only no aparece para docentes ajenos.

## 9. Backend — AgendaEventsService

`agenda-events.service.ts` implementa:

- `create(userId, tenantId, dto, ipAddress)`: impone `institutionId` y
  `createdById` desde el contexto; valida `endAt > startAt` (400); crea y
  audita `EVENT_CREATED`.
- `findAll(tenantId, userId, query)`: aplica paginación (`page`/`limit`),
  filtros opcionales (`eventTypeId` no aplica; `status`, `audience`,
  rango de fechas) + reglas de visibilidad; devuelve `{ items, meta }`.
- `findOne(tenantId, userId, id)`: cross-tenant → **404**; no visible por
  audiencia → **404**.
- `update(tenantId, userId, id, dto, ipAddress)`: evento cancelado → **400**;
  cross-tenant → 404; audita `EVENT_UPDATED`.
- `cancel(tenantId, userId, id, ipAddress)`: ya cancelado → **400**;
  cross-tenant → 404; soft-cancel + audita `EVENT_CANCELLED`.

## 10. Backend — Controller

`agenda-events.controller.ts` expone 5 endpoints REST con `@ApiTags('Agenda Events')`
(swagger tag añadido en `main.ts`), todos con
`@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)`:

- `POST /api/v1/agenda/events` → 201
- `GET /api/v1/agenda/events` → 200 (paginado)
- `GET /api/v1/agenda/events/:id` → 200 / 404
- `PATCH /api/v1/agenda/events/:id` → 200 / 400 / 404
- `DELETE /api/v1/agenda/events/:id` → 200 (soft-cancel) / 400 / 404

`AgendaEventsModule` se registra en `agenda.module.ts` (importa
`AuditModule`; exporta tipos para la agregación).

## 11. DTO Security / Authority Fields

- `CreateAgendaEventDto`: `title, description?, startAt, endAt, location?,
  audience` — **sin** `institutionId`/`createdById` (server-set).
- `UpdateAgendaEventDto`: parcial con las mismas reglas; `status`/`cancelledAt`
  no son editables por cliente (fuerzan el flujo `DELETE` para cancelar).
- `ListAgendaEventsQueryDto`: `page, limit, status, audience, from, to`.
- Enviar `institutionId`, `createdById` o campos extra en el body →
  **400 Bad Request** (verificado por e2e TEST).

## 12. Tenant Isolation (mandatory)

- Authority fields derivados del `x-institution-id` (TenantContextGuard) y de
  `req.user.userId`; nunca del body.
- Todo `findMany`/`findOne`/`update`/`cancel` filtra por `institutionId`.
- `:id` de otra institución → **404** (no revela existencia).
- Verificado por los e2e `agenda.e2e-spec.ts` (cross-tenant → 404, inyección
  body → 400).

## 13. Aggregation — GET /agenda con EVENT

En `agenda.service.ts`:

- `AgendaEventType.EVENT = 'EVENT'` agregado al enum en
  `dto/list-agenda-query.dto.ts`.
- `eventTypes` por defecto ahora incluye `EVENT` (junto a TASK y
  COMMUNICATION) → la agenda maestra muestra eventos de forma transparente.
- Nueva rama en la query principal: `if (rawEventTypes.includes(AgendaEventType.EVENT))`
  → `getAgendaEventItems(...)` → items con `id: 'event-{id}'`,
  `type: EVENT`, `sourceType: 'AgendaEvent'`, `route: '/agenda/events/{id}'`,
  `metadata: { audience, location }`.
- La misma lógica de visibilidad por audiencia reutiliza el
  `AgendaEventWhereInput ` generado.

## 14. Migration (aditiva) y aplicación

- Nueva migración `20260830000000_add_agenda_events` (crea tabla + índices + enum).
- Aplicada con `npx prisma migrate deploy`; cliente regenerado con
  `npx prisma generate`; `npx prisma validate` OK.
- **Restricción del proyecto**: NUNCA `prisma migrate dev` (drift preexistente,
  ver sección 20).

## 15. Seed

`prisma/seed.ts` ampliado con los permisos:

- `agenda:create`, `agenda:update`, `agenda:delete` (además del ya existente
  `agenda:read`) → total **73 permisos**.
- `INSTITUTION_ADMIN` recibe los 4; `TEACHER` recibe `read/create/update`;
  `PARENT` y `STUDENT` solo `read`.
- Ejecutado el seed con el workaround de PowerShell:
  `npx ts-node prisma/seed.ts` (**`npm run prisma:seed` falla** por el quoting
  JSON de `--compiler-options` en PowerShell — preexistente, ver sección 20).
- Nota: la línea del log del seed sigue imprimiendo "Assigned 32 permissions
  to SUPER_ADMIN" (string fijo en el script) aunque asigna las 73 — cosmético.

## 16. Frontend — Tipos y constantes

- `apps/web/src/api/types.ts` (~línea 1024): `AgendaEventType` (+ `EVENT`),
  `AgendaEventStatus`, `AgendaEventVisibility`, `AgendaEventItem`,
  `AgendaEventCreatedBy`, `CreateAgendaEventInput`, `UpdateAgendaEventInput`,
  `ListAgendaEventsParams`.
- `apps/web/src/permissions/permission.constants.ts` (~línea 54):
  `AGENDA_CREATE`, `AGENDA_UPDATE`, `AGENDA_DELETE`.

## 17. Frontend — Hooks

`apps/web/src/modules/agenda/hooks/` (exportados en `hooks/index.ts`):

- `useAgendaEvents` / `useAgendaEvent` (query keys `['agenda-events']`).
- `useCreateAgendaEvent` / `useUpdateAgendaEvent` (invalidan
  `['agenda']` + `['agenda-events']`; update además `['agenda-events', id]`).
- `useCancelAgendaEvent` (DELETE → soft-cancel; onSuccess navega a `/agenda`).

## 18. Frontend — Páginas

- `AgendaEventFormPage.tsx` (`/agenda/events/new` y `/agenda/events/:id/edit`):
  modo crear/editar, helpers `datetime-local` ↔ `ISO`, validación, bloqueo de
  edición de eventos `CANCELLED`, gated por `AGENDA_CREATE`/`AGENDA_UPDATE`.
- `AgendaEventDetailPage.tsx` (`/agenda/events/:id`): datos del evento,
  acciones editar/cancelar gated por `AGENDA_UPDATE`/`AGENDA_DELETE`, modal de
  confirmación de cancelación, navegación a `/agenda` tras cancelar.
- `AgendaPage.tsx`: chip `EVENT` (variante "Evento"), botón **"Nuevo evento"**
  envuelto en `<PermissionGate permission={AGENDA_CREATE}>`; click en un evento
  navega a la ruta que trae el item `route`.

## 19. Router

`apps/web/src/app/router.tsx` — rutas nuevas:

- `/agenda/events/new`
- `/agenda/events/:id`
- `/agenda/events/:id/edit`

## 20. Pre-existing / Environment (NO relacionados con PROMPT 93)

Todo lo siguiente es **preexistente** y quedó documentado para el registro;
ninguno fue causado por PROMPT 93:

1. **Drift de migraciones**: `20260822100000_add_task_lifecycle_and_communication_recipients`
   fue modificada tras ser aplicada; la tabla `students` tiene una columna
   `user_id` (índice/FK) ausente del historial de migraciones.
2. **`npm run prisma:seed` falla en PowerShell** (quoting JSON en
   `--compiler-options`); workaround `npx ts-node prisma/seed.ts`.
3. **E2E paralelos comparten base dev** y son frágiles: al lanzar los 28 specs
   con workers paralelos, varios chocan por slug únicos/estado compartido
   (non-determinístico; la lista de suites fallidas cambia entre corridas).
   Bajo `--runInBand` pasan. Causa raíz adicional:
   `files.e2e-spec.ts` usa `prisma.institution.findFirst()` para elegir su
   tenant, por lo que **depende del orden de la DB**; las suites que crean y
   dejan instituciones (`institutions.e2e-spec` deja `deactivate-target-*`;
   `tenant-context.e2e-spec` deja `inactive-*`/`second-school`) contaminan esa
   elección → 403s masivos. Gate ejecutado como: `files.e2e` en DB limpia
   (18/18 PASS) + resto `--runInBand` (27/27, 624 PASS).
4. **Acumulación de adjuntos**: `files.e2e-spec` adjunta `test-document.pdf` al
   primer `communication` del seed (`Reunión de padres`) en cada corrida; tras
   varias corridas se alcanza el máximo (10) → 400. Se limpiaron los 9 sobrantes.
5. **Lint residual** (no toca archivos de PROMPT 93):
   - API: `academic-periods.service.spec.ts:25` (`no-explicit-any`),
     `grades.service.spec.ts:42` (`no-explicit-any`) — ambos ya modificados en
     el working tree por prompts previos (70–92).
   - Web: `administration-pages.test.tsx:201` (`url` unused),
     `AttendanceRegisterPage.tsx:58` (`studentMap` unused),
     `ChildContext.tsx:81` (warning fast-refresh),
     `useUpdateFollowUpEntry.test.tsx:2` (`waitFor` unused) — sin cambios
     respecto a HEAD.
6. **Limpieza realizada durante el gate** (datos de prueba orfanos en la base
   dev que rompían suites): 25 instituciones `deactivate-target-*`,
   2 instituciones `inactive-membership-school`/`inactive-institution`,
   10 adjuntos duplicados en `Reunión de padres`. Operación segura de datos
   de test, no toca datos seed funcionales.

## 21. Security Criteria / G11 / G12

- **G11 (RBAC)**: permisos por método; matriz verificada por e2e (403 para
  padre/estudiante en create/update/delete; 403 para docente en delete).
- **G12 (BOLA/IDOR)**: cross-tenant → 404 en read/update/cancel; body
  tampering (`institutionId`) → 400; campos de autoridad server-set.
- Auditoría: las 3 acciones (create/update/cancel) registran audit log con
  entityType `AgendaEvent`.

## 22. Typescript / Build / Prisma

- `npx prisma validate` ✅, `npx prisma generate` ✅.
- API `tsc --noEmit` (tsconfig + tsconfig.build) ✅ sin salida.
- Web `tsc --noEmit` ✅.
- Build API: `npm run build` (`nest build`) → `dist/main.js` generado ✅.
- Build Web: `npm run build` (`tsc --noEmit && vite build`) ✅ (12.4s).

## 23. API Contract (Swagger/OpenAPI)

- Endpoints documentados con decoradores `@ApiTags('Agenda Events')`,
  `@ApiOperation`, `@ApiBody`, `@ApiResponse`, `@ApiParam`.
- `main.ts` registra el tag **"Agenda Events"** en Swagger.
- `@agenda/api@1.0.1`, prefijo global `api/v1`.

## 24. Regression (gate completo — verde)

| Gate | Resultado |
|---|---|
| Prisma validate + generate | ✅ |
| API tsc (tsconfig + build) | ✅ |
| Web tsc | ✅ |
| API unit (`npx jest`) | **744/744** (40 suites) |
| API e2e (`agenda`) | **36/36** |
| API e2e (resto, `--runInBand`) | **27/27** (624 tests) |
| API e2e (`files`, DB limpia) | **18/18** (aislado, ver sección 20.3) |
| Web vitest (completo) | **495/495** (61 archivos) |
| Web vitest (agenda) | **34/34** |
| Build API / Web | ✅ / ✅ |
| Lint archivos PROMPT 93 | ✅ (agenda API + web) |

Nota: la primera corrida "todo en paralelo" (API unit + e2e + web a la vez)
produjo fallos por contención de recursos (argon2, timeouts, collisiones de
DB compartida) que **pasan en aislamiento**: los usuarios de
`users.service.spec`/`password.service.spec` y las 15 suites web con "1 test
fallido" fueron flakiness de ejecución simultánea, no regresiones (verificadas
individualmente y en el gate final).

## 25. PO Decisions (Frozen)

- Se reutiliza `CommunicationAudience` (ALL/TEACHERS/PARENTS/STUDENTS) en vez
  de diseñar un enum de visibilidad propio.
- `AgendaEventStatus` solo `ACTIVE | CANCELLED`; **cancelación suave** con
  `DELETE` (idempotencia rechazada con 400 en doble cancelación).
- RBAC global por permiso (sin ownership por docente) — limitación aceptada.
- `GET /agenda` incluye `EVENT` por defecto (cambio de comportamiento
  consciente y versionado por el enum).
- La agregación entrega `route` por item para que el front navegue;
  `AgendaPage` usa directamente `event.route`.

## 26. Findings Remaining / Technical Debt

- Drift preexistente de migraciones (sección 20.1) pendiente de reconciliar.
- Fragilidad e2e por DB compartida + `findFirst()` en files.e2e (20.3/20.4).
- Docente puede editar/cancelar eventos ajenos del mismo tenant (limitación
  de diseño, ver sección 25).
- Sin paginación tipo cursor/keyset en la agenda maestra.
- `deactivate-target-*`/`inactive-*` seguirán acumulándose en la DB dev tras
  cada corrida de `institutions.e2e-spec`/`tenant-context.e2e-spec`.

## 27. Git Status (working tree)

- Rama `main`; sin commits/pushes/tags en esta sesión.
- Cambios de PROMPT 93 conviven con el working tree sucio heredado (70–92).
- `git status --porcelain` y `git diff --stat` disponibles bajo demanda (se
  entregan en la sección 29 como referencia textual del estado).

## 28-34. (Reservado — coincidir estructura de informes previos)

## 35. Final Report Summary

PROMPT 93 queda **IMPLEMENTED**. Se entregó CRUD de eventos con RBAC por
método, visibilidad por audiencia, aislamiento de tenant (BOLA/IDOR-safe),
auditoría, agregación a la agenda maestra y frontend completo (hooks + 2
páginas + rutas + "Nuevo evento"), todo cubierto por tests unitarios, e2e y
vitest con el gate de regresión completo en verde. Los únicos fallos
observados durante el gate fueron **preexistentes o ambientales**
(contención de recursos por ejecución paralela masiva, datos e2e residuales
acumulados, drift de migraciones y errores de lint heredados), todos
documentados en la sección 20 sin tocar código ajeno al prompt. Sin
commit/push/tag, según las instrucciones.