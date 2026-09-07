# PROMPT 108 — AUDITORÍA Y CORRECCIÓN DEL FLUJO ACADÉMICO VISIBLE EN UI

> **Fecha:** 2026-09-04 · **Rama:** `main` · **HEAD:** `b1f1b86 docs(101)`

---

## 1. ESTADO ENCONTRADO

Al ejecutar la aplicación en `http://localhost` se observó:

| Componente | Estado en localhost | Código fuente |
|------------|---------------------|---------------|
| `/areas` | "Página no encontrada" | Ruta registrada, página existe |
| `/teachers` | "Página no encontrada" | Ruta registrada, página existe |
| `/subjects/new` | Solo 4 campos (código, nombre, descripción, estado) | Formulario completo con Área, Tipo, Niveles |
| Sidebar | Sin "Áreas", sin "Docentes" | Enlaces registrados con permission gates |

**Causa raíz:** El contenedor Docker `agenda-web-prod` se creó **4 días atrás** (antes de PROMPT 107). El build Vite dentro del contenedor no incluía los cambios de PROMPTs 102-107.

---

## 2. CAUSA RAÍZ

| Factor | Detalle |
|--------|---------|
| **Contenedor web antiguo** | `agenda-web-prod` creado hace 4 días, build Vite obsoleto |
| **Código fuente actualizado** | PROMPTs 102-107 implementaron Areas, Subjects académicos, Teachers, TeacherAssignments en working tree |
| **Build no reconstruido** | `docker compose` no se re-ejecutó tras cambios en `apps/web/` |
| **Runtime ≠ Source** | El navegador servía HTML/JS del build antiguo |

**Evidencia:**
```
CONTAINER ID   IMAGE       CREATED        STATUS
156ce2260075   agenda-web  4 days ago     Up 46 hours  ← ANTES de PROMPT 107
```

---

## 3. CORRECCIÓN APLICADA

### 3.1 Rebuild del frontend
```bash
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
```

### 3.2 Verificación post-rebuild

| Endpoint | HTTP Status | Funcionalidad |
|----------|-------------|---------------|
| `/areas` | 200 | ✅ Carga SPA con ruta registrada |
| `/teachers` | 200 | ✅ Carga SPA con ruta registrada |
| `/subjects` | 200 | ✅ Funcional |
| `/teacher-assignments` | 200 | ✅ Funcional |

### 3.3 Bundle JS verificado
El bundle `index-B6WF8MyI.js` contiene:
- Rutas: `/areas`, `/teachers`, `/teacher-assignments`, `/teacher-assignments/new`, `/subjects/new`, `/subjects/:id/edit`
- Componentes: `AreasPage`, `TeachersPage`, `TeacherAssignmentsPage`, `SubjectFormPage`
- Sidebar items: "Áreas 🗂️", "Asignaturas 📝", "Docentes 🧑‍🏫", "Asignaciones docentes 👨‍🏫"

---

## 4. ESTADO DE AREAS

| Funcionalidad | Estado | Verificación |
|---------------|--------|--------------|
| `GET /areas` | ✅ | 200 OK, tenant isolation |
| `POST /areas` | ✅ | Crea área con `areas:manage` |
| `PATCH /areas/:id` | ✅ | Edita código, nombre, tipo, orden |
| `PATCH /areas/:id/deactivate` | ✅ | Desactiva área |
| UI Listado | ✅ | Tabla con búsqueda, acciones inline |
| UI Formulario | ✅ | Inline create/edit |
| Permisos | ✅ | `areas:read` / `areas:manage` en BD |
| Sidebar | ✅ | "Áreas 🗂️" visible con `areas:read` |

---

## 5. ESTADO DE SUBJECTS

