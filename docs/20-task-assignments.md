# 20 - Task Assignments Module

## Overview

The Task Assignments Module links a published Task to one or more Students within the same institution. Assignments are created by teachers or admins, scoped to the tenant, and validated against active enrollments. Each assignment is unique per (task, student) pair.

## Architecture

```
Guard Chain: AccessTokenGuard → TenantContextGuard → PermissionGuard → Controller → Service → Prisma
```

## Prisma Model

```prisma
model TaskAssignment {
  id             String                 @id @default(uuid()) @db.Uuid
  institutionId  String                 @map("institution_id") @db.Uuid
  taskId         String                 @map("task_id") @db.Uuid
  studentId      String                 @map("student_id") @db.Uuid
  enrollmentId   String?                @map("enrollment_id") @db.Uuid
  status         TaskAssignmentStatus   @default(ASSIGNED)
  assignedAt     DateTime               @default(now()) @map("assigned_at")
  createdAt      DateTime               @default(now()) @map("created_at")
  updatedAt      DateTime               @updatedAt @map("updated_at")

  institution    Institution            @relation(...)
  task           Task                   @relation(...)
  student        Student                @relation(...)
  enrollment     Enrollment?            @relation(...)
  submission     TaskSubmission?        @relation(...)

  @@unique([taskId, studentId])
}
```

### Enums

- **TaskAssignmentStatus**: `ASSIGNED`, `COMPLETED`, `CANCELLED`

### Relations

| Relation | Target | Required | On Delete |
|----------|--------|----------|-----------|
| institution | Institution | Yes | Restrict |
| task | Task | Yes | Restrict |
| student | Student | Yes | Restrict |
| enrollment | Enrollment | No | — |
| submission | TaskSubmission | No (1:1) | — |

### Indexes

- `institutionId`
- `[institutionId, taskId]`
- `[institutionId, studentId]`
- `taskId`

## Business Rules

1. **Task must be PUBLISHED** — Assignments can only be created for tasks with status `PUBLISHED`.
2. **Duplicate prevention** — A (task, student) pair is unique. Duplicates are silently skipped.
3. **Student must exist in institution** — The student record must belong to the same `institutionId`.
4. **Enrollment validation** — If `enrollmentId` is not provided, the service auto-assigns all students enrolled in the task's course (status `ACTIVE`).
5. **Tenant isolation** — All queries are scoped by `institutionId`.
6. **Status transitions** — `ASSIGNED → COMPLETED`, `ASSIGNED → CANCELLED` via PATCH.

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/api/v1/task-assignments` | `tasks:manage` | Create assignments |
| GET | `/api/v1/task-assignments` | `tasks:read` | List assignments (paginated) |
| GET | `/api/v1/task-assignments/:id` | `tasks:read` | Get assignment by ID |
| PATCH | `/api/v1/task-assignments/:id` | `tasks:manage` | Update status |
| PATCH | `/api/v1/task-assignments/:id/deactivate` | `tasks:manage` | Set CANCELLED |

### POST /api/v1/task-assignments

**Body (CreateTaskAssignmentDto):**

```typescript
{
  taskId: string;          // required, UUID
  studentIds?: string[];   // optional, UUID[], max 100
  enrollmentId?: string;   // optional, UUID
}
```

- If `studentIds` is empty or omitted, auto-assigns all students enrolled in the task's course.
- Returns `TaskAssignment[]` (array of created assignments).

### GET /api/v1/task-assignments

**Query (ListTaskAssignmentsQueryDto):**

```typescript
{
  taskId?: string;         // filter by task
  studentId?: string;      // filter by student
  status?: TaskAssignmentStatus; // filter by status
  page?: number;           // default 1
  limit?: number;          // default 20
}
```

**Response:**

```typescript
{
  data: TaskAssignment[];
  meta: { page, limit, total, totalPages };
}
```

### PATCH /api/v1/task-assignments/:id

**Body (UpdateTaskAssignmentDto):**

```typescript
{
  status?: TaskAssignmentStatus;  // ASSIGNED | COMPLETED | CANCELLED
}
```

## RBAC

| Role | `tasks:read` | `tasks:manage` |
|------|:---:|:---:|
| SUPER_ADMIN | ✅ | ✅ |
| INSTITUTION_ADMIN | ✅ | ✅ |
| TEACHER | ✅ | ✅ |
| PARENT | ✅ | — |
| STUDENT | ✅ | — |

- Teachers can create assignments only if they are assigned to the task's course via `TeacherAssignment`.
- Students and parents can read assignments but cannot create or modify them.

## Audit Events

| Event | When |
|-------|------|
| `TASK_ASSIGNED` | After successfully creating one or more assignments |

## Security

- **Tenant isolation** — All Prisma queries include `institutionId`.
- **IDOR/BOLA protection** — `findFirst({ where: { id, institutionId } })` for every lookup.
- **Body whitelist** — `forbidNonWhitelisted: true` prevents `institutionId` injection.
- **Task validation** — Tasks from other tenants or in non-PUBLISHED status are rejected.

## Seed

Demo seed creates 4 TaskAssignments:
- Tasks 1 and 2 × Students 1 and 2
- Status: `ASSIGNED`
- `enrollmentId` linked when a matching enrollment exists

## Files

```
apps/api/src/modules/task-assignments/
  task-assignments.controller.ts
  task-assignments.service.ts
  task-assignments.module.ts
  task-assignments.service.spec.ts
  dto/task-assignment.dto.ts
```
