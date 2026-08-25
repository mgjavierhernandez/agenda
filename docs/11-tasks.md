# 11 - Tasks Module

## Overview

The Tasks Module provides CRUD operations and lifecycle management for academic task records (homework, assignments) within a specific institution (tenant). Tasks follow a lifecycle (DRAFT -> PUBLISHED -> CLOSED -> INACTIVE) and support student assignment and submission workflows.

## Architecture

```
Guard Chain: AccessTokenGuard -> TenantContextGuard -> PermissionGuard -> Controller -> Service -> Prisma
```

## Task Model

```prisma
model Task {
  id             String       @id @default(uuid()) @db.Uuid
  institutionId  String       @map("institution_id") @db.Uuid
  courseId        String       @map("course_id") @db.Uuid
  subjectId      String       @map("subject_id") @db.Uuid
  title          String       @db.VarChar(200)
  description    String?      @db.Text
  dueDate        DateTime     @map("due_date")
  status         TaskStatus   @default(DRAFT)
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  institution    Institution  @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  course         Course       @relation(fields: [courseId], references: [id], onDelete: Restrict)
  subject        Subject      @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  taskAssignments TaskAssignment[]
}
```

### TaskStatus

| Value | Description |
|-------|-------------|
| `DRAFT` | Created but not visible to students/parents. Editable. |
| `PUBLISHED` | Visible to assigned students/parents. Can be assigned. |
| `CLOSED` | No longer accepting submissions. |
| `INACTIVE` | Soft-deleted. Not visible to anyone. |

### Lifecycle Transitions

```
DRAFT    -> PUBLISHED  (publish endpoint)
DRAFT    -> INACTIVE   (deactivate endpoint)
PUBLISHED -> CLOSED    (close endpoint)
PUBLISHED -> INACTIVE  (deactivate endpoint)
CLOSED   -> INACTIVE   (deactivate endpoint)
INACTIVE -> (terminal)
```

**Rules:**
- Only DRAFT tasks can be edited (title, description, course, subject, dueDate).
- Only DRAFT tasks can be published.
- Only PUBLISHED tasks can be closed.
- Any non-INACTIVE task can be deactivated.

### Relations

| Relation | Target | Required | On Delete |
|----------|--------|----------|-----------|
| institution | Institution | Yes | Restrict |
| course | Course | Yes | Restrict |
| subject | Subject | Yes | Restrict |
| taskAssignments | TaskAssignment[] | No | — |

### Indexes

- `institutionId`
- `[institutionId, courseId]`
- `[institutionId, subjectId]`
- `[institutionId, status]`
- `[institutionId, dueDate]`

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/api/v1/tasks` | `tasks:manage` | Create task (DRAFT) |
| GET | `/api/v1/tasks` | `tasks:read` | List tasks (paginated) |
| GET | `/api/v1/tasks/:id` | `tasks:read` | Get task by ID |
| PATCH | `/api/v1/tasks/:id` | `tasks:manage` | Update task (DRAFT only) |
| PATCH | `/api/v1/tasks/:id/publish` | `tasks:manage` | DRAFT -> PUBLISHED |
| PATCH | `/api/v1/tasks/:id/close` | `tasks:manage` | PUBLISHED -> CLOSED |
| PATCH | `/api/v1/tasks/:id/deactivate` | `tasks:manage` | -> INACTIVE |

### POST /api/v1/tasks

**Body (CreateTaskDto):**

```typescript
{
  title: string;        // required, 3-200 chars
  description?: string; // optional
  courseId: string;     // required, UUID
  subjectId: string;    // required, UUID
  dueDate: string;      // required, ISO 8601 date string
}
```

Always creates with status `DRAFT`.

### GET /api/v1/tasks

**Query (ListTasksQueryDto):**

```typescript
{
  page?: number;           // default 1
  limit?: number;          // default 20, max 100
  search?: string;         // full-text on title/description
  status?: TaskStatus;     // DRAFT | PUBLISHED | CLOSED | INACTIVE
  courseId?: string;       // UUID filter
  subjectId?: string;      // UUID filter
  dueDateFrom?: string;    // ISO date lower bound
  dueDateTo?: string;      // ISO date upper bound
}
```

Default sort: `dueDate ASC`.

### PATCH /api/v1/tasks/:id

**Body (UpdateTaskDto):**

```typescript
{
  title?: string;
  description?: string;
  courseId?: string;
  subjectId?: string;
  dueDate?: string;
}
```

Only works on DRAFT tasks. Returns `400` for non-DRAFT tasks.

### PATCH /api/v1/tasks/:id/publish

No body required. Transitions DRAFT -> PUBLISHED. Returns `400` if not DRAFT.

### PATCH /api/v1/tasks/:id/close

No body required. Transitions PUBLISHED -> CLOSED. Returns `400` if not PUBLISHED.

### PATCH /api/v1/tasks/:id/deactivate

No body required. Transitions any non-INACTIVE status to INACTIVE.

## Teacher Authorization

Teachers can create and manage tasks. The service validates that the teacher is assigned to the task's course via `TeacherAssignment`:

1. Check if user has TEACHER role in the institution.
2. If TEACHER, verify a `TeacherAssignment` exists for `(teacherUserId, courseId)` with status `ACTIVE`.
3. If no assignment found, throw `403 Forbidden`.

## Permissions

| Role | `tasks:read` | `tasks:manage` |
|------|:---:|:---:|
| SUPER_ADMIN | Y | Y |
| INSTITUTION_ADMIN | Y | Y |
| TEACHER | Y | Y |
| PARENT | Y | - |
| STUDENT | Y | - |

## Visibility Rules

- **Admins/Teachers**: See all tasks in the institution (all statuses).
- **Parents/Students**: The current implementation returns all tasks (status filtering is available via query parameter). Visibility by enrollment is deferred to a future phase.

## Validation

- Course and Subject must exist in the same institution (`validateRelations()`).
- Cross-tenant course/subject references return `404`.
- Body `institutionId` is rejected by `forbidNonWhitelisted`.
- Title: required, 3-200 chars.
- dueDate: required, valid ISO 8601.

## Audit Events

| Event | When |
|-------|------|
| `TASK_CREATED` | Task created (DRAFT) |
| `TASK_UPDATED` | Task fields updated |
| `TASK_PUBLISHED` | DRAFT -> PUBLISHED |
| `TASK_CLOSED` | PUBLISHED -> CLOSED |
| `TASK_DEACTIVATED` | Any -> INACTIVE |

## Seed

Demo seed creates 4 tasks:
- All with status `PUBLISHED`
- Assigned to demo course and subject
- Due dates spread across future dates

## Files

```
apps/api/src/modules/tasks/
  tasks.controller.ts
  tasks.service.ts
  tasks.service.spec.ts
  tasks.module.ts
  dto/create-task.dto.ts
  dto/update-task.dto.ts
  dto/list-tasks-query.dto.ts

apps/api/test/tasks.e2e-spec.ts
```
