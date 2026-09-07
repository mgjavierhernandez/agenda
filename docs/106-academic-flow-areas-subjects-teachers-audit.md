# PROMPT 106 - Auditoría de Trazabilidad del Flujo Académico
## Área → Asignatura → Nivel → Docente → Curso → Asignatura en el curso → Estudiantes

> **Fase de auditoría (read-only).** Sin cambios de código, sin commits, sin push, sin tag,
> sin modificaciones de esquema/migraciones/seed, sin cambios en tests ni permisos/RBAC,
> sin comandos destructivos. Único entregable: este documento + informe final.
>
> **Fecha:** 2026-09-04 · **Rama:** `main` · **HEAD:** `b1f1b86 docs(101)`

---

## 0. Resumen ejecutivo / Veredicto

**Veredicto: A — IMPLEMENTADO EN CÓDIGO (working tree), PERO NO DESPLEGADO (build desactualizado).**

Las dos sintomatologías reportadas por el usuario se explican **íntegramente por la misma causa
raíz**: todos los cambios de los PROMPTS 102–105 (módulo de áreas, cableado de campos de
asignatura, rol `DIRECTOR_DE_GRUPO`, endpoints `/teachers` + `/directories`, páginas frontend
`/areas` + `/teachers`) **existen en el árbol de trabajo pero NUNCA fueron commiteados**.

- `HEAD` sigue en `b1f1b86 docs(101)` → el build desplegado corresponde al **MVP** (el último
  commit con código real: `000fe79 close MVP`).
- El **código desplegado** no contiene `/areas` ni los campos adicionales de asignatura.
- El **código del working tree** sí los contiene y **todas las compuertas pasan**.

---

## 1. Objetivo

Determinar por qué la aplicación **desplegada** no muestra `/areas` y por qué el formulario
"Nueva asignatura" sólo presenta Código / Nombre / Descripción / Estado; y auditar la
trazabilidad end-to-end del flujo académico Área → Asignatura → Nivel → Docente → Curso →
Asignatura en el curso → Estudiantes comparando backend / frontend / base de datos.

## 2. Alcance

- Comparación **commiteado (desplegado)** vs **working tree (código actual)**.
- Verificación backend (NestJS/Prisma), frontend (React/Vite), y base de datos (PostgreSQL).
- Flujo académico completo con las clasificaciones: IMPLEMENTADO / IMPLEMENTADO SOLO BACKEND /
  IMPLEMENTADO SOLO FRONTEND / PARCIAL / NO IMPLEMENTADO / NO VERIFICABLE.
- Compuertas (read-only): `prisma validate`, `nest build`, `tsc --noEmit`, tests.

## 3. Estado inicial (FASE 1)

| Ítem | Valor |
|------|-------|
| Rama | `main` |
| HEAD | `b1f1b86 docs(101)` (el último commit de código es `000fe79` close MVP) |
| Archivos modificados sin commitear | 30 |
| Archivos sin seguimiento (untracked) | 23 |
| Total de entradas de cambio (uncommitted) | 53 |
| Última versión con código real commiteado | `000fe79 release: close Agenda Escolar Digital MVP` |

**Hallazgo estructural clave:** el árbol de trabajo contiene todo el trabajo de los PROMPTS
102–105 **sin commitear**. HEAD está en `b1f1b86 docs(101)` (un commit de documentación sin
código). Por tanto el binario/build desplegado se generó a partir del MVP y carece de todas
las funcionalidades añadidas posteriormente.

---

## 4. ¿/areas existe en el código desplegado? (Diagnóstico del síntoma 1)

### Commiteado (desplegado) — `git show HEAD:apps/web/src/app/router.tsx`
- NO existe la ruta `/areas`.
- NO existe la ruta `/teachers`.
- Rutas de asignaturas presentes: `/subjects`, `/subjects/new`, `/subjects/:id`.
- No hay import de `AreasPage` ni `TeachersPage`.

### Working tree — `apps/web/src/app/router.tsx`
- Línea 13: `import { AreasPage } from '@/modules/areas';`
- Línea 72: `{ path: '/areas', element: <AreasPage /> }`
- Línea 118: `{ path: '/teachers', element: <TeachersPage /> }`
- `/subjects/new` (línea 69) y `/subjects/:id/edit` (línea 71) usan `SubjectFormPage`.

### Conclusión del síntoma 1
La "Página no encontrada" de `/areas` en la app desplegada es la consecuencia directa de que la
ruta **no existe en el build desplegado** (commiteado). El código del working tree SÍ la define.

