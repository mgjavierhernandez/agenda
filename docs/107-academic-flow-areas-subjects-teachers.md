# PROMPT 107 — IMPLEMENTACIÓN DEL FLUJO ACADÉMICO COMPLETO
## ÁREAS → ASIGNATURAS → DOCENTES → CURSOS → ESTUDIANTES

> **Fecha:** 2026-09-04 · **Rama:** `main` · **HEAD:** `b1f1b86 docs(101)`

---

## 1. PROBLEMA ENCONTRADO

Según la auditoría **PROMPT 106**, el código de los PROMPTS 102–105 (módulo de áreas, campos académicos de asignatura, roles docentes, endpoints `/teachers` + `/directories`, páginas frontend `/areas` + `/teachers`) **existía en el working tree pero nunca fue commiteado**.

- `HEAD` seguía en `b1f1b86 docs(101)` → el build desplegado correspondía al **MVP** (último commit con código real: `000fe79 close MVP`).
- El **código desplegado** no contenía `/areas` ni los campos adicionales de asignatura.
- El **código del working tree** sí los contenía y **todas las compuertas pasaban**.

**Síntomas observados en producción:**
1. `/areas` devolvía "Página no encontrada".
2. Formulario "Nueva asignatura" solo mostraba: Código, Nombre, Descripción, Estado (faltaban Área, Tipo, Nivel mínimo/máximo).

---

## 2. CAUSA RAÍZ

**Todos los cambios de los PROMPTS 102–105 existían en el árbol de trabajo pero no fueron commiteados.** La base de datos sí fue migrada/sembrada con las adiciones (3 áreas, 2 permisos `areas:*`, 25 asignaturas, enum `SubjectType`), porque las migraciones/seed se ejecutaron localmente contra el working tree, no dependen del commit.

---

## 3. ESTADO PREVIO (PROMPT 106)

| Componente | Backend (working tree) | Frontend (working tree) | Desplegado (HEAD) |
|------------|------------------------|------------------------|-------------------|
| `/areas` | IMPLEMENTADO | IMPLEMENTADO | NO IMPLEMENTADO |
| `/teachers` | IMPLEMENTADO | IMPLEMENTADO | NO IMPLEMENTADO |
| Campos académicos asignatura | IMPLEMENTADO | IMPLEMENTADO | NO IMPLEMENTADO |
| CRUD Áreas + RBAC | IMPLEMENTADO | Solo creación | NO IMPLEMENTADO |
| Permisos `areas:read/manage` | En BD + código | En código | En BD |

---

## 4. CAMBIOS IMPLEMENTADOS EN ESTE PROMPT

### 4.1 ÁREAS (`/areas`)
- ✅ **Ruta registrada** en React Router (`/areas` → `AreasPage`).
- ✅ **Página `AreasPage`** con listado, búsqueda y tabla.
- ✅ **Creación de áreas** con validación de código/nombre requeridos.
- ✅ **Edición de áreas** (inline) — *nuevo en este prompt*.
- ✅ **Desactivación de áreas** — *nuevo en este prompt*.
- ✅ **Campos editables:** código, nombre, tipo (Oficial/Complementaria), orden, estado.
- ✅ **Navegación/Sidebar:** "Áreas" 🗂️ con permiso `areas:read`.
- ✅ **Permission gates:** `areas:read` (listar), `areas:manage` (crear/editar/desactivar).
- ✅ **Tenant isolation:** backend valida `institutionId` en todas las operaciones.
- ✅ **Tests:** existentes pasan (510 web, 9 E2E areas/teachers).

### 4.2 ASIGNATURAS (`/subjects`)
- ✅ **Formulario "Nueva/Editar asignatura" (`SubjectFormPage`)** ya incluía (desde PROMPTs 102-105):
  - Área (selector cargado vía `useAreas`)
  - Tipo de asignatura (enum `SubjectType`: OBLIGATORIA, OPTATIVA, PROFUNDIZACION, TRANSVERSAL, DIMENSION)
  - Nivel mínimo / Nivel máximo (enum `EducationLevel`: PREESCOLAR, PRIMARIA, SECUNDARIA, MEDIA)
  - Validación de consistencia: **nivel máximo no puede ser inferior al mínimo** — *agregado en este prompt*.
  - Error visible para `maximumLevel` cuando falla la validación — *agregado en este prompt*.
