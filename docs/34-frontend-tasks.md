# Prompt 34 — Frontend Tasks Module

## 1. Overview

Complete frontend Tasks module providing CRUD operations with lifecycle management (DRAFT → PUBLISHED → CLOSED → INACTIVE), following the established patterns from Students, Courses, Subjects, Grades, and Schedules modules.

## 2. Backend Contract Verified

### Endpoints
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/api/v1/tasks` | `tasks:manage` | Create task (always DRAFT) |
| `GET` | `/api/v1/tasks` | `tasks:read` | List tasks (paginated, filtered) |
| `GET` | `/api/v1/tasks/:id` | `tasks:read` | Get single task |
| `PATCH` | `/api/v1/tasks/:id` | `tasks:manage` | Update task (DRAFT only) |
| `PATCH` | `/api/v1/tasks/:id/publish` | `tasks:manage` | DRAFT → PUBLISHED |
| `PATCH` | `/api/v1/tasks/:id/close` | `tasks:manage` | PUBLISHED → CLOSED |
| `PATCH` | `/api/v1/tasks/:id/deactivate` | `tasks:manage` | Any → INACTIVE |

### Task Model
- `id` (UUID), `institutionId` (UUID), `courseId` (UUID), `subjectId` (UUID)
- `title` (VarChar 200, required), `description` (Text, optional)
- `dueDate` (DateTime, required), `status` (TaskStatus, default DRAFT)
- `createdAt`, `updatedAt`

### TaskStatus Enum
`DRAFT` | `PUBLISHED` | `CLOSED` | `INACTIVE`

### Lifecycle Rules
- DRAFT: Edit, Publish, Deactivate
- PUBLISHED: Close, Deactivate (no edit)
- CLOSED: Deactivate only
- INACTIVE: Terminal state

### List Query Parameters
`page`, `limit` (max 100), `search` (title/description), `status`, `courseId`, `subjectId`, `dueDateFrom`, `dueDateTo`

### Permissions
- `tasks:read` — SUPER_ADMIN, INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT
- `tasks:manage` — SUPER_ADMIN, INSTITUTION_ADMIN, TEACHER

## 3. Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/modules/tasks/index.ts` | Barrel exports |
| `apps/web/src/modules/tasks/hooks/index.ts` | Hook barrel exports |
| `apps/web/src/modules/tasks/hooks/useTasks.ts` | Paginated list query |
| `apps/web/src/modules/tasks/hooks/useTask.ts` | Single entity query |
| `apps/web/src/modules/tasks/hooks/useCreateTask.ts` | POST mutation |
| `apps/web/src/modules/tasks/hooks/useUpdateTask.ts` | PATCH mutation |
| `apps/web/src/modules/tasks/hooks/usePublishTask.ts` | Publish lifecycle mutation |
| `apps/web/src/modules/tasks/hooks/useCloseTask.ts` | Close lifecycle mutation |
| `apps/web/src/modules/tasks/hooks/useDeactivateTask.ts` | Deactivate mutation |
| `apps/web/src/modules/tasks/pages/TasksPage.tsx` | List page |
| `apps/web/src/modules/tasks/pages/TaskDetailPage.tsx` | Detail with lifecycle |
| `apps/web/src/modules/tasks/pages/TaskFormPage.tsx` | Create/Edit form |
| `apps/web/src/modules/tasks/__tests__/tasks-page.test.tsx` | 5 tests |
| `apps/web/src/modules/tasks/__tests__/task-detail-page.test.tsx` | 9 tests |
| `apps/web/src/modules/tasks/__tests__/task-form-page.test.tsx` | 3 tests |
| `docs/34-frontend-tasks.md` | This documentation |

## 4. Files Modified

| File | Reason |
|------|--------|
| `apps/web/src/api/types.ts` | Added TaskStatus, Task, CreateTaskInput, UpdateTaskInput, ListTasksParams, TASK_STATUS_LABELS |
| `apps/web/src/app/router.tsx` | Added 4 task routes |
| `README.md` | Updated feature list and test count |

## 5. API Types