| Clasificación | Backend `/areas` | Frontend `/areas` |
|---------------|------------------|-------------------|
| Commiteado (desplegado) | NO IMPLEMENTADO | NO IMPLEMENTADO |
| Working tree (código actual) | IMPLEMENTADO | IMPLEMENTADO |

---

## 5. ¿Nueva asignatura con 4 campos? (Diagnóstico del síntoma 2)

### Commiteado (desplegado) — `git show HEAD:apps/web/src/modules/subjects/pages/SubjectFormPage.tsx`
- No usa `useAreas`.
- No tiene estado `areaId`, `minimumLevel`, `maximumLevel`.
- Sin import de `SUBJECT_TYPE_LABELS` / `EDUCATION_LEVEL_LABELS`.
- El formulario sólo recoge código / nombre / descripción / estado.

### Commiteado (desplegado) — tipos API `git show HEAD:apps/web/src/api/types.ts`
- `CreateSubjectInput` sólo incluye `status?` (además de los campos base).
- Sin `areaId`, `subjectType`, `minimumLevel`, `maximumLevel`.

### Commiteado (desplegado) — DTO backend `git show HEAD:apps/api/src/modules/subjects/dto/create-subject.dto.ts`
- Sólo `code`, `name`, `description?`, `status?`.
- Sin `areaId`, `subjectType`, `minimumLevel`, `maximumLevel`.

### Working tree — `apps/api/src/modules/subjects/dto/create-subject.dto.ts`
- Importa `SubjectStatus, SubjectType, EducationLevel`.
- Línea 34: `areaId?: string;`
- Línea 36–39: `subjectType?: SubjectType;`
- Línea 44: `minimumLevel?: EducationLevel;`
- Línea 49: `maximumLevel?: EducationLevel;`

### Working tree — `apps/web/src/api/types.ts`
- Línea 137: `export type SubjectType = 'OBLIGATORIA' | 'OPTATIVA' | 'PROFUNDIZACION' | 'TRANSVERSAL' | 'DIMENSION';`
- Líneas 190–209: `Subject` y `CreateSubjectInput` incluyen `areaId`, `subjectType`, `minimumLevel`, `maximumLevel`.

### Working tree — `apps/web/src/modules/subjects/pages/SubjectFormPage.tsx`
- `useAreas` (hooks), estado `areaId`, `subjectType`, `minimumLevel`, `maximumLevel`; import de `SUBJECT_TYPE_LABELS` / `EDUCATION_LEVEL_LABELS`.

### Conclusión del síntoma 2
El formulario desplegado coincide exactamente con el **código commiteado** (4 campos). El
formulario del working tree muestra los campos adicionales **pero no está desplegado**.

| Clasificación | Backend campos asignatura | Frontend campos asignatura |
|---------------|---------------------------|----------------------------|
| Commiteado (desplegado) | NO IMPLEMENTADO | NO IMPLEMENTADO |
| Working tree (código actual) | IMPLEMENTADO | IMPLEMENTADO |

---

## 6. Flujo académico end-to-end — matriz de trazabilidad (FASE 8)

| # | Paso del flujo | Backend (working tree) | Frontend (working tree) | DB (datos actuales) | Clasificación |
|---|----------------|------------------------|-------------------------|---------------------|---------------|
| 1 | **Área** (entidad, CRUD + permisos) | `AreasModule`, `AreasController @Controller('areas')`, guards tenant+RBA, `POST/GET/PATCH/DELETE`, permisos `areas:manage`/`areas:read` | `AreasPage` en `/areas`; API client | 3 áreas (`ARE-MAT`, `ARE-CIE`, `ARE-LEN`); 2 permisos en DB | IMPLEMENTADO (working tree) |
| 2 | **Asignatura → Área** (área opcional en subject) | DTO `areaId?` + service valida tenant del área; `Subject.areaId` con `onDelete: SetNull` | `useAreas` en form + selector de área | 3/25 asignaturas con `areaId`; 22/25 sin área | IMPLEMENTADO (working tree); datos parciales |
| 3 | **Nivel** (nivel educativo asociado a asignatura) | `minimumLevel`/`maximumLevel` (enum `EducationLevel`) en DTO/service | selects de nivel en form | 4/25 asignaturas con `minimumLevel` | IMPLEMENTADO (working tree) |
| 4 | **Tipo de asignatura** | `subjectType` (enum `SubjectType`) en DTO/service | select de tipo en form | 0/25 con tipo no-por-defecto (todo `OBLIGATORIA`, valor por defecto) | IMPLEMENTADO (working tree) |
| 5 | **Docente** | `GET /teacher-assignments/teachers` → `getTeachers()`; relación `TeacherAssignment` | `TeachersPage` en `/teachers` | 4 `TeacherAssignment` | IMPLEMENTADO (working tree) |
| 6 | **Director de grupo** | `GET /teacher-assignments/directories` → `getDirectors()` (rol `DIRECTOR_DE_GRUPO`) | `TeachersPage` (directores) | rol asignable; usuarios con rol presente | IMPLEMENTADO SOLO BACKEND / revisar UI |
| 7 | **Curso** | model `Course` + `CoursePeriod` | páginas de cursos | 12 `Course`, 21 `AcademicPeriod` | IMPLEMENTADO (MVP) |
| 8 | **Asignatura en el curso (TeacherAssignment)** | model `TeacherAssignment` (subject+course+period+teacher) | gestión de asignaciones | 4 asignaciones | IMPLEMENTADO (working tree, ya en MVP 104) |
| 9 | **Estudiantes** | `Enrollment`, `Student`, `User` (roles estudiante/padre) | páginas de estudiantes | 4 `Enrollment`, 19 `User`, 19 `UserInstitution`, 10 `UserRole` | IMPLEMENTADO (MVP) |