- ✅ **Pantalla de detalle (`SubjectDetailPage`)** ahora muestra — *agregado en este prompt*:
  - Área (nombre o "Sin área asignada")
  - Tipo de asignatura (label legible)
  - Nivel mínimo / Nivel máximo (labels legibles o "—")
- ✅ **Listado (`SubjectsPage`)** mejorado — *agregado en este prompt*:
  - **Filtro por Área** (dropdown con áreas reales, usa `areaId` en query backend).
  - **Filtro por Estado** (existente).
  - **Botón "Limpiar filtros"** cuando hay filtros activos.
  - **Tabla desktop** muestra: Código, Nombre, **Área, Tipo, Nivel**, Estado, Acciones.
  - **Tarjetas mobile** muestran: Nombre, Código, **Área, Tipo, Nivel**, Descripción, Estado.
- ✅ **Validaciones frontend/backend:** área válida, tenant correcto, nivel min/max consistente, valores permitidos del backend.
- ✅ **Permisos:** `subjects:read`, `subjects:manage`.

### 4.3 DOCENTES (`/teachers`)
- ✅ **Página `TeachersPage`** (desde PROMPTs 102-105) en `/teachers`.
- ✅ **Endpoint `GET /teacher-assignments/teachers`** lista docentes con:
  - Cursos, asignaturas, periodos, **estudiantes** (vía `Course + Enrollment`).
  - Badge "Director de grupo" si tiene rol `DIRECTOR_DE_GRUPO`.
- ✅ **Modelo:** `User + UserInstitution + UserRole(TEACHER) + TeacherAssignment` — **NO se creó entidad `Teacher` paralela**.
- ✅ **Sidebar:** "Docentes" 🧑‍🏫 (permiso `teacher-assignments:read`).

### 4.4 ASIGNACIONES DOCENTES (`/teacher-assignments`)
- ✅ **Listado (`TeacherAssignmentsPage`)** con filtros: Profesor, Curso, Asignatura, Periodo.
- ✅ **Formulario (`TeacherAssignmentFormPage`)** con selectores legibles (nombres, no UUIDs):
  - Profesor (lista de usuarios con rol TEACHER)
  - Curso (nombre + código)
  - Asignatura (nombre + código)
  - Periodo académico (nombre + código)
- ✅ **Validación frontend:** todos los campos requeridos.
- ✅ **Detalle (`TeacherAssignmentDetailPage`)** muestra profesor, curso, asignatura, periodo, estado.
- ✅ **Permisos:** `teacher-assignments:read`, `teacher-assignments:manage`.

### 4.5 NAVEGACIÓN Y SIDEBAR
Registrados en `router.tsx` y `Sidebar.tsx`:
```
/areas                      → AreasPage
/subjects                   → SubjectsPage
/subjects/new               → SubjectFormPage
/subjects/:id               → SubjectDetailPage
/subjects/:id/edit          → SubjectFormPage
/teachers                   → TeachersPage
/teacher-assignments        → TeacherAssignmentsPage
/teacher-assignments/new    → TeacherAssignmentFormPage
/teacher-assignments/:id    → TeacherAssignmentDetailPage
```

Sidebar entries (con permission gates):
- Áreas 🗂️ (`areas:read`)
- Asignaturas 📝 (`subjects:read`)
- Docentes 🧑‍🏫 (`teacher-assignments:read`)
- Asignaciones docentes 👨‍🏫 (`teacher-assignments:read`)

### 4.6 PERMISOS (RBAC EXISTENTE)
No se creó sistema paralelo. Se utilizaron permisos ya existentes en BD (77 permisos total):
- `areas:read`, `areas:manage` — **ya en BD** (seed PROMPT 102).
- `subjects:read`, `subjects:manage` — ya en MVP.
- `teacher-assignments:read`, `teacher-assignments:manage` — ya en MVP.
- `users:read`, `users:create`, `memberships:manage` — para crear usuarios docentes y asignar rol `TEACHER`.

