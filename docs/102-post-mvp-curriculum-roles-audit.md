# PROMPT 102 — AUDITORÍA FINAL POST-MVP: CURRÍCULO, HORARIOS, ASIGNACIÓN DOCENTE, ROLES Y BASE DE DATOS

Fecha: 2026-09-03
Veredicto: **SAFE WITH FIXES**
Solo documento de auditoría. No se implementaron funcionalidades ni correcciones. No se crearon commits/push/tags.

---

## 1. Executive Summary

Se auditaron los cambios post-MVP realizados después del cierre técnico (v1.0.2 @ `000fe79`): jerarquía
curricular (Area → Subject → Course → TeacherAssignment → Schedule), aulas, bloques, refactor de Schedules,
nuevos roles institucionales y datos demo + migración `20260904000000_add_curriculum_hierarchy_and_staff`.

**Veredicto: SAFE WITH FIXES.** La integridad del esquema, las migraciones, la seguridad, el tenant isolation,
el RBAC y la base de datos están limpias. Sin embargo, el refactor de Schedules quedó **incompleto** en los
componentes de consumo: la **UI web de Schedules** y la **suite E2E de Schedules/Reports** NO fueron migradas
al nuevo contrato, lo que produce **24 tests E2E en rojo** (el job CI `api-e2e` fallará) y una **UI de horarios
rota/funcionalmente inoperante**. Estos hallazgos son corregibles sin comprometer datos, seguridad ni
migraciones (sin reabrir el alcance funcional del MVP).

No existe ningún blocker/critical que comprometa datos, seguridad, tenant isolation, migraciones ni el
funcionamiento fundamental. No se recomienda funcionalidad nueva.

---

## 2. Scope

- **Incluido:** cambios post-MVP en `main` tras `v1.0.2` (working tree sin commitear): schema, seed, módulos
  `schedules`, `teacher-assignments`, `roles`, `memberships`, `agenda`, DTOs, `common/rbac`, migración
  `20260904000000_add_curriculum_hierarchy_and_staff`.
- **Excluido:** CUALQUIER corrección o implementación. Este prompt es solo diagnóstico.
- **No se ejecutó migrate reset / seed / escribió en BD.** FASE 11 se hizo con consultas READ-ONLY.

---

## 3. Git State

- **Branch:** `main`
- **HEAD:** `b1f1b86` (`docs(101): record definitive MVP commit hash`)
- **Commit MVP definitivo (tag):** `000fe79` (`release: close Agenda Escolar Digital MVP`) = `v1.0.2`
- **Tags:** `v1.0.2`, `v1.0.2-rc.1` (→ `e7dca4a`), `v1.0.1`, `v1.0.0`
- **Remote:** NO CONFIGURADO (sin push).
- **Working tree:** 20 archivos modificados + 2 nuevas rutas untracked, correspondientes 100% a los cambios
  post-MVP. Sin archivos inesperados (único artefacto ajeno: `test-output.txt`, no relevante, excluido del
  flujo de commit en PROMPT 101).
- **Nueva migración sin commitear:** `apps/api/prisma/migrations/20260904000000_add_curriculum_hierarchy_and_staff/`
- **Nueva ruta común:** `apps/api/src/common/rbac/assignable-roles.ts`

Cambios post-MVP (status `M`): `.env.example`, `Dockerfile`, `schema.prisma`, `seed.ts`, `app.module.ts`,
`main.ts`, módulos `schedules`, `teacher-assignments`, `roles`, `memberships`, `agenda`, `communication-recipients`,
`institutions`, `task-assignments`, `task-submissions`, `users` (DTOs), `package.json`, `docker-compose.prod.yml`.

---

## 4. Prisma Audit

- `npx prisma validate` → **PASS** (esquema válido).
- `npx prisma migrate status` → **PASS** (23 migraciones, "Database schema is up to date").
- `npx prisma generate` → **PASS**.

Modelos nuevos/ajustados (schema y migración `20260904000000`):

