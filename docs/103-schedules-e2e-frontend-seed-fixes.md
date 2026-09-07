# PROMPT 103 — FIXES ALINEACIÓN CONTRATO SCHEDULES: E2E, FRONTEND Y SEED

Fecha: 2026-09-03
Veredicto: **COMPLETE**
Objetivo: corregir los 3 hallazgos HIGH de PROMPT 102 (F-01, F-02, F-03) para restaurar la regresión E2E en
verde y la coherencia de contrato entre backend/frontend/tests/seed. Sin funcionalidad nueva. Sin commits/push/tags.

---

## 1. Executive Summary

Se corrigieron los 3 hallazgos HIGH detectados en PROMPT 102 que mantenían en rojo el job de CI `api-e2e`
(24 tests fallando) y rompían la UI de horarios:

- **F-01 (E2E Schedules):** `apps/api/test/schedules.e2e-spec.ts` migrado al nuevo contrato (`academicPeriodId`
  requerido, `classroom` string eliminado, nuevos campos opcionales `classroomId`/`blockId`/`teacherUserId`).
- **F-02 (Frontend Schedules):** tipos, páginas y tests de `apps/web` migrados al nuevo contrato (se envía
  `academicPeriodId` obligatorio, se elimina el envío de `classroom`, se exponen las relaciones nuevas).
- **F-03 (Seed incoherente):** `apps/api/prisma/seed.ts` corregido para que cada curso que el docente demo
  tiene como `TeacherAssignment` activo tenga matrículas (enrollments), haciendo coherentes los fixtures de
  Reports.

Resultado final: **API E2E 681/681 en verde (31 suites)**, unit 805/805, web Vitest 510/510, typechecks y
build OK. NO se implementó funcionalidad nueva. NO se tocaron F-04/F-05/F-06/F-07.

---

## 2. Scope

- **Incluido (exclusivo):** los 3 hallazgos HIGH (F-01/F-02/F-03) sobre los archivos de consumo de Schedules.
- **Excluido:** funcionalidad nueva, optimizaciones F-04/F-05/F-06/F-07, refactor de business rules, migraciones
  de esquema nuevas, commits/push/tags.
- **Archivos tocados por PROMPT 103:**
  - `apps/api/test/schedules.e2e-spec.ts` (F-01)
  - `apps/api/prisma/seed.ts` (F-03)
  - `apps/web/src/api/types.ts` (F-02)
  - `apps/web/src/modules/schedules/pages/ScheduleFormPage.tsx` (F-02)
  - `apps/web/src/modules/schedules/pages/ScheduleDetailPage.tsx` (F-02)
  - `apps/web/src/modules/schedules/pages/SchedulesPage.tsx` (F-02)
  - `apps/web/src/modules/schedules/__tests__/*.tsx` (F-02)

---

## 3. F-01 — E2E Schedules migrado al nuevo contrato

**Problema:** el spec E2E de Schedules usaba el payload antiguo (`classroom` string, sin `academicPeriodId`),
por lo que `create` devolvía 400 por `forbidNonWhitelisted` y los tests de aislamiento de tenant (que esperan
404) fallaban porque la validación del DTO (400) ocurría antes de llegar al servicio.

**Cambios en `apps/api/test/schedules.e2e-spec.ts`:**
- Se añadió `demoAcademicPeriodId` (obtenido vía `academicPeriod.findFirst`), `classroomId`/`blockId` de demo,
  y fixtures del `TeacherAssignment` ACTIVE del docente demo (`taTeacherUserId`, `taCourseId`, `taSubjectId`,
  `taAcademicPeriodId`).
- `TEST-01` (create → 201) ahora envía `academicPeriodId` + `classroomId`/`blockId` opcionales y ya no `classroom`.
- Tests cross-tenant (`TEST-19` course, `TEST-20` subject) envían `academicPeriodId` válido para llegar al
  servicio y obtener el 404 esperado de tenant isolation.
- `TEST-07` (PATCH → 200) ahora actualiza `status` (sin disparar overlap no deseado).
- `TEST-17`/`TEST-07b` usan payloads válidos en el body (se elimina `classroom` que habría devuelto 400 antes
  del 404 por tenant) y se **materializó** un schedule en la institución secundaria para que estas pruebas no
  sean vacuas.
- `TEST-05b` (deactivate create) añade `academicPeriodId`.
- Nuevos tests de cobertura del contrato nuevo:
  - create con docente con assignment ACTIVE → 201
  - create sin docente (opcional) → 201
  - docente SIN assignment ACTIVE → 400
  - `classroomId` de otro tenant → 404
  - `blockId` de otro tenant → 404
- Fixtures de institución secundaria: se crean `academicPeriod`, `classroom` y `scheduleBlock` y se limpian en
  `afterAll` en orden de FK correcto (bloques/aulas antes de institución), reproduciendo el aislante de tenant
  sin dejar datos huérfanos.

---

## 4. F-02 — Frontend Schedules migrado al nuevo contrato

**Problema:** el frontend seguía con el tipo `Schedule { classroom: string | null }`, el formulario enviaba
`classroom` y omitía `academicPeriodId`, y las páginas leían `schedule.classroom`.