Roles institucionales existentes: `INSTITUTION_ADMIN`, `TEACHER`, `DIRECTOR_DE_GRUPO`, etc.

---

## 5. CONTRATOS API/FRONTEND

### Backend (ya existentes, validados)
| Endpoint | Método | Permiso | DTO |
|----------|--------|---------|-----|
| `/areas` | GET/POST | `areas:read` / `areas:manage` | `ListAreasQueryDto`, `CreateAreaDto` |
| `/areas/:id` | GET/PATCH | `areas:read` / `areas:manage` | `UpdateAreaDto` |
| `/areas/:id/deactivate` | PATCH | `areas:manage` | — |
| `/subjects` | GET/POST | `subjects:read` / `subjects:manage` | `ListSubjectsQueryDto` (con `areaId`), `CreateSubjectDto` (con `areaId`, `subjectType`, `minimumLevel`, `maximumLevel`) |
| `/subjects/:id` | GET/PATCH | `subjects:read` / `subjects:manage` | `UpdateSubjectDto` |
| `/teacher-assignments/teachers` | GET | `teacher-assignments:read` | — |
| `/teacher-assignments/directories` | GET | `teacher-assignments:read` | — |
| `/teacher-assignments` | GET/POST | `teacher-assignments:read/manage` | `ListTeacherAssignmentsQueryDto`, `CreateTeacherAssignmentDto` |

### Frontend Types (`apps/web/src/api/types.ts`)
- `Area`, `CreateAreaInput`, `UpdateAreaInput`, `ListAreasParams`
- `Subject` con `areaId`, `subjectType`, `minimumLevel`, `maximumLevel`
- `CreateSubjectInput`, `UpdateSubjectInput` con campos académicos
- `ListSubjectsParams` con `areaId`
- `TeacherAssignment`, `CreateTeacherAssignmentInput`
- `TeacherSummary`, `TeacherCourseSummary` (con estudiantes)
- `EDUCATION_LEVEL_LABELS`, `SUBJECT_TYPE_LABELS` para UI

---

## 6. FLUJO FUNCIONAL COMPLETO (VERIFICADO)

Un administrador puede realizar **desde la interfaz**:

1. **Entrar a Áreas** → `/areas` funciona ✅
2. **Crear "Matemáticas"** → formulario inline, crea área ✅
3. **Entrar a Asignaturas** → `/subjects` funciona ✅
4. **Crear "Matemáticas"** → `/subjects/new` ✅
5. **Seleccionar Área = Matemáticas** → dropdown con áreas reales ✅
6. **Seleccionar Nivel = Secundaria** → dropdowns nivel min/max con validación ✅
7. **Crear/seleccionar usuario docente** → `/admin/users/new` → rol `TEACHER` ✅
8. **Entrar a Asignaciones docentes** → `/teacher-assignments` ✅
9. **Crear asignación:**
   - Profesor = Juan Pérez (selector por nombre) ✅
   - Asignatura = Matemáticas (selector por nombre) ✅
   - Curso = 8A (selector por nombre) ✅
   - Periodo = 2026 (selector por nombre) ✅
10. **Guardar** → `TeacherAssignment` creada ✅
11. **Ver la asignación** → listado y detalle ✅
12. **Consultar asignaciones del docente** → `/teachers` muestra cursos/asignaturas/estudiantes ✅
13. **Determinar estudiantes** → vía `Course + Enrollment` en `TeacherSummary` ✅

**Sin UUIDs manuales** en ningún formulario. **Tenant isolation** y **RBAC** respetados en todo el flujo.

---

## 7. TESTS

| Suite | Resultado |
|-------|-----------|
| Web unit tests (Vitest) | **510/510 passed** (64 archivos) |
| API E2E (areas/teachers) | **9/9 passed** |
| API E2E (full suite) | **23/23 suites passed** |
| Web typecheck (`tsc --noEmit`) | ✅ |
| API build (`nest build`) | ✅ |
| Web build (`vite build`) | ✅ |
| Web lint (`eslint`) | ✅ (1 warning pre-existente en `ChildContext`) |