| Modelo/columna | Tipo | Null | FK / Índice | onDelete |
|---|---|---|---|---|
| `areas` | nuevo | — | `institution_id` FK | RESTRICT |
| `classrooms` | nuevo | — | `institution_id` FK | RESTRICT |
| `schedule_blocks` | nuevo | — | `institution_id` FK | RESTRICT |
| `courses.level` | EducationLevel, default PRIMARIA | NOT NULL | — | — |
| `courses.school_grade_id` | FK `school_grades` | NULL | index | SET NULL |
| `courses.section` | VarChar(10) | NULL | — | — |
| `subjects.area_id` | FK `areas` | NULL | index | SET NULL |
| `subjects.subjectType` + varios | enum `SubjectType` | NOT NULL default | — | — |
| `schedules.academic_period_id` | FK `academic_periods` | NULL | index | RESTRICT |
| `schedules.block_id` | FK `schedule_blocks` | NULL | index | SET NULL |
| `schedules.classroom_id` | FK `classrooms` | NULL | index | SET NULL |
| `schedules.teacher_user_id` | FK `users` | NULL | index | SET NULL |
| `schedules.classroom` | **COLUMNA ELIMINADA** | — | — | — |
| `teacher_assignments.weekly_hours` | Int default 0 | NOT NULL | — | — |
| `teacher_assignments.max_weekly_hours` | Int default 22 | NOT NULL | — | — |
| `students.user_id` | FK `users` (único) | NULL | unique+index | SET NULL |

Enums nuevos: `EducationLevel`, `SubjectType`, `ClassroomType` (validados por `prisma migrate status`).

Enums consumidos que ya existían y se usan aquí correctamente: `ScheduleStatus`, `DayOfWeek`,
`SubjectStatus` (todas presentes en el esquema).

---

## 5. Migration Audit

- Orden cronológico correcto; `20260904000000` es la última y es **additive** hacia arriba.
- `migrate deploy` reproducible desde BD limpia: las migraciones encadenan correctamente
  (`SubjectStatus`, `DayOfWeek`, `SchoolGrade`, `Schedule`, `AcademicPeriod` ya existen antes).
- **Nota aditiva/destructiva:** `20260904000000` DROPs la columna `schedules.classroom`. Es una operación
  **destructiva** (una sola columna legacy, sin referencias funcionales tras el refactor), aceptable para
  staging/síntesis de un MVP, pero se documenta porque en un entorno con datos históricos implicaría pérdida
  de información de ubicación de horarios.
- FKs con `ON DELETE RESTRICT` (course/subject/grades/academicPeriod) protegen integridad; FKs de
  `schedules` a `users/classrooms/schedule_blocks` usan `SET NULL` (coherente con la semántica opcional).
- No se detectó orden incorrecto, migraciones duplicadas ni FKs rotas. `migrate status` OK confirma que el
  esquema aplicado coincide con el declarado.

---

## 6. Curriculum Hierarchy

Jerarquía modelada (todas tenant-scoped por `institutionId`):

```
Area (agrupa asignaturas)
  └── Subject (area_id FK nullable, subjectType, nivel min/max, intensidad)
        ├── Grade (student ↔ subject)
        ├── Schedule (subject_id FK)
        └── TeacherAssignment (subject_id FK)
Course (curso/paralelo; level, school_grade_id, section)
  ├── Schedule (course_id FK)
  ├── TeacherAssignment (course_id FK)
  └── Enrollment (student ↔ course)
TeacherAssignment (teacher_user_id, course_id, subject_id, academic_period_id, weekly/max hours) ──uniq──
Schedule (course_id, subject_id, teacher_user_id?, academic_period_id?, classroom_id?, block_id?,
          day_of_week, start/end time)
AcademicPeriod ─┬─ Schedule.academic_period_id (FK)
                └─ TeacherAssignment.academic_period_id (FK)
ScheduleBlock (institution, name, day_of_week, start_time, end_time)
Classroom (institution, type, capacity, status)
```

- Cardinalidades correctas; campos opcionales bien elegidos (classroom/teacher/bloque/periodo en Schedule son
  opcionales). Un colegio real es representable sin romper el modelo previo.
- **No hay duplicidad conceptual** problemática: `Area` agrupa `Subject`; `Course` es la sección/paralelo;
  `TeacherAssignment` modela la asignación docente (con carga horaria); `Schedule` es la instancia temporal.
  `Classroom`/`ScheduleBlock` son recursos físicos/temporales referenciados por Schedule.
