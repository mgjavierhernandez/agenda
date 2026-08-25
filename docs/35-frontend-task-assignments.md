# Prompt 35 — Frontend Task Assignments Module

## 1. Overview

Complete frontend Task Assignments module providing the ability to assign tasks to students, track assignment status, and manage assignment lifecycle (ASSIGNED → COMPLETED / CANCELLED). Built following the established patterns from existing modules.

## 2. Backend Contract Verified

### Endpoints
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/api/v1/task-assignments` | `tasks:manage` | Create assignment(s) for a task |
| `GET` | `/api/v1/task-assignments` | `tasks:read` | List assignments (paginated, filtered) |
| `GET` | `/api/v1/task-assignments/:id` | `tasks:read` | Get single assignment |
| `PATCH` | `/api/v1/task-assignments/:id` | `tasks:manage` | Update assignment status |
| `PATCH` | `/api/v1/task-assignments/:id/deactivate` | `tasks:manage` | Set status to CANCELLED |

### TaskAssignment Model
- `id` (UUID), `institutionId` (UUID), `taskId` (UUID), `studentId` (UUID)
- `enrollmentId` (UUID, optional), `status` (TaskAssignmentStatus, default ASSIGNED)
- `assignedAt` (DateTime), `createdAt` (DateTime), `updatedAt` (DateTime)

### TaskAssignmentStatus Enum
`ASSIGNED` | `COMPLETED` | `CANCELLED`

### Create DTO
- `taskId` (UUID, required) — must be a PUBLISHED task
- `studentIds` (UUID[], optional, max 100) — if empty, assigns to all enrolled students in the task's course
- `enrollmentId` (UUID, optional)

### Update DTO
- `status` (TaskAssignmentStatus, optional)

### List Query Parameters
`page`, `limit` (max 100), `taskId`, `studentId`, `status`

### Permissions
- `tasks:read` — SUPER_ADMIN, INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT
- `tasks:manage` — SUPER_ADMIN, INSTITUTION_ADMIN, TEACHER

## 3. Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/modules/task-assignments/index.ts` | Barrel exports |
| `apps/web/src/modules/task-assignments/hooks/index.ts` | Hook barrel exports |
| `apps/web/src/modules/task-assignments/hooks/useTaskAssignments.ts` | Paginated list query with filters |
| `apps/web/src/modules/task-assignments/hooks/useTaskAssignment.ts` | Single entity query |
| `apps/web/src/modules/task-assignments/hooks/useCreateTaskAssignment.ts` | POST mutation (returns array) |
| `apps/web/src/modules/task-assignments/hooks/useUpdateTaskAssignment.ts` | PATCH mutation (status update) |
| `apps/web/src/modules/task-assignments/hooks/useDeactivateTaskAssignment.ts` | PATCH deactivate mutation |
| `apps/web/src/modules/task-assignments/pages/TaskAssignmentsPage.tsx` | List page with filters (task/student/status) |
| `apps/web/src/modules/task-assignments/pages/TaskAssignmentDetailPage.tsx` | Detail page with status actions |
| `apps/web/src/modules/task-assignments/pages/TaskAssignmentFormPage.tsx` | Create form with multi-student selection |
| `apps/web/src/modules/task-assignments/__tests__/task-assignments-page.test.tsx` | List page tests (5 tests) |
| `apps/web/src/modules/task-assignments/__tests__/task-assignment-detail-page.test.tsx` | Detail page tests (7 tests) |
| `apps/web/src/modules/task-assignments/__tests__/task-assignment-form-page.test.tsx` | Form page tests (5 tests) |

## 4. Files Modified

| File | Change |
|------|--------|
| `apps/web/src/api/types.ts` | Added `TaskAssignmentStatus`, `TASK_ASSIGNMENT_STATUS_LABELS`, `TaskAssignment`, `CreateTaskAssignmentInput`, `UpdateTaskAssignmentInput`, `ListTaskAssignmentsParams` |
| `apps/web/src/app/router.tsx` | Added 3 routes: `/task-assignments`, `/task-assignments/new`, `/task-assignments/:id` |
| `apps/web/src/components/layout/Sidebar.tsx` | Added "Asignaciones" nav entry with `tasks:read` permission |
| `apps/web/src/modules/tasks/pages/TaskDetailPage.tsx` | Added assignments section showing count and link to filtered list |

## 5. Architecture Decisions

### Permissions
Reuses existing `tasks:read` and `tasks:manage` permissions — no new permission codes needed (backend has no separate task-assignment permissions).

### Create Flow
- Lists only PUBLISHED tasks in dropdown (backend validates)
- Multi-student selection with checkboxes and "select all" toggle
- Returns array of created assignments; navigates to first assignment detail page

### List Page Filters
Three independent dropdown filters (task, student, status) with debounced state reset on page 1.

### Status Actions
- ASSIGNED → COMPLETED (mark as done)
- ASSIGNED → CANCELLED (cancel assignment)
- Any non-CANCELLED → CANCELLED (via deactivate endpoint)

### Integration with TaskDetailPage
Task detail page now shows an "Asignaciones" section with the count of assignments and a link to the full filtered list.

## 6. Test Coverage

17 tests across 3 test files:

### TaskAssignmentsPage (5 tests)
- Renders page title
- Shows empty state
- Shows create button for users with manage permission
- Renders assignment list with task title and status
- Navigates to detail on click

### TaskAssignmentDetailPage (7 tests)
- Renders assignment status badge
- Renders task title from related task
- Renders student name from related student
- Shows complete button for ASSIGNED status
- Shows cancel button for ASSIGNED status
- Hides complete/cancel for COMPLETED status
- Shows error state for 404

### TaskAssignmentFormPage (5 tests)
- Renders create form
- Shows validation errors on empty submit
- Creates assignment on valid submit
- Renders student list with checkboxes
- Renders task dropdown

## 7. Validation Results

- **TypeScript**: 0 errors (`tsc --noEmit`)
- **ESLint**: 0 errors, 0 warnings
- **Tests**: 113 passed (17 new + 96 existing)
- **Build**: PASS (vite build)

## 8. How to Test

```bash
cd apps/web

# Run all frontend tests
npm run test --workspace @agenda/web

# Run only task-assignment tests
npx vitest run src/modules/task-assignments

# TypeScript check
npx tsc --noEmit

# ESLint
npx eslint src/modules/task-assignments --ext .ts,.tsx

# Build
npx vite build
```