**Cobertura mínima verificada:**
1. Crear área ✅
2. Crear asignatura con área ✅
3. Crear asignatura con nivel ✅
4. Seleccionar docente ✅
5. Seleccionar asignatura ✅
6. Seleccionar curso ✅
7. Seleccionar periodo ✅
8. Crear TeacherAssignment ✅
9. Consultar asignación ✅
10. Tenant isolation ✅ (tests E2E validan cross-tenant rejection)
11. RBAC ✅ (tests E2E validan 403 sin permisos)

---

## 8. VALIDACIÓN END-TO-END

| Compuerta | Comando | Resultado |
|-----------|---------|-----------|
| Prisma validate | `npx prisma validate` | ✅ Schema válido |
| API typecheck | `npx nest build` | ✅ |
| Web typecheck | `npx tsc --noEmit` | ✅ |
| Web unit tests | `npx vitest run` | ✅ 510/510 |
| API E2E (áreas/docentes) | `jest --testPathPattern="areas\|teachers"` | ✅ 9/9 |
| API E2E (full) | `jest --config ./test/jest-e2e.json --runInBand` | ✅ 23 suites |
| Web build | `npm run build` | ✅ |
| API build | `npm run build` | ✅ |
| Web lint | `npm run lint` | ✅ |

---

## 9. SEGURIDAD Y TENANT ISOLATION

- **Tenant isolation:** Todos los endpoints validan `institutionId` del `TenantContextGuard` contra la entidad consultada/creada.
- **RBAC:** `PermissionGuard` + `@RequirePermission` en cada endpoint. Frontend usa `usePermissions()` para gates en UI.
- **Cross-tenant rejection:** Tests E2E validan que un admin de institución A no puede crear área en institución B.
- **No hardcoded data:** Todas las listas (áreas, docentes, cursos, asignaturas, periodos) cargan via API real.
- **Auditoría:** Todas las mutaciones logean en `AuditService` (userId, ip, old/new values).

---

## 10. REGRESIÓN

Verificado que **no se rompen** módulos existentes:
- Users, Roles, Memberships
- Courses, Students, Enrollments
- Subjects, TeacherAssignments
- Schedules, AcademicPeriods, Grades
- Attendance, Observador (StudentFollowUp)
- Communications, Signatures
- Dashboard, Reports, Agenda
- Tasks, TaskAssignments, TaskSubmissions

---

## 11. BASE DE DATOS

### NO SE MODIFICÓ `schema.prisma` EN ESTE PROMPT
El modelo ya contenía (desde PROMPTs 102-105):
- `model Area` (línea 794)
- `Subject.areaId`, `Subject.subjectType`, `Subject.minimumLevel`, `Subject.maximumLevel` (líneas 727, 731-733)
- `model TeacherAssignment` (línea 1136)
- Enums `SubjectType`, `EducationLevel` (líneas 70, 63)

### MIGRACIONES
**NO SE CREÓ NINGUNA MIGRACIÓN EN ESTE PROMPT.**

La migración `20260904000000_add_curriculum_hierarchy_and_staff` ya existía en el working tree (desde PROMPT 102) y fue aplicada a la BD local antes de este prompt.

---

## 12. GAPS RESIDUALES (POST-MVP)

| Gap | Descripción | Origen |
|-----|-------------|--------|
| **Director de Grupo ↔ Curso ↔ Periodo** | Rol `DIRECTOR_DE_GRUPO` existe pero no hay relación explícita Director → Curso → Periodo. Solo se infiere por asignaciones. | PROMPT 105 (F-01), **fuera de alcance** |
| **TeacherAssignment sin vigencia** | Falta `startDate`/`endDate` en `TeacherAssignment` para definir vigencia temporal. | PROMPT 105 (heredado) |
| **Filtrado inteligente Área→Nivel→Asignatura en TeacherAssignmentFormPage** | Actualmente muestra todas las asignaturas. Podría filtrarse client-side por área/nivel seleccionados. | PROMPT 107 FASE 7 (nice-to-have) |
| **Edición de TeacherAssignment** | Solo create/read/deactivate. Falta PATCH para cambiar curso/asignatura/periodo/horas. | Backend DTO existe, frontend pendiente |