- Validación de cruces entre `TeacherAssignment` (activo) y `Schedule` está presente en el servicio de
  Schedules (ver §7).

---

## 7. Schedule Audit

Revisado `schedules.service.ts`, DTOs, controller, spec y migración.

Validaciones presentes (BACKEND correcto):

1. `academicPeriodId` **obligatorio** en `CreateScheduleDto` (`@IsUUID @IsNotEmpty`) y validado dentro del tenant.
2. `classroomId` validado dentro del tenant + `status ACTIVE`.
3. `teacherUserId` validado: exige `TeacherAssignment` **ACTIVE** del mismo tenant/curso/asignatura/periodo.
4. `blockId` validado dentro del tenant.
5. Validación de curso/asignatura dentro del tenant (NotFound → 404).
6. Validación de aula: tipo compatible con la asignatura (mapa `SUBJECT_TO_REQUIRED_ROOM`) para
   OBLIGATORIA/PROFUNDIZACION.
7. Prevención de cruces: `checkOverlap` para `courseId`, `teacherUserId` y `classroomId` por `dayOfWeek` y
   rango horario.
8. Tenant isolation: todas las consultas usan `findFirst({ where: { id, institutionId } })`; el controller
   pasa `req.tenant!.institutionId`.
9. RBAC: `AccessTokenGuard + TenantContextGuard + PermissionGuard` + `RequirePermission('schedules:manage'/'read')`.
10. Resource-level authorization: `findOne/update/deactivate` scopen con `institutionId`.
11. `ParseUUIDPipe` en `:id`.
12. DTOs con whitelist numérica de paginación (`@IsInt @Min(1) @Max(100)`).

Hallazgos de consistencia (no bloqueantes):

- **Complejidad / consistencia horaria:** `Schedule` lleva a la vez `blockId` (que ya codifica dayOfWeek +
  start/end) Y `dayOfWeek`+`startTime`/`endTime` independientes. No hay validación de que los tiempos/bloque
  coincidan entre sí. Un `blockId` puede señalar 07:00–12:30 lunes mientras `startTime`=10:00. (Ver F-05).
- **Overlap sin periodo/bloque:** `checkOverlap` no separa por `academicPeriodId` ni usa `blockId`. Dos
  horarios del mismo teacher/classroom en periodos distintos al mismo día/hora colisionan falsamente (o el
  contrato pretendido no se define con blur). (Ver F-06).
- Los **datos demo** del seed tienen **todos los `schedules.academic_period_id` y `teacher_user_id` NULL**
  (ver §11), por lo que la validación de TeacherAssignment activo no aplica a los horarios demo de referencia.
- **Test E2E desactualizado** (ver F-01): la suite `schedules.e2e-spec.ts` envía el payload antiguo
  (`classroom` string, sin `academicPeriodId`), por lo que el nuevo contrato NO está cubierto por E2E.

---

## 8. Teacher Assignment Audit

Revisado `teacher-assignments.service.ts`, DTOs, controller, spec.

- `weeklyHours`/`maxWeeklyHours` validados en DTO: `@IsInt @Min(0)` / `@IsInt @Min(1) @Max(60)`. Se impiden
  valores negativos, cero y decimales.
- Validación de docente (membership activa en el mismo tenant), curso, asignatura y periodo (No encontrado →
  404).
- Validación de carga `validateWorkload`: suma `weeklyHours` de assign ACTIVE del mismo teacher+period y
  proyecta contra `maxWeeklyHours`.
- RBAC: `AccessTokenGuard + TenantContextGuard + PermissionGuard` + `RequirePermission('teacher-assignments:…')`.
- Tenant isolation correcta en todas las queries (`institutionId`).
- `CREATE` comprueba duplicado (unique compuesto) y devuelve 409.

Consideraciones (no bloqueantes):

- **Ajuste de `maxWeeklyHours` sin tope global:** `update` permite subir `maxWeeklyHours` hasta 60 sin
  validar un tope institucional/docente. El la validación es "por asignación", no "por docente":
  un docente con N asignaciones puede acumular `maxWeeklyHours` por cada una → carga total mucho mayor a un
  tope semanal. No hay un límite agregado por docente a nivel de dominio (solo `@Max(60)` por asignación).
  (Ver F-07; depende de la intención de negocio si es MEDIUM o LOW/INFO).
