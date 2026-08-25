# Prompt 36 — Frontend Task Submissions Module

## 1. Overview

Complete frontend Task Submissions module closing the academic flow: Task → Assignment → Submission → Grading → Feedback. Built following the established patterns from existing modules.

## 2. Backend Contract Verified

### Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/api/v1/task-assignments/:id/submission` | `tasks:read` | Create submission for assignment |
| `GET` | `/api/v1/task-assignments/:id/submission` | `tasks:read` | Get submission for assignment |
| `PATCH` | `/api/v1/task-assignments/:id/submission` | `tasks:read` | Update submission content |
| `PATCH` | `/api/v1/submissions/:id/grade` | `grades:manage` | Grade a submission |

**Important:** No list endpoint exists for submissions. The `findAll` method exists in the service but has no controller route. Submissions are accessed per-assignment.

### TaskSubmission Model

- `id` (UUID), `institutionId` (UUID), `taskAssignmentId` (UUID, unique)
- `studentId` (UUID), `status` (TaskSubmissionStatus, default PENDING)
- `content` (Text, optional), `grade` (Decimal(5,2), optional)
- `feedback` (Text, optional), `submittedAt` (DateTime, optional)
- `gradedAt` (DateTime, optional), `createdAt`, `updatedAt`

### TaskSubmissionStatus Enum

`PENDING` | `SUBMITTED` | `LATE` | `GRADED` | `RETURNED`

### Create DTO (CreateSubmissionDto)

- `content` (string, optional, max 5000 chars)

### Update DTO (UpdateSubmissionDto)

- `content` (string, optional, max 5000 chars)

### Grade DTO (GradeSubmissionDto)

- `grade` (string, required, Decimal 0-999.99)
- `feedback` (string, optional, max 2000 chars)

### Business Rules

- **studentId** is derived from the assignment's studentId (NOT from JWT/body)
- **Duplicate prevention**: One submission per task assignment (unique constraint)
- **Late detection**: Server-side comparison of task.dueDate vs current time
- **Cannot modify**: GRADED submissions cannot be updated
- **Cannot re-grade**: GRADED submissions cannot be graded again
- **RETURNED status**: Exists in enum but is not implemented in backend

### Permissions

- `tasks:read` — All roles (SUPER_ADMIN, INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT)
- `tasks:update` — STUDENT role
- `grades:manage` — SUPER_ADMIN, INSTITUTION_ADMIN, TEACHER

## 3. Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/modules/task-submissions/index.ts` | Barrel exports |
| `apps/web/src/modules/task-submissions/hooks/index.ts` | Hook barrel exports |
| `apps/web/src/modules/task-submissions/hooks/useTaskSubmission.ts` | Get submission by assignment ID |
| `apps/web/src/modules/task-submissions/hooks/useCreateTaskSubmission.ts` | Create submission mutation |
| `apps/web/src/modules/task-submissions/hooks/useUpdateTaskSubmission.ts` | Update submission mutation |
| `apps/web/src/modules/task-submissions/hooks/useGradeTaskSubmission.ts` | Grade submission mutation |
| `apps/web/src/modules/task-submissions/pages/TaskSubmissionsPage.tsx` | List page (by task context) |
| `apps/web/src/modules/task-submissions/pages/TaskSubmissionDetailPage.tsx` | Detail page with grading |
| `apps/web/src/modules/task-submissions/pages/TaskSubmissionFormPage.tsx` | Create/update form |
| `apps/web/src/modules/task-submissions/__tests__/task-submissions-page.test.tsx` | List page tests (4 tests) |
| `apps/web/src/modules/task-submissions/__tests__/task-submission-detail-page.test.tsx` | Detail page tests (8 tests) |
| `apps/web/src/modules/task-submissions/__tests__/task-submission-form-page.test.tsx` | Form page tests (5 tests) |

## 4. Files Modified