- `TaskStatus`: `'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'INACTIVE'`
- `TASK_STATUS_LABELS`: Spanish label mapping
- `Task`: 11 fields matching backend model
- `CreateTaskInput`: title (required), description, courseId, subjectId, dueDate
- `UpdateTaskInput`: all optional
- `ListTasksParams`: page, limit, search, status, courseId, subjectId, dueDateFrom, dueDateTo

## 6. Hooks

7 hooks implemented following established patterns:
- `useTasks(params)` — URLSearchParams construction with all filters
- `useTask(id)` — Single entity with enabled guard
- `useCreateTask()` — POST, list invalidation
- `useUpdateTask()` — PATCH, list + detail invalidation
- `usePublishTask()` — PATCH /:id/publish, list + detail invalidation
- `useCloseTask()` — PATCH /:id/close, list + detail invalidation
- `useDeactivateTask()` — PATCH /:id/deactivate, list + detail invalidation

## 7. Pages

### TasksPage
- Header with "Nueva tarea" button (manage permission)
- Debounced search (400ms) on title/description
- Status filter (DRAFT/PUBLISHED/CLOSED/INACTIVE/Todos)
- Clear filters button
- Desktop table: Título, Curso, Asignatura, Fecha límite, Estado, Acciones
- Mobile cards with title, due date, status badge
- Pagination with "Mostrando X-Y de Z"
- Loading/Empty/Error states

### TaskDetailPage
- Header: title as h1, description as subtitle
- Actions based on status + permission:
  - DRAFT: Editar, Publicar, Desactivar
  - PUBLISHED: Cerrar, Desactivar
  - CLOSED: Desactivar
  - INACTIVE: No destructive actions
- Two-card grid: Info (title, description, dueDate, status) + Relations (courseId, subjectId, ID, timestamps)
- Confirmation modals for Publish, Close, Deactivate
- Back button

### TaskFormPage
- Reusable for create/edit
- Fields: title (required, min 3, max 200), description (textarea, max 5000), course (select), subject (select), dueDate (datetime-local)
- Blocks edit for non-DRAFT tasks (redirects to detail)
- Validation: required fields, min/max lengths
- API error display via getErrorMessage()
- On success navigates to detail page

## 8. Routing

| Route | Component |
|-------|-----------|
| `/tasks` | `TasksPage` |
| `/tasks/new` | `TaskFormPage` |
| `/tasks/:id` | `TaskDetailPage` |
| `/tasks/:id/edit` | `TaskFormPage` |

## 9. Search / Filters / Pagination

- **Search**: Debounced 400ms, searches title and description (backend full-text)
- **Status filter**: DRAFT/PUBLISHED/CLOSED/INACTIVE/Todos dropdown
- **Clear filters**: Single button when any filter active
- **Pagination**: Limit=20, Anterior/Siguiente, "Mostrando X-Y de Z"
- **Note**: courseId/subjectId/dueDateFrom/dueDateTo filters supported by backend but not exposed in list UI

## 10. Task Lifecycle

```
DRAFT → PUBLISHED (usePublishTask)
DRAFT → INACTIVE (useDeactivateTask)
PUBLISHED → CLOSED (useCloseTask)
PUBLISHED → INACTIVE (useDeactivateTask)
CLOSED → INACTIVE (useDeactivateTask)
```

Each lifecycle mutation:
- Calls the real backend endpoint
- Invalidates both task list and detail cache
- Shows confirmation modal before execution
- Displays errors via getErrorMessage()
- Never changes status locally without backend confirmation

## 11. Relations

- **Courses**: `useCourses({ limit: 100 })` for form dropdown
- **Subjects**: `useSubjects({ limit: 100 })` for form dropdown
- **Table**: Truncated UUIDs for courseId/subjectId (consistent with Grades/Schedules)

## 12. RBAC

- `tasks:read` — sidebar, list, detail
- `tasks:manage` — create, edit, publish, close, deactivate
- Permissions already existed in `permission.constants.ts`
- Sidebar nav item already existed for `/tasks`

## 13. UI/UX

- Identical visual language to existing modules
- Consistent component usage (PageHeader, Card, Badge, Button, Input, Spinner, EmptyState, ErrorState)
- Status badges with distinct colors: DRAFT=gray, PUBLISHED=green, CLOSED=yellow, INACTIVE=red
- Confirmation modals for all lifecycle transitions
- Spanish labels throughout