- **Race de concurrencia:** la proyección de carga es read-modify-write sin transacción; dos creates
  concurrentes del mismo docente podrían pasar la validación y exceder el tope real. Bajo riesgo (requiere
  admin autorizado concurrente). (Ver F-08; LOW/INFO).

---

## 9. Role Audit

- `common/rbac/assignable-roles.ts` es la **fuente única** de roles asignables
  (`ASSIGNABLE_TENANT_ROLES`). `roles.service.ts` y `memberships.service.ts` lo importan; NO hay listas
  duplicadas literales. (Grep confirmó que los nombres nuevos solo existen en ese archivo).
- Roles nuevos añadidos: `RECTOR`, `COORDINADOR_ACADEMICO`, `COORDINADOR_CONVIVENCIA`, `ORIENTADOR`,
  `PSICOLOGO`.
- Permisos por rol (en seed, secciones `*_PERMISSIONS`):
  - **RECTOR**: lectura amplia + manage en casi todos los módulos (incluye observers, firmas, stats,
    `communications:send_bulk`, `audit:read`, `files:manage`). Es el perfil directivo más alto del tenant.
  - **COORDINADOR_ACADEMICO**: manage curricular (courses, subjects, grades, schedules, teacher-assignments,
    academic-periods, enrollments), attendance, reports, agendas. Sin `users:manage`.
  - **COORDINADOR_CONVIVENCIA**: foco en estudiantes + observers + comunicaciones + attendance:read/stats.
    Sin notas ni asignación docente.
  - **ORIENTADOR**: observador + estudiantes (read) + notas(leer) + reports; gestiona come comunicaciones
    read/create.
  - **PSICOLOGO**: read amplio + observador completo; sin manage curricular; `reports:read` (sin export).
- Roles `TEMPLATE` y `TENANT` coherentes (ambos se crean con los mismos sets de permisos en el seed).
- `assignRole/linkUser` validan: único `SUPER_ADMIN` no asignable, solo `ASSIGNABLE_TENANT_ROLES`, y para
  roles `TENANT` exigen `role.institutionId === institución objetivo`; `TEMPLATE` reutilizables. Un TEACHER
  no puede asignarse roles administrativos (requiere `INSTITUTION_ADMIN`). No hay auto-elevación.
- `SUPER_ADMIN` conserva `ALL_PERMISSIONS` global (sin cambios).

---

## 10. Seed Audit

`seed.ts` revisado estáticamente. No se ejecutó el seed (evita modificar la BD de trabajo).

- Reproducible e idempotente en la práctica: usa `upsert`/`findFirst`+`create` guardado por
  `institutionId`+unique key en instituciones, usuarios, memberships, roles, permisos, áreas, aulas, bloques,
  asignaciones.
- `createdById` corregido en `SignatureRequest` (se añadió `adminUser.id`).
- Áreas, aulas y bloques demo: creación idempotente (findFirst por código/nombre).
- Roles nuevos: creados como TEMPLATE y TENANT y se les asignan permisos correctamente.
- Usuarios demo staff: `rector@`, `coordinador-academico@`, `coordinador-convivencia@`, `orientador@`,
  `psicologo@` (todos bajo `demo-school`) con membership + rol tenants. Password demo compartida
  `Demo1234!` (dev only).
- **Hallazgo de coherencia (F-03):** un `TeacherAssignment` ACTIVE del docente demo apunta a un curso
  (`42b67f06`) **sin matrículas activas** mientras otro a `7b318eb9` sí las tiene. La suite
  `reports.e2e-spec.ts` (beforeAll) selecciona el primer assignment ACTIVE → `enrollment` null → TODAS las
  pruebas de reports fallan (18 en rojo) por `TypeError: Cannot read properties of null`. Esta incoherencia
  de datos demo rompe E2E y no es representativa de un colegio real (un curso sin matrícula pero con docente+
  asignación no es un buen fixture).
- Operaciones `deleteMany` en `assignPermissions` están acotadas a `roleId` (no afectan otros datos).

---

## 11. Tenant Isolation

