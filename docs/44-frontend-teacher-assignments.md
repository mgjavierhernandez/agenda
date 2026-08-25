# 📋 Frontend: Asignaciones Docentes (PROMPT 44)

## Resumen del Módulo

Módulo frontend que permite asignar profesores a asignaturas dentro de un curso y periodo académico. Incluye listado con filtros, creación, visualización de detalles y gestión de estado (activar/desactivar).

## Architectural Decisions

### Profesores son Usuarios

No existe un modelo `Teacher` separado. Los profesores se obtienen del módulo de usuarios (`GET /users`). Se seleccionan mediante un dropdown en el formulario de creación.

### Desactivación en lugar de eliminación

No se permite eliminación física. La acción principal es desactivar (cambiar estado a `INACTIVE`). Un usuario con permisos de administración puede reactivar una asignación.

### Resolución de entidades relacionadas

En la página de detalles, se resuelven los nombres de curso, asignatura, periodo y profesor haciendo peticiones independientes con sus hooks correspondientes (`useCourse`, `useSubject`, `useAcademicPeriods`, `useUsers`).

### useUsers hook

Se crea el hook `useUsers` dentro del módulo `teacher-assignments` ya que no existe un módulo `users` en el frontend. Este hook consume `GET /users` con paginación y filtros opcionales (search, status).

### useCourses, useSubjects, useAcademicPeriods reutilizados

Los hooks de cursos, asignaturas y periodos académicos se importan desde sus módulos correspondientes. No se duplican.

## API Endpoints Utilizados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/users` | Listar usuarios (profesores) |
| `GET` | `/courses` | Listar cursos |
| `GET` | `/courses/:id` | Detalle de curso |
| `GET` | `/subjects` | Listar asignaturas |
| `GET` | `/subjects/:id` | Detalle de asignatura |
| `GET` | `/academic-periods` | Listar periodos académicos |
| `GET` | `/academic-periods/:id` | Detalle de periodo |
| `POST` | `/teacher-assignments` | Crear asignación docente |
| `GET` | `/teacher-assignments` | Listar asignaciones (paginado + filtros) |
| `GET` | `/teacher-assignments/:id` | Detalle de asignación |
| `PATCH` | `/teacher-assignments/:id` | Actualizar estado |
| `PATCH` | `/teacher-assignments/:id/deactivate` | Desactivar asignación |

## API Types Relacionados

```typescript
type TeacherAssignmentStatus = 'ACTIVE' | 'INACTIVE';

interface TeacherAssignment {
  id: string;
  institutionId: string;
  teacherUserId: string;
  courseId: string;
  subjectId: string;
  academicPeriodId: string;
  status: TeacherAssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

interface CreateTeacherAssignmentInput {
  teacherUserId: string;
  courseId: string;
  subjectId: string;
  academicPeriodId: string;
}

interface UpdateTeacherAssignmentInput {
  status?: TeacherAssignmentStatus;
}
```

## Permisos Requeridos

| Permiso | Acción |
|---------|--------|
| `teacher-assignments:read` | Ver listado y detalles de asignaciones |
| `teacher-assignments:manage` | Crear, actualizar, activar/desactivar asignaciones |

## Hooks Implementados

| Hook | Archivo | Descripción |
|------|---------|-------------|
| `useTeacherAssignments` | `hooks/useTeacherAssignments.ts` | Fetch paginado con filtros (teacherUserId, courseId, subjectId, academicPeriodId) |
| `useTeacherAssignment` | `hooks/useTeacherAssignment.ts` | Fetch de una asignación por ID |
| `useCreateTeacherAssignment` | `hooks/useCreateTeacherAssignment.ts` | Crear asignación (`POST`) |
| `useUpdateTeacherAssignment` | `hooks/useUpdateTeacherAssignment.ts` | Actualizar estado (`PATCH /:id`) |
| `useDeactivateTeacherAssignment` | `hooks/useDeactivateTeacherAssignment.ts` | Desactivar asignación (`PATCH /:id/deactivate`) |
| `useUsers` | `hooks/useUsers.ts` | Fetch de usuarios (para selector de profesor) |

## Páginas Implementadas

| Página | Ruta | Descripción |
|--------|------|-------------|
| `TeacherAssignmentsPage` | `/teacher-assignments` | Listado con filtros: profesor, curso, asignatura, periodo. Responsive con tabla desktop y tarjetas mobile. |
| `TeacherAssignmentDetailPage` | `/teacher-assignments/:id` | Detalle de asignación con información del profesor, curso, asignatura, periodo. Botón desactivar/activar. |
| `TeacherAssignmentFormPage` | `/teacher-assignments/new` | Formulario de creación con selectores para profesor, curso, asignatura y periodo. Validación client-side. |

## Tests

| Archivo | Tests | Descripción |
|---------|-------|-------------|
| `__tests__/teacher-assignments-hooks.test.tsx` | 12 | Tests de hooks (fetch, create, update, deactivate) |
| `__tests__/teacher-assignments-pages.test.tsx` | 16 | Tests de páginas (renderizado, filtros, formularios, permisos) |
| **Total** | **28** | |

## Sidebar

La entrada "Asignaciones docentes" aparece con el ícono `👨‍🏫` y requiere el permiso `TEACHER_ASSIGNMENTS_READ`.

## Filtros de Búsqueda

La página de listado incluye 4 filtros en cascada:
- **Profesor**: Dropdown con todos los usuarios activos
- **Curso**: Dropdown con todos los cursos activos
- **Asignatura**: Dropdown con todas las asignaturas activas
- **Periodo**: Dropdown con todos los periodos académicos activos

Cada filtro envía su valor como query parameter en la petición GET.

## Integración con módulos existentes

- **Cursos**: `useCourses`, `useCourse` — reutilizados para selectores y resolución en detalles
- **Asignaturas**: `useSubjects`, `useSubject` — reutilizados para selectores y resolución en detalles
- **Periodos académicos**: `useAcademicPeriods`, `useAcademicPeriod` — reutilizados para selectores y resolución en detalles
- **Usuarios**: `useUsers` — creado en este módulo (no existe módulo users en frontend)

## Funcionalidad Clave

### Desactivar/Activar

- Solo se puede desactivar una asignación con estado `ACTIVE`
- Solo se puede activar una asignación con estado `INACTIVE`
- Al desactivar, el usuario ve un modal de confirmación
- Al activar, se actualiza directamente el estado a `ACTIVE`
- Solo usuarios con permiso `teacher-assignments:manage` pueden realizar estas acciones

### Layout responsive

- Desktop: Tabla con columnas (Profesor, Email, Curso, Asignatura, Periodo, Estado)
- Mobile: Cards con toda la información
- Los filtros están en una fila horizontal en desktop y se apilan en mobile