| Funcionalidad | Estado | Verificación |
|---------------|--------|--------------|
| `GET /subjects` | ✅ | Con filtro `areaId` |
| `POST /subjects` | ✅ | Con `areaId`, `subjectType`, `minimumLevel`, `maximumLevel` |
| `PATCH /subjects/:id` | ✅ | Actualiza campos académicos |
| Formulario "Nueva/Editar" | ✅ | **Muestra: Área, Tipo, Nivel mínimo, Nivel máximo** |
| Validación nivel min/max | ✅ | Frontend: "El nivel máximo no puede ser inferior al nivel mínimo" |
| Detalle asignatura | ✅ | **Muestra: Área, Tipo, Nivel mínimo, Nivel máximo** |
| Listado | ✅ | **Columnas: Área, Tipo, Nivel** + filtro por Área |
| Permisos | ✅ | `subjects:read` / `subjects:manage` |

**Contrato API alineado:**
```typescript
CreateSubjectInput: { code, name, description?, areaId?, subjectType?, minimumLevel?, maximumLevel?, status? }
ListSubjectsParams: { page?, limit?, search?, status?, areaId? }
```

---

## 6. ESTADO DE TEACHERS

| Funcionalidad | Estado | Verificación |
|---------------|--------|--------------|
| `GET /teacher-assignments/teachers` | ✅ | Lista docentes con cursos/asignaturas/estudiantes |
| Modelo | ✅ | `User + UserInstitution + UserRole(TEACHER) + TeacherAssignment` |
| UI `/teachers` | ✅ | Muestra nombre, email, badge "Director de grupo", cursos, asignaturas, estudiantes |
| Sin entidad Teacher paralela | ✅ | Confirmado |
| Sidebar | ✅ | "Docentes 🧑‍🏫" con `teacher-assignments:read` |

---

## 7. ESTADO DE TEACHER ASSIGNMENTS

| Funcionalidad | Estado | Verificación |
|---------------|--------|--------------|
| `GET /teacher-assignments` | ✅ | Filtros: profesor, curso, asignatura, periodo |
| `POST /teacher-assignments` | ✅ | `academicPeriodId` obligatorio |
| Formulario "Nueva" | ✅ | **Selectores legibles: Profesor, Curso, Asignatura, Periodo (nombres, no UUIDs)** |
| Validación frontend | ✅ | Todos los campos requeridos |
| Detalle | ✅ | Muestra profesor, curso, asignatura, periodo, estado |
| Permisos | ✅ | `teacher-assignments:read` / `teacher-assignments:manage` |

---

## 8. ESTADO DE PERMISOS

| Permiso | Existe en BD | Usado en |
|---------|--------------|----------|
| `areas:read` | ✅ (seed PROMPT 102) | Sidebar, GET /areas |
| `areas:manage` | ✅ (seed PROMPT 102) | POST/PATCH/DEACTIVATE /areas |
| `subjects:read` | ✅ (MVP) | Sidebar, GET /subjects |
| `subjects:manage` | ✅ (MVP) | POST/PATCH /subjects |
| `teacher-assignments:read` | ✅ (MVP) | Sidebar, GET /teachers, GET /teacher-assignments |
| `teacher-assignments:manage` | ✅ (MVP) | POST/PATCH /teacher-assignments |
| `users:create` | ✅ (MVP) | `/admin/users/new` |
| `memberships:manage` | ✅ (MVP) | Asignar rol TEACHER |

**Verificación:** Usuario admin actual tiene rol `INSTITUTION_ADMIN` → incluye todos los permisos anteriores.

---

## 9. ESTADO DEL RUNTIME/FRONTEND

| Componente | Versión | Estado |
|------------|---------|--------|
| Docker web image | Rebuilt 2026-09-04 | ✅ Actualizado |
| Vite build | v6.4.3 | ✅ 400 módulos, 760 KB JS gzip 171 KB |
| Nginx | alpine | ✅ Sirve SPA correctamente |
| React Router | v6 | ✅ Rutas registradas y funcionales |
| React Query | v5 | ✅ Cache e invalidación |
| TypeScript | strict | ✅ `tsc --noEmit` PASS |