- **PASS con evidencia de código y datos READ-ONLY:**
  - Todos los controllers de los módulos revisados pasan `req.tenant!.institutionId` al servicio.
  - Los servicios usan `findFirst({ where: { id, institutionId } })` / `where: { institutionId }` para
    read/update/delete y validan cada FK dentro del mismo tenant (`validateRelations`, `validateTeacher`,
    `validateClassroom`, `validateBlockId`, teacher membership).
  - Consultas READ-ONLY a `agenda_dev` confirmaron **0** schedules cross-tenant en classroom,
    **0** teacher assignments con relaciones de tenant desacopladas, **0** students con `user_id` de otro
    tenant, **0** schedules cuyo docente no tenga assignment ACTIVE equivalente.
  - Endpoints E2E de tenant (`* from other tenant → 404`) pasan (ver FASE 14 / regresión): schedules 404
    cross-tenant, reports 404 cross-tenant (los "should 404" siguen pasando; los que fallan son por fixture).

No se detectó patrón `findUnique(id)`/`update({where:{id}})` sin filtro de tenant en los flujos auditados.

---

## 12. IDOR

- No se halló acceso cruzado por ID en scheduling/teacher-assignments/roles/memberships: la autorización de
  recursos es `findFirst` + `institutionId`.
- Tests E2E de IDOR de reports ("deny for another student", "deny STUDENT for unlinked") existen y la
  intención de no-fuga se mantiene; fallan solo por el fixture de `beforeAll` (no por la lógica de negocio).
- Se recomienda, no obstante, revisar como refuerzo que todos los nuevos endpoints apliquen scope por
  `institutionId` antes de liberar staging (ya verificado en código para los módulos auditados).

---

## 13. Security

- **PASS.** Revisados los cambios post-MVP:
  - Sin secretos hardcoded en código nuevo.
  - Guard compose: `AccessTokenGuard + TenantContextGuard + PermissionGuard` en `schedules` y
    `teacher-assignments`; `RequirePermission` en cada handler.
  - `OptionalTenantContextGuard` no crea endpoints públicos involuntarios en estos módulos (están bajo
    `@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)`).
  - Sin bypass de guards; DTOs con `whitelist + forbidNonWhitelisted` (la app ya global) y paginación
    numérica validada.
  - Validación de campos server-authoritative: `institutionId` se toma del contexto, no del body (E2E
    `TEST-22` verifica 400 por `forbidNonWhitelisted`).
  - Auditoría de acciones sensibles (create/update/deactivate de schedules y teacher-assignments) vía
    `AuditService`.
- Los 5 nuevas rutas no exponen endpoints; una consulta `session`/`tenancy` confirma el patrón por tenant.

---

## 14. Regression

EJECUTADO en este prompt (working tree post-MVP):

| Gate | Resultado | Detalle |
|---|---|---|
| Prisma validate | **PASS** | esquema válido |
| Prisma migrate status | **PASS** | 23 migraciones, BD up to date |
| Prisma generate | **PASS** | — |
| API typecheck | **PASS** | `tsc --noEmit` exit 0 |
| Web typecheck | **PASS** | `tsc --noEmit` exit 0 |
| API unit | **PASS** | 805/805 (45 suites) |
| Web Vitest | **PASS** | 510/510 (64 files) |
| Web build | **PASS** | bundle 744.13 kB (warning chunk >500 kB; mismo que MVP, no regresión) |
| API lint (módulos modificados) | **PASS** | eslint exit 0 |
| **API E2E** | **FAIL** | **652 pass / 24 fail (2 suites: schedules, reports)** |
| CI `api-e2e` | **FAIL (en CI)** | ejecuta el mismo comando `jest --config test/jest-e2e.json --runInBand` |

Detalle de los 24 fallos E2E (2 causes raíz):
1. `schedules.e2e-spec.ts` (6 fallos): payload de creación desactualizado (`classroom` string antiguo;
   falta `academicPeriodId` obligatorio) → el backend (correctamente) devuelve 400. La suite no migró al
   nuevo contrato; el nuevo contrato NO está cubierto por E2E. (F-01)