## 14. Responsive Behavior

- Desktop (md+): Full table with 6 columns
- Mobile (<md): Card layout with stacked info
- Forms work correctly on desktop, tablet, mobile
- No horizontal overflow

## 15. Security Review

- ✅ No institutionId sent from forms
- ✅ No tenant ID manually accepted
- ✅ No password/token exposure
- ✅ Centralized API client used
- ✅ Permission gates applied (tasks:read, tasks:manage)
- ✅ No sensitive data in localStorage
- ✅ No arbitrary API URL construction
- ✅ Relation IDs from trusted UI selections
- ✅ Backend remains responsible for authorization
- ✅ No dangerouslySetInnerHTML
- ✅ Edit blocked for non-DRAFT tasks in UI

## 16. Validation

- **Client-side**: title required (min 3, max 200), description max 5000, courseId/subjectId required, dueDate required
- **Backend**: Same constraints + lifecycle rules + relation existence + teacher authorization
- **Backend is authoritative**

## 17. Tests

### New Tests (17 tests)

**TasksPage (5 tests)**:
1. renders page title
2. shows empty state when no tasks
3. shows create button when user has manage permission
4. renders task list
5. navigates to detail on click

**TaskDetailPage (9 tests)**:
6. renders task title
7. renders task description
8. shows DRAFT status badge
9. shows edit button for DRAFT tasks
10. shows publish button for DRAFT tasks
11. hides edit button for PUBLISHED tasks
12. shows close button for PUBLISHED tasks
13. hides publish and close for CLOSED tasks
14. shows error state for 404

**TaskFormPage (3 tests)**:
15. renders create form
16. shows validation errors on empty submit
17. creates task on valid submit

### Test Totals
- **Previous baseline**: 79 tests
- **New tests**: 17
- **Total**: 96 tests
- **Passed**: 96/96 ✅

## 18. TypeScript

- ✅ `tsc --noEmit` passes with 0 errors

## 19. ESLint

- ✅ `eslint .` passes with 0 errors

## 20. Build

- ✅ `tsc --noEmit && vite build` passes
- ✅ dist/ output: index.html (0.54 kB), CSS (22.70 kB), JS (441.46 kB)

## 21. Backend Regression

- No backend modifications made
- Frontend changes are purely additive

## 22. Documentation

- ✅ `docs/34-frontend-tasks.md` created

## 23. README

- ✅ Updated with Tasks module and test count (79→96)

## 24. Problems Found and Solutions

- **Duplicate text in detail tests**: Title and description appeared both in PageHeader and detail card. Fixed by using `getAllByText` instead of `getByText`.

## 25. Remaining Limitations

1. **Course/Subject names in table**: Shows truncated UUIDs (consistent pattern)
2. **No task assignments UI**: Would require separate module
3. **No task submissions UI**: Would require separate module
4. **No file attachments UI**: Would require file upload integration
5. **Search limited to title/description**: Backend search scope

## 26. Git Status

- **No commit** — as required
- **No push** — as required

## 27. Architecture Assessment

Tasks module follows identical patterns to all existing modules. The lifecycle management (publish/close/deactivate) adds complexity beyond simple CRUD but follows the same mutation/invalidation patterns. The architecture naturally extends to TaskAssignments and TaskSubmissions.

## 28. Remaining MVP Gaps

- Task Assignments frontend
- Task Submissions frontend
- Communications / Communication Recipients
- Signatures
- Notifications
- School Grades
- Academic Periods
- Guardians
- Enrollments
- Teacher Assignments
- Dashboard enhancements

## 29. Next Recommended Prompt

**PROMPT 35 — Frontend Task Assignments Module**

Rationale:
- TaskAssignments backend is fully implemented
- Assignments are tightly coupled with Tasks (already completed)
- Students/Parents need to see their assigned tasks
- Teachers need to manage assignments
- The backend supports: list, create (bulk), update status, deactivate
- No new modules need to be completed before this
- Dependencies: Tasks (completed), Students (completed), Enrollments (backend exists)