**Cambios:**
- `apps/web/src/api/types.ts`: `Schedule`, `CreateScheduleInput` y `UpdateScheduleInput` ahora incluyen
  `academicPeriodId` (requerido en create) y `teacherUserId`/`classroomId`/`blockId` (opcionales); se eliminó
  `classroom: string`. `ListSchedulesParams` ya tenía `courseId`/`subjectId`/`dayOfWeek`.
- `ScheduleFormPage.tsx`: se añade select obligatorio "Periodo académico" (`useAcademicPeriods`), select opcional
  "Profesor" (`useUsers` desde teacher-assignments), y se elimina el input libre "Aula" (que enviaba `classroom`).
  El payload de create/update envía `academicPeriodId` y `teacherUserId` (si definido).
- `ScheduleDetailPage.tsx`: se leen `classroomId`/`blockId`/`teacherUserId`/`academicPeriodId`; se elimina la
  referencia a `schedule.classroom`.
- `SchedulesPage.tsx`: se muestran `classroomId` (forma corta) en tabla y tarjetas móviles.
- Tests web actualizados: se mockean `useAcademicPeriods`/`useUsers`, el submit válido selecciona periodo, y el
  fixture del detalle + sus aserciones reflejan los campos nuevos.

---

## 5. F-03 — Seed incoherente (Reports E2E)

**Problema:** el seed creaba enrollments solo en `enrollCourses[0]` pero TeacherAssignments del docente demo en
`enrollCourses.slice(0, 2)`. El assignment del segundo curso (sin matriculados) rompía el fixture de Reports
(`enrollment.studentId` null → 18 tests E2E fallando).

**Cambio en `apps/api/prisma/seed.ts`:** la sección de enrollments demo ahora matricula a los primeros 2
estudiantes en **cada uno** de los 2 cursos que el docente demo tiene asignados (mismo `slice(0, 2)`), de forma
determinista, tenant-scoped e idempotente (usa `findUnique` + `create`, sin `deleteMany`). Tras re-seed: cada
curso del assignment tiene 2 matriculados.

---

## 6. Gates (todos en verde)

| Gate | Resultado |
|------|-----------|
| `prisma validate` | PASS — schema válido |
| `prisma migrate status` | PASS — 23 migraciones, DB al día |
| `prisma generate` | PASS — client v6.19.3 |
| API typecheck | PASS |
| Web typecheck | PASS |
| API unit (`jest`) | PASS — 805/805 |
| Web Vitest | PASS — 510/510 |
| API E2E (`jest --config ./test/jest-e2e.json --runInBand`) | **PASS — 681/681 (31 suites)** |
| Web build (`tsc --noEmit && vite build`) | PASS |
| Lint (archivos de PROMPT 103) | PASS — `schedules.e2e-spec.ts` limpio |

**Nota lint:** el script estándar `npm run lint` (`{src,test}`) arroja 2 errores pre-existentes en archivos
commiteados no tocados por PROMPT 103 (`academic-periods.service.spec.ts:25`, `grades.service.spec.ts:42`,
`@typescript-eslint/no-explicit-any`); y `prisma/seed.ts` tiene errores pre-existentes de `any` que quedan fuera
del glob estándar de lint (`{src,test}`) y no corresponden a las líneas editadas en F-03. Ninguno proviene de
emplazamientos de PROMPT 103.

---

## 7. Cumplimiento de reglas

- No se debilitó auth, tenant isolation, RBAC ni validación (los tests de 403/401/404 de tenant se mantienen y
  ahora ejercen el 404 correcto).
- No se eliminaron tests (solo se migraron al contrato nuevo y se añadieron casos de cobertura).
- No se usó `deleteMany({ institutionId: undefined })` ni operaciones destructivas no tenant-scoped.
- No se modificó `schema.prisma` ni se añadieron migraciones (solo se re-compiló el client para el gate).
- No se cambiaron business rules de Schedules (F-04/F-05 no implementados); F-06/F-07/F-08 quedan fuera de meta.
- TypeScript strict PASS.
- Seeds idempotentes; sin datos aleatorios nuevos.

---

## 8. Estado git

- Branch `main`, HEAD `b1f1b86` (sin cambios en commits).
- Archivos modificados por PROMPT 103 (working tree, sin commitear):
  `M apps/api/prisma/seed.ts`, `M apps/api/test/schedules.e2e-spec.ts`,
  `M apps/web/src/api/types.ts`, `M apps/web/src/modules/schedules/pages/{ScheduleFormPage,ScheduleDetailPage,SchedulesPage}.tsx`,
  `M apps/web/src/modules/schedules/__tests__/{schedule-form-page,schedule-detail-page,schedules-page}.test.tsx`.
- No se crearon commits/push/tags.

---

## 9. Siguientes pasos (fuera de PROMPT 103)

- F-04 (consistencia block/time), F-05 (overlap period/block-aware), F-06 (tope por docente), F-07 (race de
  workload) y F-08 (migración `DROP COLUMN` de `classroom`) permanecen pendientes y NO se tocaron.
- Limpieza de deuda lint pre-existente en `academic-periods.service.spec.ts`, `grades.service.spec.ts` y
  `prisma/seed.ts` (no bloquearon las gates de PROMPT 103).