2. `reports.e2e-spec.ts` (18 fallos): incoherencia de datos demo → assignment ACTIVE a curso sin
   matrículas → `beforeAll` explosiona en `enrollment!` null para todas las pruebas. (F-03)

Playwright: configuración presente (`playwright.config.ts`) pero NO se ejecutó (requiere infraestructura/
servidores; fuera de alcance de esta auditoría sin cambiar infra).

---

## 15. Frontend Contract

- `apps/web` tiene módulo `schedules` **activo** en el router (`/schedules`, `/schedules/new`,
  `/schedules/:id`, `/schedules/:id/edit`).
- El tipo web `Schedule` (`apps/web/src/api/types.ts:236-244`) conserva la forma antigua:
  `classroom: string | null`; NO contempla `classroomId`, `blockId`, `teacherUserId`, `academicPeriodId`.
- `ScheduleFormPage.tsx` envía `payload.classroom` (campo eliminado en backend) y NO envía `academicPeriodId`
  (obligatorio). Las páginas de listado/detalle leen `schedule.classroom` (no existe).
- **Consecuencia:** crear/editar/ver horarios desde la UI web fallará (400 por whitelist en create/update) y
  mostrará "Sin aula asignada" siempre. (Ver F-02, HIGH).
- El resto del contrato (enrollments, attendance, teacher-assignments hooks/pages) refleja correctamente
  `academicPeriodId` y los campos nuevos.

---

## 16. Database Integrity

Consultas READ-ONLY sobre `agenda_dev` (23 migraciones, sin migrar/seedear/resetear):

- Conteos: instituciones 3, roles 19 (9 tenant: INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT, RECTOR,
  COORDINADOR_ACADEMICO, COORDINADOR_CONVIVENCIA, ORIENTADOR, PSICOLOGO), memberships 12, áreas 3, aulas 9,
  bloques 5, schedules 5, teacher assignments 2, academic periods 7, grades 22, students 5, users 12.
- Integridad referencial: **0** schedules con classroom de otro tenant; **0** teacher assignments con
  relaciones de tenant desacopladas; **0** students con `user_id` de otro tenant; **0** schedules cuyo
  docente no tenga assignment ACTIVE equivalente; **0** schedules sobre periodo no active; **0** users sin
  membership.
- **Coherencia demo:** todos los schedules demo tienen `academic_period_id` y `teacher_user_id` **NULL**
  (esperado según seed). 1 teacher assignment ACTIVE (`42b67f06`) sin matrículas; 3 de 5 students sin
  matrícula. (Ver F-03).
- FKs huérfanas: no detectadas. Registros sin tenant: no detectados.

---

## 17. Findings