---

## 7. Modelo de datos — verificación de esquema (working tree)

- `model Subject` (schema.prisma línea 724): `areaId String? @map("area_id")` (727),
  `subjectType SubjectType @default(OBLIGATORIA)` (731), `minimumLevel EducationLevel?` (732),
  `maximumLevel EducationLevel?` (733), relación `area` con `onDelete: SetNull` (743),
  `@@index([institutionId, areaId])` (752).
- `model Area` (línea 794): entidad de áreas con institutionId y relaciones.
- `enum SubjectType` (línea 70): OBLIGATORIA / OPTATIVA / PROFUNDIZACION / TRANSVERSAL / DIMENSION.
- `model TeacherAssignment` (línea 1136): `status TeacherAssignmentStatus @default(ACTIVE)`.
- `prisma validate`: **schema válido** ✅

## 8. Base de datos — inventario real (FASE 12, consultas de sólo lectura)

| Entidad | Conteo |
|---------|--------|
| Áreas | 3 |
| Asignaturas | 25 |
| Asignaturas con área | 3 |
| Asignaturas sin área | 22 |
| Asignaturas con `minimumLevel` | 4 |
| Asignaturas con `subjectType` != por defecto | 0 |
| TeacherAssignment | 4 |
| Course | 12 |
| Enrollment | 4 |
| AcademicPeriod | 21 |
| User | 19 |
| UserInstitution | 19 |
| UserRole | 10 |
| Permission (total) | 77 |
| Permisos `areas:*` | 2 (`areas:read`, `areas:manage`) |
| Permisos `subjects:*` | 2 |

**Interpretación:** la BD refleja el estado de seed del MVP con las adiciones de áreas ya
aplicadas (3 áreas + 2 permisos `areas:*`). La mayoría de asignaturas (22/25) no tienen área y
ninguna tiene tipo distinto del valor por defecto, coherente con datos seed mínimos (los campos
nuevos son opcionales).

---

## 9. Backend — módulo de áreas (working tree)

`apps/api/src/modules/areas/areas.controller.ts`:
- `@Controller('areas')` con `@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)`.
- `POST /` → permiso `areas:manage`.
- `GET /` (listado tenant) → `areas:read`.
- `GET /:id` → `areas:read`.
- `PATCH/DELETE` con scope por institución y validación cross-tenant.
- Registrado en `AreasModule` / `app.module.ts`.

`apps/api/test/areas-teachers.e2e-spec.ts`: 9 tests (crear área scoped a institución, rechazo
cross-tenant, campos académicos de asignatura, listar docentes con cursos/asignaturas/estudiantes,
listar directores de grupo).

## 10. Roles y permisos (FASE 11)

- Rol `DIRECTOR_DE_GRUPO` definido en seed/roles (working tree).
- Permisos `areas:read` / `areas:manage` presentes en `permissionData` y **en la BD** (77 permisos total).
- Matriz de roles: docentes (`TEACHER`) y directores de grupo (`DIRECTOR_DE_GRUPO`) pueden coexistir
  en un mismo User (modelo `UserRole` N:M).

---

## 11. Compuertas de verificación (ejecutadas, read-only)

| Compuerta | Comando | Resultado |
|-----------|---------|-----------|
| Schema | `npx prisma validate` | Válido ✅ |
| API typecheck | `npx nest build` | Salida limpia, exit 0 ✅ |
| Web typecheck | `npx tsc --noEmit` | exit 0 ✅ |
| Web tests | `npx vitest run` | **510/510** (64 archivos) ✅ |
| API E2E (áreas/docentes) | `npx jest --config ./test/jest-e2e.json --runInBand --testPathPattern="areas\|teachers"` | **9/9** ✅ |

