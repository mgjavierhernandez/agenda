# 09 - Grades Module

## Overview

The Grades Module provides CRUD operations for student grade records within a specific institution (tenant). It validates that all referenced resources (Student, Course, Subject) belong to the same tenant before creating or updating grades. This module demonstrates resource-level authorization with additional relation validation.

## Architecture

```
Guard Chain:
AccessTokenGuard     → "Who are you?" (JWT → userId)
TenantContextGuard   → "Which institution?" (X-Institution-Id → institutionId)
PermissionGuard      → "What can you do?" (grades:read / grades:manage)
Controller           → HTTP handling
Service              → Business logic + resource-level auth + relation validation
AuditService         → Audit trail
```

## Grade Model

```prisma
model Grade {
  id             String       @id @default(uuid()) @db.Uuid
  institutionId  String       @map("institution_id") @db.Uuid
  studentId      String       @map("student_id") @db.Uuid
  courseId        String       @map("course_id") @db.Uuid
  subjectId      String       @map("subject_id") @db.Uuid
  value          Decimal      @db.Decimal(5, 2)
  period         String       @db.VarChar(50)
  evaluationType String?      @map("evaluation_type") @db.VarChar(50)
  description    String?      @db.Text
  status         GradeStatus  @default(ACTIVE)
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  institution Institution @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  student     Student     @relation(fields: [studentId], references: [id], onDelete: Restrict)
  course      Course      @relation(fields: [courseId], references: [id], onDelete: Restrict)
  subject     Subject     @relation(fields: [subjectId], references: [id], onDelete: Restrict)

  @@index([institutionId])
  @@index([institutionId, studentId])
  @@index([institutionId, courseId])
  @@index([institutionId, subjectId])
  @@index([institutionId, status])
  @@map("grades")
}
```

### Enums

```prisma
enum GradeStatus {
  ACTIVE
  INACTIVE
}
```

### Key Design Decisions

1. **No unique constraint on (institutionId, studentId, courseId, subjectId, period)** — Multiple evaluations per student/course/subject/period are allowed (e.g., Parcial, Final).
2. **evaluationType field** (optional) — Differentiates evaluations within the same period (e.g., "Parcial", "Final", "Quiz").
3. **Grade range** — Validated in service: 0.00 to 5.00 (temporary scale until institutional configuration).
4. **All foreign keys use `onDelete: Restrict`** — Prevents accidental deletion of academic history.

### Relations

```
Institution ──1:N── Grade
Student     ──1:N── Grade
Course      ──1:N── Grade
Subject     ──1:N── Grade
```

## Resource-Level Authorization + Relation Validation

### Principle

Every query is scoped by `institutionId` at the Prisma level. Additionally, creating or updating a grade validates that all referenced resources (Student, Course, Subject) belong to the same tenant.

### Implementation

```typescript
// Relation validation — all resources must be in the same tenant
private async validateRelations(institutionId, studentId, courseId, subjectId) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId },
  });
  if (!student) throw new NotFoundException('Student not found in this institution');

  const course = await prisma.course.findFirst({
    where: { id: courseId, institutionId },
  });
  if (!course) throw new NotFoundException('Course not found in this institution');

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, institutionId },
  });
  if (!subject) throw new NotFoundException('Subject not found in this institution');
}

// findOne — always scoped
async findOne(institutionId: string, gradeId: string) {
  const grade = await prisma.grade.findFirst({
    where: { id: gradeId, institutionId },
  });
  if (!grade) throw new NotFoundException('Grade not found');
  return grade;
}
```

### What This Prevents

| Attack | Defense |
|--------|---------|
| **IDOR/BOLA**: Access grade from another tenant | `findFirst` includes `institutionId` → 404 |
| **Cross-tenant relations**: Use Student from tenant B | `validateRelations` checks each resource against `institutionId` → 404 |
| **Body bypass**: Send `institutionId` in body | DTO whitelist strips it; `institutionId` from header only |
| **Resource creation with foreign resources** | All three relations validated before create/update |

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `POST` | `/api/v1/grades` | `grades:manage` | Create grade (validates all relations) |
| `GET` | `/api/v1/grades` | `grades:read` | List grades (paginated, filterable) |
| `GET` | `/api/v1/grades/:id` | `grades:read` | Get grade by ID |
| `PATCH` | `/api/v1/grades/:id` | `grades:manage` | Update grade |
| `PATCH` | `/api/v1/grades/:id/deactivate` | `grades:manage` | Deactivate grade |

### Query Parameters (List)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | — | Search in period, evaluationType, description |
| `status` | GradeStatus | — | Filter by status |
| `studentId` | UUID | — | Filter by student |
| `courseId` | UUID | — | Filter by course |
| `subjectId` | UUID | — | Filter by subject |
| `period` | string | — | Filter by period |

### Request/Response Examples

