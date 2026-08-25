# 18 - Enrollments Module

## Overview

The Enrollments Module provides CRUD operations for student enrollments within a specific institution (tenant). An enrollment links a student to a course, school grade, and academic period. This module demonstrates resource-level authorization with **quadruple relation validation** — all four referenced resources (Student, Course, SchoolGrade, AcademicPeriod) must belong to the same tenant before creating an enrollment.

## Architecture

```
Guard Chain:
AccessTokenGuard     → "Who are you?" (JWT → userId)
TenantContextGuard   → "Which institution?" (X-Institution-Id → institutionId)
PermissionGuard      → "What can you do?" (enrollments:read / enrollments:manage)
Controller           → HTTP handling
Service              → Business logic + resource-level auth + relation validation
AuditService         → Audit trail
```

## Enrollment Model

```prisma
model Enrollment {
  id               String           @id @default(uuid()) @db.Uuid
  institutionId    String           @map("institution_id") @db.Uuid
  studentId        String           @map("student_id") @db.Uuid
  courseId         String           @map("course_id") @db.Uuid
  schoolGradeId    String           @map("school_grade_id") @db.Uuid
  academicPeriodId String           @map("academic_period_id") @db.Uuid
  status           EnrollmentStatus @default(ACTIVE)
  enrolledAt       DateTime         @default(now()) @map("enrolled_at")
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt @map("updated_at")

  institution    Institution    @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  student        Student        @relation(fields: [studentId], references: [id], onDelete: Restrict)
  course         Course         @relation(fields: [courseId], references: [id], onDelete: Restrict)
  schoolGrade    SchoolGrade    @relation(fields: [schoolGradeId], references: [id], onDelete: Restrict)
  academicPeriod AcademicPeriod @relation(fields: [academicPeriodId], references: [id], onDelete: Restrict)

  @@unique([institutionId, studentId, courseId, academicPeriodId])
  @@index([institutionId])
  @@index([institutionId, studentId])
  @@index([institutionId, courseId])
  @@index([institutionId, schoolGradeId])
  @@index([institutionId, academicPeriodId])
  @@index([institutionId, status])
  @@map("enrollments")
}
```

### Enums

```prisma
enum EnrollmentStatus {
  ACTIVE
  INACTIVE
  WITHDRAWN
}
```

### Key Constraints

- **Composite unique**: `(institutionId, studentId, courseId, academicPeriodId)` — same student-course-period combination unique within a tenant
- **Index**: `institutionId` — fast queries scoped to institution
- **Index**: `(institutionId, studentId)` — queries by student
- **Index**: `(institutionId, courseId)` — queries by course
- **Index**: `(institutionId, schoolGradeId)` — queries by school grade
- **Index**: `(institutionId, academicPeriodId)` — queries by period
- **Index**: `(institutionId, status)` — filtered queries
- **`ON DELETE RESTRICT`**: Prevents deletion of referenced resources when enrollments exist

### Relations

```
Institution      ──1:N── Enrollment
Student          ──1:N── Enrollment
Course           ──1:N── Enrollment
SchoolGrade      ──1:N── Enrollment
AcademicPeriod   ──1:N── Enrollment
```

## Resource-Level Authorization + Quadruple Relation Validation

### Principle

Every query is scoped by `institutionId` at the Prisma level. Additionally, creating an enrollment validates that all four referenced resources (Student, Course, SchoolGrade, AcademicPeriod) belong to the same tenant.

### Implementation

```typescript
// Relation validation — all resources must be in the same tenant
async create(institutionId, dto, userId, ipAddress?) {
  const [student, course, schoolGrade, academicPeriod] = await Promise.all([
    this.prisma.student.findFirst({ where: { id: dto.studentId, institutionId } }),
    this.prisma.course.findFirst({ where: { id: dto.courseId, institutionId } }),
    this.prisma.schoolGrade.findFirst({ where: { id: dto.schoolGradeId, institutionId } }),
    this.prisma.academicPeriod.findFirst({ where: { id: dto.academicPeriodId, institutionId } }),
  ]);

  if (!student) throw new NotFoundException('Student not found in this institution');
  if (!course) throw new NotFoundException('Course not found in this institution');
  if (!schoolGrade) throw new NotFoundException('School grade not found in this institution');
  if (!academicPeriod) throw new NotFoundException('Academic period not found in this institution');

  // Check duplicate enrollment
  const existing = await this.prisma.enrollment.findUnique({
    where: {
      institutionId_studentId_courseId_academicPeriodId: {
        institutionId, studentId: dto.studentId, courseId: dto.courseId, academicPeriodId: dto.academicPeriodId,
      },
    },
  });
  if (existing) throw new ConflictException('Student is already enrolled in this course for this academic period');
  // ...
}
```