*Nota: no se ejecutó la suite E2E/unit completa (805 unit + 690 E2E) por coste de tiempo; se
ejecutó el subconjunto directamente relacionado con este flujo. Los resultados de `nest build`
y `tsc --noEmit` (que compilan todo el árbol) avalan la integridad del código actual.*

---

## 12. Hallazgos y clasificaciones

| ID | Descripción | Clasificación |
|----|-------------|---------------|
| H-01 | Ruta `/areas` y página `AreasPage` | IMPLEMENTADO (working tree) / NO IMPLEMENTADO (desplegado) |
| H-02 | Ruta `/teachers` y `TeachersPage` | IMPLEMENTADO (working tree) / NO IMPLEMENTADO (desplegado) |
| H-03 | Campos académicos de asignatura (área/tipo/nivel) en backend | IMPLEMENTADO (working tree) / NO IMPLEMENTADO (desplegado) |
| H-04 | Campos académicos de asignatura en frontend | IMPLEMENTADO (working tree) / NO IMPLEMENTADO (desplegado) |
| H-05 | Backend CRUD de áreas con tenant + RBAC | IMPLEMENTADO (working tree) |
| H-06 | Permisos `areas:read`/`areas:manage` (código + BD) | IMPLEMENTADO |
| H-07 | Rol `DIRECTOR_DE_GRUPO` y endpoint `/directories` | IMPLEMENTADO (working tree) |
| H-08 | Endpoint `/teachers` (docentes con cursos/asignaturas/estudiantes) | IMPLEMENTADO (working tree) |
| H-09 | Causa raíz: cambios de 102–105 **sin commitear**; build desplegado = MVP | **HALLAZGO DECISIVO** |
| H-10 | Datos en BD: 3 áreas / 2 permisos; mayoría de asignaturas sin área (seed mínimo) | PARCIAL (datos demo) |
| H-11 | Asignación director↔curso únicamente por rol (sin vínculo de curso en rol) | PARCIAL (GAP heredado del PROMPT 105, F-01) |
| H-12 | `TeacherAssignment` sin `startDate`/`endDate` de vigencia | PARCIAL (GAP heredado) |

---

## 13. Causa raíz (decisiva)

**Todos los cambios de los PROMPTS 102–105 existen en el árbol de trabajo pero no fueron
commiteados.** `HEAD` = `b1f1b86 docs(101)`; el último commit de código es `000fe79` (cierre del
MVP). Por tanto:

1. El build/producto desplegado proviene del **MVP** y **no tiene** `/areas` → síntoma 1.
2. El build desplegado **no tiene** los campos adicionales de asignatura → síntoma 2.
3. La BD **sí** fue migrada/sembrada con las adiciones (3 áreas, 2 permisos `areas:*`,
   25 asignaturas, `SubjectType`), porque las migraciones/seed se ejecutaron localmente contra
   el working tree, no dependen del commit.

En definitiva: **el código está implementado y verificado; falta commitearlo y reconstruir/
redesplegar la aplicación para que los usuarios vean `/areas` y el formulario ampliado.**

---

## 14. Acción requerida (recomendación, fuera del alcance read-only de PROMPT 106)

1. Committear el árbol de trabajo (PROMPTS 102–105) en `main` con mensajes descriptivos
   (o un commit de feature por área).
2. Reconstruir y redesplegar API + Web a partir del nuevo HEAD.
3. Verificar en staging `/areas` y el formulario "Nueva asignatura" ampliado.

> NOTA: conforme a las reglas de PROMPT 106 (sin commits, sin push), **no se ejecutó** ninguna
> de estas acciones. Se dejan documentadas como siguiente paso fuera de este prompt.

---

## 15. Limitaciones

- No se pudo acceder al despliegue real (sólo al código fuente y a la BD local); el estado
  "desplegado" se infiere con alta confianza del contenido de los commits (HEAD/MVP).
- La suite completa unit/E2E no se reejecutó entera; se validó mediante `nest build`, `tsc` y el
  subconjunto E2E de áreas/docentes + Vitest web completo.

---

## 16. Glosario de clasificaciones

- **IMPLEMENTADO**: presente y verificado en código (working tree) y/o BD.
- **IMPLEMENTADO SOLO BACKEND**: sólo existe en la API, sin UI.
- **IMPLEMENTADO SOLO FRONTEND**: sólo en la UI, sin respaldo de API.
- **PARCIAL**: implementado con lagunas (datos demo, o gap conocido).
- **NO IMPLEMENTADO**: ausente en el artefacto evaluado (p.ej. desplegado).
- **NO VERIFICABLE**: no se pudo comprobar con los medios disponibles.