**Create Grade:**
```json
POST /api/v1/grades
X-Institution-Id: <uuid>

{
  "studentId": "uuid",
  "courseId": "uuid",
  "subjectId": "uuid",
  "value": 4.25,
  "period": "Q1-2026",
  "evaluationType": "Parcial",
  "description": "Examen parcial de matemáticas"
}

→ 201 Created
{
  "id": "uuid",
  "institutionId": "uuid",
  "studentId": "uuid",
  "courseId": "uuid",
  "subjectId": "uuid",
  "value": "4.25",
  "period": "Q1-2026",
  "evaluationType": "Parcial",
  "description": "Examen parcial de matemáticas",
  "status": "ACTIVE",
  "createdAt": "2026-08-21T...",
  "updatedAt": "2026-08-21T..."
}
```

**List Grades with Filters:**
```json
GET /api/v1/grades?studentId=uuid&courseId=uuid&period=Q1-2026&page=1&limit=10
X-Institution-Id: <uuid>

→ 200 OK
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

## Permissions

| Code | Module | Description |
|------|--------|-------------|
| `grades:read` | Grades | List and read grades |
| `grades:manage` | Grades | CRUD grades |

Pre-existing in seed (32 permissions). No new permissions created.

### Role Assignments

| Role | `grades:read` | `grades:manage` |
|------|:---:|:---:|
| SUPER_ADMIN | ✅ | ✅ |
| INSTITUTION_ADMIN | ✅ | ✅ |
| TEACHER | ✅ | ✅ |
| PARENT | ✅ | ❌ |
| STUDENT | ✅ | ❌ |

**Note**: PARENT and STUDENT have `grades:read` only — can view their own grades but not create/modify them.

## Guard Chain

```
AccessTokenGuard
  ↓ validates JWT, sets req.user = { userId }
TenantContextGuard
  ↓ validates X-Institution-Id header, sets req.tenant = { institutionId, userInstitutionId }
PermissionGuard
  ↓ checks @RequirePermission('grades:read' or 'grades:manage')
GradesController
  ↓ passes req.tenant.institutionId to service
GradesService
  ↓ validates relations, uses institutionId in every Prisma query
```

## DTOs

### CreateGradeDto
```typescript
{
  studentId: string;          // required, UUID
  courseId: string;           // required, UUID
  subjectId: string;          // required, UUID
  value: number;             // required, 0.00 – 5.00
  period: string;            // required, max 50 chars
  evaluationType?: string;   // optional, max 50 chars
  description?: string;      // optional, max 1000 chars
  status?: GradeStatus;      // optional, default ACTIVE
}
```

### UpdateGradeDto
```typescript
{
  studentId?: string;
  courseId?: string;
  subjectId?: string;
  value?: number;            // 0.00 – 5.00
  period?: string;
  evaluationType?: string;
  description?: string;
  status?: GradeStatus;
}
```

**Note**: `institutionId` is NOT in any DTO. It is stripped by `whitelist: true` and `forbidNonWhitelisted: true` in the global ValidationPipe.

### ListGradesQueryDto
```typescript
{
  page?: number;          // default 1
  limit?: number;         // default 20, max 100
  search?: string;        // case-insensitive search
  status?: GradeStatus;   // filter by status
  studentId?: string;     // filter by student (UUID)
  courseId?: string;      // filter by course (UUID)
  subjectId?: string;     // filter by subject (UUID)
  period?: string;        // filter by period
}
```

## Audit Trail

Every mutation is logged to `AuditLog` with:

| Field | Value |
|-------|-------|
| `action` | `GRADE_CREATED`, `GRADE_UPDATED`, `GRADE_DEACTIVATED` |
| `entityType` | `Grade` |
| `entityId` | Grade UUID |
| `institutionId` | From header |
| `oldValues` | Previous state (for updates) |
| `newValues` | New state |
| `ipAddress` | Request IP (if available) |

## Business Rules

1. **Grade range**: 0.00 to 5.00 (validated in DTO with `@Min(0)` and `@Max(5)`)
2. **All referenced resources must belong to the same tenant** — validated before create/update
3. **Multiple evaluations per period allowed** — no unique constraint on (student, course, subject, period)
4. **Physical deletion prohibited** — only status change (ACTIVE → INACTIVE)

## Seed

16 demo grade records created for Demo School using 2 students × 2 courses × 2 subjects × 2 periods. Uses findFirst check for idempotency.

## Tests

### Unit Tests (20 tests — `grades.service.spec.ts`)

| Test | Description |
|------|-------------|
| create | Grade created with institutionId |
| create | Rejects student from another tenant |
| create | Rejects course from another tenant |
| create | Rejects subject from another tenant |
| findOne | Returns grade scoped to institution |
| findOne | Throws NotFoundException for wrong institution |
| findAll | Returns only current tenant grades |
| findAll | Supports pagination |
| findAll | Supports filter by studentId |
| findAll | Supports filter by courseId |
| findAll | Supports filter by subjectId |
| findAll | Supports filter by period |
| findAll | Supports filter by status |
| update | Updates grade within institution |
| update | Throws NotFoundException for wrong institution |
| update | Cannot modify institutionId |
| update | Validates relations when studentId changes |
| update | Rejects update with student from another tenant |
| deactivate | Sets status to INACTIVE |
| deactivate | Throws NotFoundException for cross-tenant |

### E2E Tests (32 tests — `grades.e2e-spec.ts`)

| Test | Description |
|------|-------------|
| TEST-01 | Admin creates grade → 201 |
| TEST-02 | Teacher with grades:manage can create → 201 |
| TEST-03 | Admin lists grades → only current tenant |
| TEST-04 | Parent with grades:read → 200 |
| TEST-05 | Student with grades:read → 200 |
| TEST-06 | Parent without grades:manage → 403 |
| TEST-07 | Admin gets grade from other tenant → 404 |
| TEST-07b | Admin updates grade from other tenant → 404 |
| TEST-08 | Admin updates grade in current tenant → 200 |
| TEST-09 | Admin gets grade by ID → 200 |
| TEST-09b | Admin deactivates grade from other tenant → 404 |
| TEST-10 | Body institutionId rejected → 400 |
| TEST-10b | Body institutionId cannot bypass tenant → 400 |
| TEST-11 | Without access token → 401 |
| TEST-12 | Without X-Institution-Id → 403 |
| TEST-12b | Institution without membership → 403 |
| TEST-13 | Inactive membership → 403 |
| TEST-14 | Inactive institution → 403 |
| TEST-18 | Pagination returns correct meta |
| TEST-19 | SUPER_ADMIN with membership in A can operate in A |
| TEST-20 | SUPER_ADMIN without membership in B cannot operate in B |
| — | Rejects student from another tenant → 404 |
| — | Rejects course from another tenant → 404 |
| — | Rejects subject from another tenant → 404 |
| — | Rejects missing required fields → 400 |
| — | Rejects invalid value range → 400 |
| — | Filter by studentId |
| — | Filter by courseId |
| — | Filter by subjectId |

## Files

```
apps/api/src/modules/grades/
  grades.controller.ts          # REST endpoints
  grades.service.ts             # Business logic + relation validation + resource-level auth
  grades.service.spec.ts        # 20 unit tests
  grades.module.ts              # Module wiring
  dto/
    create-grade.dto.ts         # Create DTO
    update-grade.dto.ts         # Update DTO
    list-grades-query.dto.ts    # List query params