| ID | Severidad | Área | Hallazgo | Evidencia | Impacto | Acción recomendada |
|----|-----------|------|----------|-----------|---------|--------------------|
| F-01 | **HIGH** | Regresión tests | Suite E2E `schedules.e2e-spec.ts` desactualizada: envía payload antiguo (`classroom` string, sin `academicPeriodId` obligatorio) → backend devuelve 400; el nuevo contrato queda sin cobertura E2E. 6 pruebas fallan. | `test/schedules.e2e-spec.ts:203-210` vs `schedules.service.ts` + `create-schedule.dto.ts`; corrida E2E 652/24 | CI `api-e2e` fallará; bloquea promoción a staging hasta actualizar. El backend rechaza correctamente input inválido (no es bug del servicio). | Actualizar los payloads del spec al nuevo contrato: enviar `courseId`, `subjectId`, `academicPeriodId`, y opcionales `classroomId/teacherUserId/blockId`; crear assignment ACTIVE antes cuando sea necesario. |
| F-02 | **HIGH** | Frontend/Backend contract | UI web de Schedules NO migrada al refactor: envía `classroom` (campo eliminado) y omite `academicPeriodId` obligatorio; listados/detalle leen `classroom` inexistente. `/schedules` y formularios quedan inoperantes (400) y muestran "Sin aula asignada". | `apps/web/src/modules/schedules/...` (FormPage envía `payload.classroom:94,106`; DetailPage `schedule.classroom:51,86`; ListPage `183,221`); `api/types.ts:236-244` | La funcionalidad de horarios de la UI está rota en staging. | Actualizar el tipo `Schedule`, el formulario (enviar `academicPeriodId` + `classroomId/teacherUserId/blockId`) y las vistas al nuevo contrato. |
| F-03 | **HIGH** | Seed / E2E | Data demo incoherente: un `TeacherAssignment` ACTIVE del docente apunta a un curso sin matrículas → `reports.e2e-spec.ts` beforeAll (`enrollment!` null) → 18 pruebas fallan por el mismo fixture. | `prisma/seed.ts` (assignments demo); DB read-only (course `42b67f06` enrolled=0); `test/reports.e2e-spec.ts:104-118` | Suite de reports roja; CI falla; fixture no representa un colegio real. | Hacer coherente el seed (assignment a un curso con matrículas o matricular estudiantes en ese curso) o hacer que el fixture seleccione un assignment con matrículas. No cambiar lógica de negocio. |
| F-04 | MEDIUM | Schedules / datos | Campo redundante/opcional + consistencia: `Schedule.blockId` vs `dayOfWeek+startTime/endTime` no validados entre sí; y todos los schedules demo tienen `academic_period_id` y `teacher_user_id` NULL (la validación de assignment no aplica a esos registros). | `schedules.service.ts` `create` (no comprueba bloque vs tiempos); DB read-only | Posible inconsistencia de horarios (bloque dice X, tiempos dicen Y); datos demo no ejercitan la validación de cruce. | Decidir si el `blockId` es la fuente de la verdad temporal o solo informativo; si es fuente, validar coherencia; si informativo, documentarlo. |
| F-05 | MEDIUM | Schedules | Overlap no separa por `academicPeriodId` ni usa `blockId` como identidad → falsos conflictos entre periodos distintos o semántica de bloque no aplicada. | `checkOverlap` (schedules.service.ts:147-185) | Dos horarios del mismo teacher/classroom en periodos distintos al mismo día/hora son bloqueados sin razón clara (o no se modela el bloque). | Definir si el solapamiento se valida dentro del mismo periodo académico; incorporar `academicPeriodId`/`blockId` en la regla. |
| F-06 | LOW | Teacher Assignments | `update` permite subir `maxWeeklyHours` hasta 60 y la validación es por asignación, no por docente; no hay tope semanal agregado por docente. | `teacher-assignments.service.ts:149-192` | Carga horaria agregada de un docente puede superar un tope semanal pretendido. | Si hay política de tope por docente, validarla a nivel agregado con transacción. |
| F-07 | LOW | Concurrencia | `validateWorkload` es read-modify-write sin transacción → dos creates concurrentes del mismo docente podrían exceder el tope. | `teacher-assignments.service.ts:44-109` | Riesgo teórico, requiere admin autorizado concurrente. | Envolver creación en transacción o validar de nuevo dentro de la misma con bloqueo. |
| F-08 | INFO | Migración | `20260904000000` DROPs `schedules.classroom` (operación destructiva de 1 columna legacy), aceptable para MVP pero irreversible. | `migration.sql:91` | No impacta staging; documentar para ambientes con datos históricos. | Ninguna (aceso documentado). |

Escenarios específicos de §4 (Schedules) solicitados y su estado:
- mismo docente + mismo bloque + misma institución → cubierto (overlap teacherUserId).
- misma aula + mismo bloque → cubierto (overlap classroomId), ver F-05 (bloque no usado en solape).
- mismo curso + mismo bloque → cubierto (overlap courseId).
- docente asignado a otro curso / docente de otro tenant → validado (assignment ACTIVE + tenant).
- aula / bloque / periodo de otra institución → validado (404 dentro de tenant).
- TeacherAssignment inactivo → rechazado (BadRequest) si se provee `teacherUserId`.
- Schedule asociado a periodo CLOSED → permitido en código (no hay bloqueo de periodo no-active en
  schedules); la consulta read-only muestra 0 schedules en periodo no-active en demo. No es un blocker,
  pero la política (bloquear o permitir horarios de periodos cerrados) no está formalizada (INFO).

---

## 18. Risk Matrix