| File | Change |
|------|--------|
| `apps/web/src/api/types.ts` | Added `TaskSubmissionStatus`, `TASK_SUBMISSION_STATUS_LABELS`, `TaskSubmission`, `CreateTaskSubmissionInput`, `UpdateTaskSubmissionInput`, `GradeTaskSubmissionInput`, `ListTaskSubmissionsParams` |
| `apps/web/src/app/router.tsx` | Added 3 routes: `/task-submissions`, `/task-submissions/:id`, `/task-submissions/:id/new` |
| `apps/web/src/components/layout/Sidebar.tsx` | Added "Entregas" nav entry with `tasks:read` permission |
| `apps/web/src/modules/tasks/pages/TaskDetailPage.tsx` | Added "Ver entregas" button in assignments section |
| `apps/web/src/modules/task-assignments/pages/TaskAssignmentDetailPage.tsx` | Added submission section showing status/grade/feedback |

## 5. Architecture Decisions

### No List Endpoint

The backend has no controller route for listing submissions. The `findAll` method exists in the service but is dead code. Therefore:

- The list page (`TaskSubmissionsPage`) works within task context: user selects a task, then sees all assignments with their submissions
- Each assignment's submission is fetched individually via `useTaskSubmission(assignmentId)`
- This is N+1 but is the only approach with the current backend

### Submission Flow

**Student:**
1. Navigate to task submissions page
2. Select a task
3. See assignments with submission status
4. Click "Crear entrega" on an assignment without submission
5. Enter content and submit
6. View submission detail

**Teacher:**
1. Navigate to task submissions page
2. Select a task
3. See all assignments with submission statuses
4. Click "Ver" to view submission detail
5. Click "Calificar" to grade
6. Enter grade and feedback
7. Submit grading

### Integration Points

- **TaskDetailPage**: Shows "Ver entregas" button in assignments section
- **TaskAssignmentDetailPage**: Shows submission section with status, dates, grade, and feedback
- **Router**: 3 new routes for submissions
- **Sidebar**: "Entregas" nav entry

### React Query Invalidation

- **Create submission**: Invalidates task-submissions, task-assignments, tasks
- **Update submission**: Invalidates task-submissions, task-assignments, tasks
- **Grade submission**: Invalidates task-submissions, task-assignments, tasks

## 6. Test Coverage

17 tests across 3 test files:

### TaskSubmissionsPage (4 tests)
- Renders page title
- Shows task selector prompt when no task selected
- Shows empty state when no assignments for selected task
- Shows task selector exists

### TaskSubmissionDetailPage (8 tests)
- Renders submission status
- Renders submission content
- Renders task title
- Renders student name
- Shows grade button for teacher
- Shows no submission message when submission missing
- Shows error state for 404
- Renders submission date

### TaskSubmissionFormPage (5 tests)
- Renders create form
- Renders task title
- Renders content textarea
- Creates submission on valid submit
- Shows update form when submission exists

## 7. Validation Results

- **TypeScript**: 0 errors (`tsc --noEmit`)
- **ESLint**: 0 errors, 0 warnings
- **Tests**: 130 passed (17 new + 113 existing)
- **Build**: PASS (vite build)

## 8. Known Limitations

1. **No list endpoint**: Submissions cannot be listed globally; must be accessed per-assignment
2. **No return/reopen**: Backend has RETURNED status but no implementation
3. **No file upload**: Content is text-only; file attachments not yet supported
4. **N+1 queries**: List page fetches submission for each assignment individually
5. **Grade is string**: Backend DTO uses string with @IsDecimal, not a number type

## 9. How to Test

```bash
cd apps/web

# Run all frontend tests
npm run test --workspace @agenda/web

# Run only task-submission tests
npx vitest run src/modules/task-submissions

# TypeScript check
npx tsc --noEmit

# ESLint
npx eslint src/modules/task-submissions --ext .ts,.tsx

# Build
npx vite build
```