apps/api/test/
  grades.e2e-spec.ts            # 32 E2E tests

apps/api/prisma/
  schema.prisma                   # Grade model
  migrations/20260821114756_add_grades_module/
    migration.sql                 # Migration
  seed.ts                         # Demo grades for demo-school
```

## IDOR/BOLA Review

| # | Query | Description | institutionId? | Status |
|---|-------|-------------|----------------|--------|
| 1 | `student.findFirst` | Validate student exists in tenant | ✅ `where: { id, institutionId }` | SAFE |
| 2 | `course.findFirst` | Validate course exists in tenant | ✅ `where: { id, institutionId }` | SAFE |
| 3 | `subject.findFirst` | Validate subject exists in tenant | ✅ `where: { id, institutionId }` | SAFE |
| 4 | `grade.create` | Create grade | ✅ `data: { institutionId }` | SAFE |
| 5 | `grade.findMany` | List grades | ✅ `where: { institutionId }` | SAFE |
| 6 | `grade.count` | Count grades | ✅ same where as findMany | SAFE |
| 7 | `grade.findFirst` | findOne | ✅ `where: { id, institutionId }` | SAFE |
| 8 | `grade.findFirst` | Update ownership check | ✅ `where: { id, institutionId }` | SAFE |
| 9 | `grade.update` | Update grade | ⚠️ `where: { id }` — pre-verified at #8 | SAFE |

**Total: 9 queries, all safe. No IDOR/BOLA vulnerabilities.**

## Comparison with Other Modules

| Aspect | Students | Courses | Subjects | Grades |
|--------|----------|---------|----------|--------|
| Unique constraint | `(instId, docType, docNumber)` | `(instId, code)` | `(instId, code)` | None (multi-eval) |
| Foreign relations | Institution | Institution | Institution | Institution + Student + Course + Subject |
| Relation validation | None | None | None | Yes (3 resources) |
| Status enum | `StudentStatus` | `CourseStatus` | `SubjectStatus` | `GradeStatus` |
| Value validation | — | — | — | 0.00 – 5.00 |
| Delete strategy | Deactivate | Deactivate | Deactivate | Deactivate |
| Parent/Student read | ❌ | ❌ | ❌ | ✅ |