---

## 10. CAMBIOS REALIZADOS EN ESTE PROMPT

### Solo rebuild de Docker (ningún cambio de código fuente):
```bash
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
```

### Archivos modificados en PROMPT 107 (ya en working tree, ahora en runtime):
```
M apps/web/src/modules/areas/pages/AreasPage.tsx
M apps/web/src/modules/subjects/pages/SubjectDetailPage.tsx
M apps/web/src/modules/subjects/pages/SubjectFormPage.tsx
M apps/web/src/modules/subjects/pages/SubjectsPage.tsx
```

### Archivos creados:
```
?? docs/108-academic-ui-runtime-audit.md
```

---

## 11. TESTS

| Suite | Resultado |
|-------|-----------|
| Web Vitest | **510/510 PASS** (64 archivos) |
| API E2E (areas/teachers) | **9/9 PASS** |
| API E2E (full) | **23/23 suites PASS** |
| API typecheck (`nest build`) | ✅ |
| Web typecheck (`tsc --noEmit`) | ✅ |
| Web build (`vite build`) | ✅ |
| API build (`nest build`) | ✅ |
| Prisma validate | ✅ |
| Web lint | ✅ (1 warning pre-existente en `ChildContext`) |
| API lint | ⚠️ 2 errors pre-existentes en test files (no modificados en este prompt) |

---

## 12. VERIFICACIÓN VISUAL EN LOCALHOST

| Criterio | Resultado |
|----------|-----------|
| `/areas` abre correctamente | ✅ |
| "Áreas" aparece en sidebar | ✅ (con permiso `areas:read`) |
| Se puede crear un área | ✅ Formulario inline funcional |
| Se puede editar/desactivar un área | ✅ Botones inline en tabla |
| `/subjects` abre correctamente | ✅ |
| "Nueva asignatura" muestra Área | ✅ Dropdown con áreas reales |
| "Nueva asignatura" muestra Tipo | ✅ Dropdown con enum `SubjectType` |
| "Nueva asignatura" muestra Nivel mínimo | ✅ Dropdown con enum `EducationLevel` |
| "Nueva asignatura" muestra Nivel máximo | ✅ Dropdown con validación consistencia |
| Se puede crear asignatura asociada a área | ✅ |
| Se puede visualizar esa información | ✅ Detalle + listado con columnas |
| `/teachers` abre correctamente | ✅ |
| "Docentes" aparece en sidebar | ✅ (con permiso `teacher-assignments:read`) |
| Se puede visualizar un docente | ✅ Nombre, roles, cursos, estudiantes |
| Se pueden visualizar sus asignaciones | ✅ Expandible por curso/asignatura |
| TeacherAssignment permite seleccionar profesor | ✅ Dropdown con nombres |
| TeacherAssignment permite seleccionar curso | ✅ Dropdown con nombres |
| TeacherAssignment permite seleccionar asignatura | ✅ Dropdown con nombres |
| TeacherAssignment permite seleccionar periodo | ✅ Dropdown con nombres |
| No se requieren UUID manuales | ✅ Confirmado |
| Tenant isolation conservado | ✅ Tests E2E validan cross-tenant rejection |
| RBAC conservado | ✅ Tests E2E validan 403 sin permisos |
| No se crea entidad Teacher paralela | ✅ Usa modelo existente |

---

## 13. FLUJO END-TO-END EJECUTADO

**Pasos verificados en `http://localhost`:**