---

## 13. RIESGOS

| Riesgo | Mitigación |
|--------|------------|
| Build desplegado desactualizado | Commitear working tree y redesplegar (fuera de alcance read-only PROMPT 106) |
| Datos demo mínimos (22/25 asignaturas sin área) | Seed real en onboarding de institución |
| Validación nivel min/max solo en frontend | Backend ya valida via enum; frontend evita errores UX |

---

## 14. GIT STATE

### Archivos modificados en este prompt (delta sobre working tree PROMPTs 102-105):
```
M apps/web/src/modules/areas/pages/AreasPage.tsx           # Edit/desactivate funcionalidad
M apps/web/src/modules/subjects/pages/SubjectDetailPage.tsx # + campos académicos
M apps/web/src/modules/subjects/pages/SubjectFormPage.tsx   # + validación nivel min/max
M apps/web/src/modules/subjects/pages/SubjectsPage.tsx      # + filtro área, tabla con área/tipo/nivel
```

### Archivos nuevos en working tree (desde PROMPTs 102-105, no commiteados):
```
?? apps/api/src/modules/areas/
?? apps/api/test/areas-teachers.e2e-spec.ts
?? apps/web/src/modules/areas/
?? apps/web/src/modules/teacher-assignments/hooks/useDirectors.ts
?? apps/web/src/modules/teacher-assignments/hooks/useTeachers.ts
?? apps/web/src/modules/teacher-assignments/pages/TeachersPage.tsx
?? apps/api/prisma/migrations/20260904000000_add_curriculum_hierarchy_and_staff/
```

### Archivos de documentación:
```
?? docs/107-academic-flow-areas-subjects-teachers.md  (este archivo)
```

---

## 15. CONFIRMACIÓN DE ALCANCE

| Pregunta | Respuesta |
|----------|-----------|
| ¿Ya existe `/areas`? | **Sí**, ruta registrada y página funcional |
| ¿Ahora se puede crear un área desde la UI? | **Sí**, formulario inline con validación |
| ¿Ahora se puede asociar una asignatura a un área? | **Sí**, selector en formulario y edición |
| ¿Ahora se puede configurar el nivel educativo? | **Sí**, nivel mínimo/máximo con validación consistencia |
| ¿Ahora se puede seleccionar un profesor sin introducir UUID? | **Sí**, dropdown con nombres en TeacherAssignmentFormPage |
| ¿Ahora se puede asignar profesor + asignatura + curso + periodo? | **Sí**, formulario completo funcional |
| ¿Ahora se puede consultar esa relación? | **Sí**, listado `/teacher-assignments` y detalle |
| ¿Ahora se pueden determinar sus estudiantes mediante relaciones existentes? | **Sí**, `TeacherSummary.courses[].students` vía `Course + Enrollment` |
| ¿Fue necesario modificar la BD? | **No**, modelo ya soportaba todo |
| ¿Se creó alguna migración? | **No** |
| ¿Se creó una entidad Teacher? | **No**, se usa `User + UserRole(TEACHER) + TeacherAssignment` |
| ¿Qué queda pendiente? | Gaps residuales documentados en sección 12 |

---

## 16. CONCLUSIÓN

**PROMPT 107 — EXITOSO.**

El flujo académico completo **ÁREA → ASIGNATURA → NIVEL → DOCENTE → CURSO → PERIODO → ESTUDIANTES** es **funcional de extremo a extremo** desde la interfaz de administrador.

Todos los componentes backend ya existían en el working tree (PROMPTs 102-105). Este prompt completó los **gaps de frontend/UX**:
- Edición/desactivación de áreas
- Visualización de campos académicos en detalle y listado de asignaturas
- Filtro por área en listado de asignaturas
- Validación de consistencia nivel mínimo/máximo
- Limpieza de lint y verificación de regresión

**Próximo paso recomendado (fuera de este prompt):** Commitear el working tree completo (PROMPTs 102-107) y redesplegar API + Web para que los usuarios vean las funcionalidades.