### What This Prevents

| Attack | Defense |
|--------|---------|
| **IDOR/BOLA**: Access enrollment from another tenant | `findFirst` includes `institutionId` → 404 |
| **Cross-tenant relations**: Use Student from tenant B | `validateRelations` checks each resource against `institutionId` → 404 |
| **Body bypass**: Send `institutionId` in body | DTO whitelist strips it; `institutionId` from header only |
| **Duplicate enrollment** | Composite unique constraint `(institutionId, studentId, courseId, academicPeriodId)` → 409 |

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `POST` | `/api/v1/enrollments` | `enrollments:manage` | Create enrollment (validates all 4 relations) |
| `GET` | `/api/v1/enrollments` | `enrollments:read` | List enrollments (paginated, filterable) |
| `GET` | `/api/v1/enrollments/:id` | `enrollments:read` | Get enrollment by ID |
| `PATCH` | `/api/v1/enrollments/:id` | `enrollments:manage` | Update enrollment |
| `PATCH` | `/api/v1/enrollments/:id/deactivate` | `enrollments:manage` | Deactivate enrollment |

### Query Parameters (List)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `studentId` | UUID | — | Filter by student |
| `courseId` | UUID | — | Filter by course |
| `schoolGradeId` | UUID | — | Filter by school grade |
| `academicPeriodId` | UUID | — | Filter by academic period |

### Request/Response Examples

**Create Enrollment:**
```json
POST /api/v1/enrollments
X-Institution-Id: <uuid>

{
  "studentId": "uuid",
  "courseId": "uuid",
  "schoolGradeId": "uuid",
  "academicPeriodId": "uuid"
}

→ 201 Created
{
  "id": "uuid",
  "institutionId": "uuid",
  "studentId": "uuid",
  "courseId": "uuid",
  "schoolGradeId": "uuid",
  "academicPeriodId": "uuid",
  "status": "ACTIVE",
  "enrolledAt": "2026-08-21T...",
  "createdAt": "2026-08-21T...",
  "updatedAt": "2026-08-21T..."
}
```

**List Enrollments with Filters:**
```json
GET /api/v1/enrollments?studentId=uuid&academicPeriodId=uuid&page=1&limit=10
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

**Reject Cross-Tenant Student:**
```json
POST /api/v1/enrollments
X-Institution-Id: <uuid>

{
  "studentId": "student-from-other-tenant",
  "courseId": "uuid",
  "schoolGradeId": "uuid",
  "academicPeriodId": "uuid"
}

→ 404 Not Found
{
  "statusCode": 404,
  "message": "Student not found in this institution"
}
```

## Permissions

| Code | Module | Description |
|------|--------|-------------|
| `enrollments:read` | Enrollments | List and read enrollments |
| `enrollments:manage` | Enrollments | CRUD enrollments |

### Role Assignments

| Role | `enrollments:read` | `enrollments:manage` |
|------|:---:|:---:|
| SUPER_ADMIN | ✅ | ✅ |
| INSTITUTION_ADMIN | ✅ | ✅ |
| TEACHER | ✅ | ❌ |
| PARENT | ✅ | ❌ |
| STUDENT | ✅ | ❌ |

## Guard Chain

```
AccessTokenGuard
  ↓ validates JWT, sets req.user = { userId }
TenantContextGuard
  ↓ validates X-Institution-Id header, sets req.tenant = { institutionId, userInstitutionId }
PermissionGuard
  ↓ checks @RequirePermission('enrollments:read' or 'enrollments:manage')
EnrollmentsController
  ↓ passes req.tenant.institutionId to service
EnrollmentsService
  ↓ validates 4 relations, uses institutionId in every Prisma query