| Riesgo | Probabilidad | Impacto | Severidad | Nota |
|---|---|---|---|---|
| CI E2E rojo (schedules + reports) | Alta | Medio-Alto | HIGH | Bloquea promoción a staging. Corregir spec/seed. |
| UI Schedules rota | Alta | Medio | HIGH | Feature funciona en backend, UI desincronizada. |
| Inconsistencia horario/bloque | Media | Medio | MEDIUM | Depende de lógica definida. |
| Falso conflicto de overlap por periodo | Media | Bajo-Medio | MEDIUM | Definir regla. |
| Escalada no detectada | Baja | Bajo | LOW/INFO | Mejora puntual de TA. |
| Migración destructiva no detectada | Nula (documentada) | Bajo | INFO | Solo registro. |

---

## 19. Acceptance Criteria

| Criterio | Estado |
|---|---|
| Cambios post-MVP claramente separados de MVP (working tree, sin commits nuevos) | ✅ |
| Sin archivos inesperados ni secretos | ✅ |
| Prisma validate / migrate / generate PASS | ✅ |
| FKs, índices, unique, enums, defaults correctos | ✅ |
| `migrate deploy` reproducible desde BD limpia | ✅ (orden y FKs válidos) |
| Jerarquía curricular sin duplicidades, representa colegio real | ✅ |
| Validación de Schedules (cruce docente/aula/curso, assignment activo, tenant) presente | ✅ |
| Validación carga horaria docente presente (DTO) | ✅ |
| Roles nuevos con ASSIGNABLE_TENANT_ROLES única fuente | ✅ |
| RBAC/tenant/IDOR correctos en módulos auditados | ✅ |
| Seed reproducible e idempotente; `createdById` corregido | ✅ |
| Concurrencia/integraciones no introducen bloqueos | ✅ (sin blockers) |
| Regresión: unit/web/typecheck/build en verde | ✅ |
| Regresión E2E completa | ❌ (24 fallos: specs desactualizadas + seed incoherente) |
| Frontend/backend contract para Schedules | ❌ (UI no migrada) |
| Documentación `docs/102` | ✅ |

---

## 20. Final Verdict

**SAFE WITH FIXES**

- `BLOCKER`: 0
- `CRITICAL`: 0
- `HIGH`: 3 (F-01 spec E2E schedules, F-02 frontend schedules, F-03 seed/E2E reports) — todos **corregibles**
  sin comprometer datos, seguridad, tenant isolation ni migraciones, y sin reabrir el alcance funcional MVP.
- No hay criticidad que comprometa esquema, seguridad, multitenancy, migraciones ni funcionamiento
  fundamental.

Racional: el refactor de Schedules está bien implementado en el **backend** (validaciones, RBAC, tenant),
pero los **consumidores** (UI web y E2E) no fueron migrados al nuevo contrato, y el **seed** introdujo un
assignment docente a un curso sin matrículas. Ambas causas rompen el job CI E2E y dejan la UI de horarios
inoperante. Son escollos de calidad/cobertura corregibles en una iteración de "fixes" acotada, no defectos
de integridad de datos/seguridad. Por eso: **no BLOCKED, pero tampoco SAFE TO CONTINUE** hasta resolver los
HIGH.

---

## 21. Recommended Next Action

1. **Antes de push/staging:** resolver los 3 hallazgos HIGH en una iteración acotada (NO funcionalidad nueva):
   - (F-02) Migrar la UI web de Schedules al contrato nuevo (tipo `Schedule`, formulario con
     `academicPeriodId` requerido + `classroomId/teacherUserId/blockId`, vistas).
   - (F-01) Actualizar `test/schedules.e2e-spec.ts` al nuevo payload y crear fixtures de `TeacherAssignment`
     ACTIVE cuando se necesite.
   - (F-03) Hacer coherente el seed demo (assignment a curso con matrículas o matricular ese curso) y/o
     estabilizar el `beforeAll` de reports.
2. Re-ejecutar `api-e2e` completo (esperado 676/676) tras los fixes.
3. (Post-fixes, opcional en iteración) Documentar la regla de coherencia `blockId` vs tiempos (F-04/F-05) y
   el tope horario por docente (F-06/F-07) antes de escala.
4. Recién entonces decidir promoción a staging. No se recomienda desplegar staging con CI E2E en rojo.

**Regla de cierre:** este prompt terminó en diagnóstico y documentación. No se inició PROMPT 103.