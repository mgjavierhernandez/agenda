# 21 - Task Submissions Module

## Overview

The Task Submissions Module allows students to submit work for a TaskAssignment and enables teachers/admins to grade those submissions. Each TaskAssignment has at most one TaskSubmission (one-to-one). The module handles late detection, duplicate prevention, update policies, and grading.

## Architecture

```
Guard Chain: AccessTokenGuard -> TenantContextGuard -> PermissionGuard -> Controller -> Service -> Prisma
```

## Prisma Model

```prisma
model TaskSubmission {
  id               String               @id @default(uuid()) @db.Uuid
  institutionId    String               @map("institution_id") @db.Uuid
  taskAssignmentId String               @map("task_assignment_id") @db.Uuid
  studentId        String               @map("student_id") @db.Uuid
  status           TaskSubmissionStatus @default(PENDING)
  content          String?              @db.Text
  grade            Decimal?             @db.Decimal(5,2)
  feedback         String?              @db.Text
  submittedAt      DateTime?            @map("submitted_at")
  gradedAt         DateTime?            @map("graded_at")
  createdAt        DateTime             @default(now()) @map("created_at")
  updatedAt        DateTime             @updatedAt @map("updated_at")

  institution    Institution    @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  taskAssignment TaskAssignment @relation(fields: [taskAssignmentId], references: [id], onDelete: Restrict)
  student        Student        @relation(fields: [studentId], references: [id], onDelete: Restrict)

  @@unique([taskAssignmentId])
}
```

### Enums

- **TaskSubmissionStatus**: `PENDING`, `SUBMITTED`, `LATE`, `GRADED`, `RETURNED`

### Relations

| Relation | Target | Required | On Delete |
|----------|--------|----------|-----------|
| institution | Institution | Yes | Restrict |
| taskAssignment | TaskAssignment | Yes (1:1) | Restrict |
| student | Student | Yes | Restrict |

### Indexes

- `institutionId`
- `[institutionId, taskAssignmentId]`
- `[institutionId, studentId]`

## Lifecycle

```
PENDING -> SUBMITTED  (on-time submission)
PENDING -> LATE       (late submission, past dueDate)
SUBMITTED -> GRADED   (teacher grades)
LATE -> GRADED        (teacher grades)
SUBMITTED -> SUBMITTED (student updates content)
LATE -> LATE          (student updates content)
GRADED                (terminal, no changes allowed)
```

## Business Rules

1. **One submission per assignment** -- The `@@unique([taskAssignmentId])` constraint enforces this. Duplicate submissions return `409 Conflict`.
2. **Late detection** -- On creation, if `task.dueDate < now()`, status is set to `LATE` instead of `SUBMITTED`.
3. **Update policy** -- Students can update content on non-graded submissions. Status reverts to `SUBMITTED`.
4. **Grading** -- Teachers set `grade` (Decimal 5,2) and optional `feedback`. Status becomes `GRADED` and `gradedAt` is set.
5. **Graded is terminal** -- Graded submissions cannot be modified or re-graded.
6. **Tenant isolation** -- All queries scoped by `institutionId`.

## API Endpoints

### Student Endpoints (nested under TaskAssignments)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/api/v1/task-assignments/:id/submission` | `tasks:read` | Submit work |
| GET | `/api/v1/task-assignments/:id/submission` | `tasks:read` | Get submission for assignment |
| PATCH | `/api/v1/task-assignments/:id/submission` | `tasks:read` | Update submission content |

### Grading Endpoint

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| PATCH | `/api/v1/submissions/:id/grade` | `grades:manage` | Grade a submission |

### POST /api/v1/task-assignments/:id/submission

**Body (CreateSubmissionDto):**

```typescript
{
  content?: string;  // optional, max 5000 chars
}
```

Returns `TaskSubmission` with status `SUBMITTED` or `LATE`.

### PATCH /api/v1/task-assignments/:id/submission

**Body (UpdateSubmissionDto):**

```typescript
{
  content?: string;  // optional, max 5000 chars
}
```

Returns updated `TaskSubmission`. Rejects if status is `GRADED`.

### PATCH /api/v1/submissions/:id/grade

**Body (GradeSubmissionDto):**

```typescript
{
  grade: string;      // required, Decimal(5,2) as string
  feedback?: string;  // optional, max 2000 chars
}
```

Returns graded `TaskSubmission`. Rejects if already graded.

## RBAC

| Role | Create/Update Submission | Grade |
|------|:---:|:---:|
| SUPER_ADMIN | via tasks:read | via grades:manage |
| INSTITUTION_ADMIN | via tasks:read | via grades:manage |
| TEACHER | via tasks:read | via grades:manage |
| PARENT | — | — |
| STUDENT | ✅ (tasks:read) | — |

Students use `tasks:read` to submit (the permission check is on the assignment endpoint, not submission-specific). Grading requires `grades:manage`.

## Audit Events

| Event | When |
|-------|------|
| `TASK_SUBMITTED` | Student creates a submission |
| `TASK_SUBMISSION_UPDATED` | Student updates submission content |
| `TASK_GRADED` | Teacher grades a submission |

## Security

- **Tenant isolation** -- All Prisma queries include `institutionId`.
- **IDOR/BOLA protection** -- `findFirst({ where: { id, institutionId } })` for every lookup.
- **Body whitelist** -- `forbidNonWhitelisted: true`.
- **Assignment validation** -- Submission is only possible for existing assignments in the same tenant.
- **Grade terminal state** -- Once graded, no further modifications are allowed.

## Seed

Demo seed creates 2 TaskSubmissions:
- For the first 2 TaskAssignments
- Status: `LATE` if `dueDate < now()`, otherwise `SUBMITTED`
- Content: `'Entrega de demostracion'`

## Files

```
apps/api/src/modules/task-submissions/
  task-submissions.controller.ts
  task-submissions.service.ts
  task-submissions.module.ts
  task-submissions.service.spec.ts
  dto/task-submission.dto.ts
```