```

## DTOs

### CreateEnrollmentDto
```typescript
{
  studentId: string;        // required, UUID
  courseId: string;         // required, UUID
  schoolGradeId: string;    // required, UUID
  academicPeriodId: string; // required, UUID
}
```

### UpdateEnrollmentDto
```typescript
{
  status?: EnrollmentStatus;
}
```

**Note**: `institutionId` is NOT in any DTO. It is stripped by `whitelist: true` and `forbidNonWhitelisted: true` in the global ValidationPipe.

### ListEnrollmentsQueryDto
```typescript
{
  page?: number;            // default 1
  limit?: number;           // default 20, max 100
  studentId?: string;       // filter by student (UUID)
  courseId?: string;        // filter by course (UUID)
  schoolGradeId?: string;   // filter by school grade (UUID)
  academicPeriodId?: string; // filter by academic period (UUID)
}
```

## Audit Trail

Every mutation is logged to `AuditLog` with:

| Field | Value |
|-------|-------|
| `action` | `ENROLLMENT_CREATED`, `ENROLLMENT_UPDATED`, `ENROLLMENT_DEACTIVATED` |
| `entityType` | `Enrollment` |
| `entityId` | Enrollment UUID |
| `institutionId` | From header |
| `oldValues` | Previous state (for updates) |
| `newValues` | New state |
| `ipAddress` | Request IP (if available) |

## Business Rules

1. **All referenced resources must belong to the same tenant** — validated before create (4 resources in parallel)
2. **No duplicate enrollment** — composite unique `(institutionId, studentId, courseId, academicPeriodId)`
3. **Only status can be updated** — student, course, schoolGrade, and academicPeriod are immutable after creation
4. **Physical deletion prohibited** — only status change (ACTIVE → INACTIVE/WITHDRAWN)
5. **`institutionId` from header only** — never from request body

## Seed

Up to 2 demo enrollments created for Demo School, enrolling the first 2 students in the first course with school grade "Primero" (1RO) and academic period "2026-P1". Uses `findUnique` check for idempotency.

## Tests

### Unit Tests (16 tests — `enrollments.service.spec.ts`)

| Test | Description |
|------|-------------|
| create | Enrollment created with institutionId |
| create | Rejects duplicate enrollment within same tenant |
| create | Throws NotFoundException for student not found cross-tenant |
| create | Throws NotFoundException for course not found |
| create | Throws NotFoundException for schoolGrade not found |
| create | Throws NotFoundException for academicPeriod not found |
| findOne | Returns enrollment scoped to institution |
| findOne | Throws NotFoundException for cross-tenant resource |
| findAll | Returns only current tenant enrollments |
| findAll | Supports pagination |
| findAll | Supports filter by studentId |
| findAll | Supports filter by courseId |
| findAll | Supports filter by schoolGradeId |
| findAll | Supports filter by academicPeriodId |
| update | Updates enrollment only in current tenant |
| update | Throws NotFoundException for cross-tenant update |
| deactivate | Sets status to INACTIVE |

### E2E Tests

See `apps/api/test/enrollments.e2e-spec.ts` for full E2E test suite.

## Files

```
apps/api/src/modules/enrollments/
  enrollments.controller.ts          # REST endpoints
  enrollments.service.ts             # Business logic + relation validation
  enrollments.service.spec.ts        # 16 unit tests
  enrollments.module.ts              # Module wiring
  dto/
    create-enrollment.dto.ts         # Create DTO
    update-enrollment.dto.ts         # Update DTO
    list-enrollments-query.dto.ts    # List query params

apps/api/test/
  enrollments.e2e-spec.ts            # E2E tests

apps/api/prisma/
  schema.prisma                      # Enrollment model
  migrations/20260822004102_add_mvp_domain_foundation/
    migration.sql                    # Migration
  seed.ts                            # Demo enrollments for demo-school
```

## IDOR/BOLA Review

| # | Query | Description | institutionId? | Status |
|---|-------|-------------|----------------|--------|
| 1 | `student.findFirst` | Validate student exists in tenant | ✅ `where: { id, institutionId }` | SAFE |
| 2 | `course.findFirst` | Validate course exists in tenant | ✅ `where: { id, institutionId }` | SAFE |
| 3 | `schoolGrade.findFirst` | Validate school grade exists in tenant | ✅ `where: { id, institutionId }` | SAFE |
| 4 | `academicPeriod.findFirst` | Validate academic period exists in tenant | ✅ `where: { id, institutionId }` | SAFE |
| 5 | `enrollment.findUnique` | Check duplicate enrollment | ✅ composite unique with institutionId | SAFE |
| 6 | `enrollment.create` | Create enrollment | ✅ `data: { institutionId }` | SAFE |
| 7 | `enrollment.findMany` | List enrollments | ✅ `where: { institutionId }` | SAFE |
| 8 | `enrollment.count` | Count enrollments | ✅ same where as findMany | SAFE |
| 9 | `enrollment.findFirst` | findOne | ✅ `where: { id, institutionId }` | SAFE |
| 10 | `enrollment.findFirst` | Update ownership check | ✅ `where: { id, institutionId }` | SAFE |
| 11 | `enrollment.update` | Update enrollment | ⚠️ `where: { id }` — pre-verified at #10 | SAFE |

**Total: 11 queries, all safe. No IDOR/BOLA vulnerabilities.**
