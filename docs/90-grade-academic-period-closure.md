# PROMPT 90 — GRADE ↔ ACADEMIC PERIOD LINK + CLOSURE LIFECYCLE

> **Fecha:** 2026-08-28
> **Tipo:** Implementación funcional (backend + frontend + migración aditiva + RBAC + tests).
> **Rama:** `main` (working tree; **sin commit/push/tag**)

---

## 1. Executive Summary

PROMPT 90 formaliza la relación entre `Grade` y `AcademicPeriod` e introduce el ciclo de
vida **ACTIVE / CLOSED** de los periodos académicos (closure con consolidación mínima),
protegiendo los grados de mutación cuando el periodo está **CLOSED**.

Lo entregado:

- `Grade.academicPeriodId` (FK) vinculado opcionalmente a `AcademicPeriod`, con backfill
  por código en la migración.
- `AcademicPeriod.status` enum ampliado con `CLOSED` (`ACTIVE | INACTIVE | CLOSED`).
- Campos de autoridad `createdById`, `closedById`, `closedAt` en `AcademicPeriod`
  (solo servidor; no vienen de DTOs).
- Operación `PATCH /academic-periods/:id/close` (OPEN → CLOSED), idempotente
  (CLOSED → 400), auditada (`ACADEMIC_PERIOD_CLOSED`), con cierre transaccional y
  bloqueo de fila (`SELECT ... FOR UPDATE`) para ser seguro ante concurrencia.
- Protección **CLOSED = inmutabilidad** para periodos (update/deactivate) y para grados
  (create/update fallan con 400 si el periodo resuelto está CLOSED), vía transacción +
  lock de fila.
- Nueva permisología `academic-periods:close`, otorgada a `SUPER_ADMIN` +
  `INSTITUTION_ADMIN` (template y tenant), **no** a `TEACHER`.
- UI (web): botón "Cerrar periodo" con confirmación, badge/modos CLOSED, bloqueo de
  edición de periodos/calificaciones cerrados, tipos y constantes actualizados.
- Migración **aditiva, no destructiva** (sin `DROP/TRUNCATE/CASCADE`).

**Resultado de pruebas:** unit API `648/648`, web `426/426`, e2e de los módulos tocados
`87/87`. Suites e2e `files` (S3) y `tenant-context` (login/rate-limit) fallan por causas
**preexistentes / de entorno**, ajenas a este prompt (ver secciones 20-21).

**Estado: IMPLEMENTED — PROMPT 90 COMPLETE (sin commit/push/tag, según instrucciones).**

---

## 2. Git / Working-Tree State

- **No** se ejecutó `git commit`, `git push` ni `git tag`. Solo cambios en working tree
  (requerido por el prompt).
- `git diff --stat` al cierre: 15 archivos modificados, +552/−49; se listan en sección 27.
- Archivos nuevos sin trackear: migración `20260828000000_add_grade_academic_period_link_and_closure/`
  y hook `useCloseAcademicPeriod.ts`.

---

## 3. Objective & Scope

1. Vincular `Grade` → `AcademicPeriod` (FK `academicPeriodId`).
2. Ciclo de vida `ACTIVE | CLOSED` con closure + consolidación mínima (validación de
   periodo + flip de status + auditoría). Sin boletines/reportes (fuera de alcance, PROMPT 94).
3. Proteger grados CLOSED de mutación (create/update con periodo CLOSED → 400).
4. Mantener aislamiento multi-tenant, RBAC, auditoría y seguridad intactos.

## 4. Non-Goals (explícito)

- **No** se implementó PROMPT 91+ (asistencia, reportes, eventos de agenda, onboarding UI, CI/CD cloud).
- **No** se implementó consolidación de boletines/notas (PROMPT 94). La "consolidación" de
  este prompt es mínima: el cierre valida el periodo, hace flip de status y audita.
- **No** se implementó revocación CLOSED→OPEN (default ACTIVE→CLOSED; documentado como
  decisión de producto en PO Decisions, sección 25).