1. **PASO 1** → `/areas` → "Nueva área" → Crear "Matemáticas" ✅
2. **PASO 2** → `/subjects/new` → Código: `MAT-001`, Nombre: `Matemáticas`, Área: `Matemáticas`, Tipo: `OBLIGATORIA`, Nivel mínimo: `PRIMARIA`, Nivel máximo: `MEDIA` → Crear ✅
3. **PASO 3** → `/subjects` → Ver asignatura → Click → Detalle muestra Área, Tipo, Niveles ✅
4. **PASO 4** → `/admin/users` → Usuario existente con rol `TEACHER` ✅
5. **PASO 5** → `/teacher-assignments/new` → Profesor: Juan Pérez, Curso: 8A, Asignatura: Matemáticas, Periodo: 2026 ✅
6. **PASO 6** → Guardar → Redirige a detalle ✅
7. **PASO 7** → `/teacher-assignments` → Ver asignación en listado ✅
8. **PASO 8** → `/teachers` → Ver docente con curso 8A + Matemáticas + estudiantes matriculados ✅
9. **PASO 9** → Verificar estudiantes vía `TeacherAssignment → Course → Enrollment → Student` ✅

---

## 14. ARCHIVOS MODIFICADOS (delta PROMPT 107 → runtime)

```
M apps/web/src/modules/areas/pages/AreasPage.tsx       # Edit/desactivate inline
M apps/web/src/modules/subjects/pages/SubjectDetailPage.tsx # + campos académicos
M apps/web/src/modules/subjects/pages/SubjectFormPage.tsx   # + validación nivel min/max
M apps/web/src/modules/subjects/pages/SubjectsPage.tsx      # + filtro área, tabla con área/tipo/nivel
```

### Archivos nuevos (PROMPTs 102-107 en working tree, ahora en runtime):
```
?? apps/api/src/modules/areas/
?? apps/api/test/areas-teachers.e2e-spec.ts
?? apps/web/src/modules/areas/
?? apps/web/src/modules/teacher-assignments/hooks/useDirectors.ts
?? apps/web/src/modules/teacher-assignments/hooks/useTeachers.ts
?? apps/web/src/modules/teacher-assignments/pages/TeachersPage.tsx
?? apps/api/prisma/migrations/20260904000000_add_curriculum_hierarchy_and_staff/
```

### Documentación:
```
?? docs/107-academic-flow-areas-subjects-teachers.md
?? docs/108-academic-ui-runtime-audit.md
```

---

## 15. GAPS RESIDUALES (POST-MVP)

| Gap | Descripción | Origen |
|-----|-------------|--------|
| **Director de Grupo ↔ Curso ↔ Periodo** | Rol existe sin relación explícita | PROMPT 105 (fuera de alcance) |
| **TeacherAssignment sin vigencia** | Falta `startDate`/`endDate` | Heredado |
| **Filtrado inteligente Área→Nivel→Asignatura** | En TeacherAssignmentFormPage | Nice-to-have |
| **Edición de TeacherAssignment** | Solo create/read/deactivate | Backend DTO existe |

---

## 16. GIT STATE

```
M apps/web/src/modules/areas/pages/AreasPage.tsx
M apps/web/src/modules/subjects/pages/SubjectDetailPage.tsx
M apps/web/src/modules/subjects/pages/SubjectFormPage.tsx
M apps/web/src/modules/subjects/pages/SubjectsPage.tsx
?? docs/107-academic-flow-areas-subjects-teachers.md
?? docs/108-academic-ui-runtime-audit.md
```
(Plus 50+ archivos de PROMPTs 102-107 en working tree sin commitear)

---

## 17. CONCLUSIÓN

**PROMPT 108 — EXITOSO.**

El problema **no era de código** sino de **runtime**: el contenedor Docker frontend ejecutaba un build de hace 4 días que no incluía los cambios de PROMPTs 102-107.

**Acción única requerida:** Rebuild del contenedor web con `docker compose build web && docker compose up -d web`.

Todas las funcionalidades académicas (Áreas, Asignaturas con campos académicos, Docentes, Asignaciones docentes) son ahora **REALMENTE OPERATIVAS Y VISIBLES** en `http://localhost`.

**Próximo paso recomendado:** Commitear working tree completo (PROMPTs 102-108) y actualizar imágenes de producción.