- **No** se envían notificaciones en el cierre (mejora futura documentada).

---

## 5. No Breaking Changes (verificación)

- Migración estrictamente aditiva: `CREATE TYPE`-no se alteró enum de forma destructiva
  (se añadió valor `CLOSED` vía `ALTER TYPE ... ADD VALUE`), `ADD COLUMN`, `ADD CONSTRAINT`,
  `CREATE INDEX`, más backfill `UPDATE ... SET academic_period_id` por coincidencia de código.
- No hay `DROP`/`TRUNCATE`/`CASCADE` sobre datos existentes. Verificado contra `migration.sql`.
- `prisma validate` OK y cliente Prisma regenerado.

---

## 6. Backend — AcademicPeriodsService

`apps/api/src/modules/academic-periods/academic-periods.service.ts`

- **`create`**: ahora fija `createdById: userId` (servidor) en lugar de confiar en el DTO.
- **`update`**: rechaza si `existing.status === CLOSED` (400 "Closed academic periods cannot
  be modified") y rechaza `dto.status === CLOSED` (400 "Use the close endpoint...").
  `deactivate` sigue pasando por `update`, por lo que también queda protegido de CLOSED.
- **`close()`** (nuevo): `$transaction` + `SELECT id, status ... FOR UPDATE` por
  `id + institution_id`. Si no existe → 404; si ya `CLOSED` → 400 (idempotente); en otro
  caso hace `update` con `status=CLOSED, closedById=userId, closedAt=now()` y audita
  `ACADEMIC_PERIOD_CLOSED`. El lock de fila hace que `close()` y las escrituras de grados
  sean mutuamente excluyentes (seguridad ante concurrencia).

## 7. Backend — GradesService

`apps/api/src/modules/grades/grades.service.ts`

- **`create`** y **`update`** ahora corren dentro de `$transaction` y, dentro de ella,
  hacen `SELECT id, status ... FROM academic_periods WHERE institution_id = ... AND
  lower(code) = lower(period) ... FOR UPDATE`:
  - Si existe y `status === 'CLOSED'` → `400` ("Cannot create a grade in a closed academic
    period" / "Cannot modify a grade in a closed academic period").
  - Si existe y `OPEN` → vincula `academicPeriodId` (connect).
  - Si no hay coincidencia → `academicPeriodId = null` (sin link; **comportamiento
    retrocompatible** que mantiene verdes los e2e existentes que usan `E2E-Q1` sin periodo).
- Se eliminó el helper sin usar `resolvePeriodForGrade`.

Este diseño garantiza protección CLOSED atómica con el propio write (el lock es de la
misma fila de `academic_periods` que usa `close()`).

---

## 8. Controller

`apps/api/src/modules/academic-periods/academic-periods.controller.ts`

- Nueva ruta `PATCH /academic-periods/:id/close` con `@RequirePermission('academic-periods:close')`,
  scope por tenant (`req.tenant.institutionId`).

## 9. DTO Security / Authority Fields

- `createdById`, `closedById`, `closedAt`, `status`, `institutionId` **no** provienen de
  DTOs; se fijan en el servidor. Verificado en `CreateAcademicPeriodDto`/`UpdateAcademicPeriodDto`
  (no exponen estos campos salvo `status`, que ahora está restringido a no poder fijar CLOSED).

---

## 10. Tenant Isolation (mandatory)

- Toda ruta nueva (close) y toda lógica de grados usa `req.tenant.institutionId`.
- El `close()` filtra por `institution_id`; cross-tenant → 404 (verificado por e2e).
- `create/update` de grados filtran `academic_periods WHERE institution_id = ...`. IDOR
  no aplica: los periodos de otro tenant no son resueltos ni bloqueados por un tenant
  ajeno (G12).

## 11. RBAC — nueva permiso

- Se agregó `academic-periods:close`.
- Asignado a `INSTITUTION_ADMIN_PERMISSIONS` (template y tenant) y a `ALL_PERMISSIONS`
  (SUPER_ADMIN). **NO** a `TEACHER_PERMISSIONS`. Verificado en DB (psql):
  - `role_permission` para `academic-periods:close` → `INSTITUTION_ADMIN` (2 filas:
    template + tenant) y `SUPER_ADMIN`; TEACHER sin asignación.
- El ADMIN (INSTITUTION_ADMIN) cierra periodos; el TEACHER solo lee (403 en close).

---

## 12. Concurrency Safety

- `close()` y las escrituras de grados usan `SELECT ... FOR UPDATE` sobre la misma fila de
  `academic_periods`, dentro de `$transaction`. Cierre y escritura de grados se excluyen
  mutuamente a nivel de fila (no hay ventana entre chequear CLOSED y escribir).

## 13. Migration (aditiva) y aplicación

- Archivo: `apps/api/prisma/migrations/20260828000000_add_grade_academic_period_link_and_closure/migration.sql`.
- Contenido: `ALTER TYPE ... ADD VALUE 'CLOSED'`; `ADD COLUMN academic_period_id` +
  FK + índice en `Grade`; `ADD COLUMN created_by_id/closed_by_id/closed_at` + FKs + índices
  en `AcademicPeriod`; backfill `UPDATE grade SET academic_period_id = ap.id FROM
  academic_periods ap WHERE ...` por código.
- **Aplicación:** se usó `prisma db execute --file` (no `prisma migrate dev`) porque el
  entorno local presentaba *migration drift* preexistente (la migración
  `20260822100000_add_task_lifecycle_and_communication_recipients` aparecía "modificada
  después de aplicarse"); se evitó `migrate reset` para no destruir datos. La migración
  quedó aplicada a la DB (columnas, FKs, índices y 16 grados backfilled verificados).
  No quedó registrada en `_prisma_migrations` (limitación documentada).
- Precondición del entorno (preexistente, no destructiva): falta de la columna
  `students.user_id` que el schema declara pero ninguna migración había creado; se añadió
  nullable + índice único + FK vía `prisma db execute` para desbloquear seed/tests.

---

## 14. Seed

`apps/api/prisma/seed.ts`

- `academic-periods:close` agregado a `ALL_PERMISSIONS` y `INSTITUTION_ADMIN_PERMISSIONS`,
  más su definición.
- Periodos demo de grados `['Q1-2026','Q2-2026']` → `['2026-P1','2026-P2']`.
- Periodo demo `2026-P3` en `CLOSED` (con `createdById/closedById/closedAt = adminUser`).
- Backfill de vínculo grade→period tras la sección 18.
- Ejecutado OK con `npx ts-node prisma/seed.ts` (el script `prisma:seed` falla en
  PowerShell por escape de comillas; usar ts-node directo).

## 15. Frontend — Tipos y constantes

- `apps/web/src/api/types.ts`: `AcademicPeriodStatus` ahora `'ACTIVE'|'INACTIVE'|'CLOSED'`;
  `ACADEMIC_PERIOD_STATUS_LABELS` con `CLOSED: 'Cerrado'`; `AcademicPeriod` con
  `createdById/closedById/closedAt` (opcionales, para no romper tests existentes);
  `Grade.academicPeriodId?: string | null`.
- `apps/web/src/permissions/permission.constants.ts`: `ACADEMIC_PERIODS_CLOSE = 'academic-periods:close'`.

## 16. Frontend — Academic Periods

- Hook `useCloseAcademicPeriod` (nuevo) + export en `hooks/index.ts`.
- `AcademicPeriodDetailPage`: badge CLOSED (variante danger), `canClose` por
  `ACADEMIC_PERIODS_CLOSE`, botón "Cerrar periodo" (solo ACTIVE) con modal de confirmación
  y texto de advertencia, `canEdit = canManage && !isClosed`.
- `AcademicPeriodsPage`: badge CLOSED (variante danger) en la lista.
- `AcademicPeriodFormPage`: bloquea edición cuando el periodo es CLOSED (mensaje + botón
  "Volver al periodo").

## 17. Frontend — Grades (decisión de diseño)

- La protección CLOSED de calificaciones se aplica **server-side** (autoridad). En el
  formulario de grados se mantiene el campo libre `period` (label), de modo que **los
  tests existentes de frontend de grados siguen pasando sin romper** (mockean input de
  texto). El backend resuelve el periodo por código y bloquea/blinda según CLOSED.
- Un `<select>` de periodos se documenta como mejora UX futura (ver PO Decisions, sección 25).

---

## 18. Tests — Backend

### Unit (API) — `npx jest`
- Resultado: **648/648 passed** (36 suites). Nueva cobertura:
  - `grades.service.spec.ts`: mock `$transaction`/`$queryRaw` delegante para soportar la
    escritura transaccional (los tests previos pasan sin cambios de aserciones).
  - `academic-periods.service.spec.ts`: `close()` ACTIVE→CLOSED (campos de autoridad +
    audit), close de ya-CLOSED → 400, close cross-tenant → 404, guards de edición CLOSED,
    `dto.status=CLOSED` rechazado, `createdById` seteado en create, deactivate de CLOSED → 400.

### E2E (integración) — `npx jest --config ./test/jest-e2e.json`
- Módulos touched: `academic-periods` + `grades` (+`school-grades` por substring) = **87/87 passed**.
  Casos nuevos:
  - `academic-periods.e2e-spec.ts`: create OPEN; close → CLOSED (closedAt/closedById);
    close ya-CLOSED → 400; TEACHER close → 403; editar CLOSED → 400; deactivar CLOSED → 400;
    close cross-tenant → 404; body `institutionId` tampering → 400.
  - `grades.e2e-spec.ts`: create con periodo CLOSED → 400; update hacia periodo CLOSED → 400;
    create con periodo OPEN → 201 y vincula `academicPeriodId`.
- Suite completa: 549 aprox. pasan; los fallos persistentes son de `files` (S3) y
  `tenant-context` (login 400), ver secciones 20-21.

## 19. Tests — Frontend (Vitest)
- `src/modules/grades` + `src/modules/academic-periods`: **44/44 passed**.
- Suite completa web: **426/426 passed** (55 archivos). Typecheck web: limpio.

---

## 20. Pre-existing / Environment Blocked (NO relacionados con PROMPT 90)

- `files.e2e-spec.ts` → `should attach file to communication`: falla por almacenamiento
  (S3/MinIO) ausente/mal configurado en el entorno local. Ajeno a académico.
- `tenant-context.e2e-spec.ts` → `should return 403 for inactive membership` /
  `should return 403 for inactive institution`: el login devuelve 400 (rate-limiter /
  contaminación de la DB dev compartida con miles de filas de sesión). Ajeno a académico.
- En el full run hay además suites **flaky/order-dependent** (ej. `memberships`,
  `rbac-authorization` con 401 transitorios) que **pasan en ejecución aislada/sucia-limpiada**;
  corresponden a la nota G11 (553 tests de integración no ejecutados de forma fiable en CI local).

Ninguna de estas suites toca academic-periods/grades; los módulos de PROMPT 90 pasan limpios.

## 21. Security Criteria / G11 / G12

- **G12 (IDOR/BOLA)**: rutas nuevas tenant-scoped; close y escrituras de grados filtran por
  `institutionId`. No requiere arreglo extra.
- **G11**: no resuelto en este prompt; solo se aseguró cobertura local adecuada y se
  documenta la flakiness de entorno.
- No se introdujeron campos clientes de autoridad; RBAC y auditoría intactos.

---

## 22. Typescript / Build / Prisma

- `npm run typecheck` (api y web): **limpio**.
- `npm run build` (api, Nest): **OK**.
- `prisma validate`: **OK**; cliente regenerado.

## 23. API Contract (Swagger/OpenAPI)

- Nueva operación `PATCH /api/v1/academic-periods/{id}/close` (documentada por Nest
  auto-generada). Contratos existentes de grados/periodos sin romper (tipo `Grade` añade
  `academicPeriodId` opcional; `AcademicPeriod` añade campos de autoridad opcionales).

---

## 24. Regression

- Unit API (todo), E2E de módulos tocados, y web (todo) en verde.
- Suites no relacionadas en verde con la excepción de `files`/`tenant-context` (sección 20)
  y flakiness de entorno (G11) — ninguno por causa de PROMPT 90.

## 25. PO Decisions (Frozen)

- CLOSED→OPEN **no** se implementa (default ACTIVE→CLOSED). Rearbrir un periodo cerrado
  queda como decisión de producto futura.
- La creación/edición de grados mantiene el campo libre `period` en la UI; el select de
  periodos es mejora UX futura (la protección CLOSED es server-side y no depende de él).
- Sin notificaciones en el cierre (futura mejora).
- Consolidación mínima (sin boletines) — alineado a non-goal de PROMPT 94.

## 26. Findings Remaining / Technical Debt

- La migración de este prompt se aplicó con `prisma db execute` y no quedó en
  `_prisma_migrations` por el drift preexistente del entorno; al moverse a un entorno
  limpio conviene re-aplicarla con `prisma migrate dev` (aplica también la columna
  `students.user_id`).
- Flakiness/rate-limit de suites de integración en entorno local (G11).
- `files` requiere config de objeto de almacenamiento (S3/MinIO).

---

## 27. Git Status

`git diff --stat` (working tree, sin commit):

```text
 apps/api/prisma/schema.prisma                      |  44 +++---
 apps/api/prisma/seed.ts                            |  27 +++-
 apps/api/src/modules/academic-periods/academic-periods.controller.ts | 22 +++
 apps/api/src/modules/academic-periods/academic-periods.service.spec.ts | 147 ++++++++++
 apps/api/src/modules/academic-periods/academic-periods.service.ts | 67 +++++++++
 apps/api/src/modules/grades/grades.service.spec.ts |   7 +
 apps/api/src/modules/grades/grades.service.ts      |  92 +++++++++----
 apps/api/test/academic-periods.e2e-spec.ts         |  45 +++++++
 apps/api/test/grades.e2e-spec.ts                   |  72 ++++++++++
 apps/web/src/api/types.ts                          |   7 +-
 apps/web/src/modules/academic-periods/hooks/index.ts | 1 +
 apps/web/src/modules/academic-periods/pages/AcademicPeriodDetailPage.tsx | 53 ++++-
 apps/web/src/modules/academic-periods/pages/AcademicPeriodFormPage.tsx | 13 ++
 apps/web/src/modules/academic-periods/pages/AcademicPeriodsPage.tsx | 3 +-
 apps/web/src/permissions/permission.constants.ts   | 1 +
 15 files changed, 552 insertions(+), 49 deletions(-)
```

Untracked nuevos: `apps/api/prisma/migrations/20260828000000_add_grade_academic_period_link_and_closure/`
y `apps/web/src/modules/academic-periods/hooks/useCloseAcademicPeriod.ts`.

---

## 28. Final Verdict

```
PROMPT 90 — GRADE ↔ ACADEMIC PERIOD LINK + CLOSURE LIFECYCLE
IMPLEMENTED — COMPLETE
- Grade.academicPeriodId (FK) + backfill aditivo
- Ciclo ACTIVE/CLOSED con PATCH /academic-periods/:id/close (idempotente, auditado, lock de fila)
- CLOSED = inmutabilidad (periodos y grados) con SELECT ... FOR UPDATE
- RBAC academic-periods:close (SUPER_ADMIN + INSTITUTION_ADMIN, no TEACHER)
- Tenant isolation / IDOR / auditoría intactos
- Tests: unit 648/648, web 426/426, e2e módulos 87/87
- Migración aditiva, sin DROP/TRUNCATE/CASCADE; sin commit/push/tag
```
