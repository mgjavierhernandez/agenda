# 19 - Teacher Assignments Module

## Overview

The Teacher Assignments Module provides CRUD operations for teacher-course-subject assignments within a specific institution (tenant). A teacher assignment links a teacher user to a specific course, subject, and academic period. This module demonstrates resource-level authorization with quadruple relation validation: the teacher user, course, subject, and academic period must all belong to the same tenant before creating an assignment.

## Architecture

`
Guard Chain:
AccessTokenGuard     -> "Who are you?" (JWT -> userId)
TenantContextGuard   -> "Which institution?" (X-Institution-Id -> institutionId)
PermissionGuard      -> "What can you do?" (teacher-assignments:read / teacher-assignments:manage)
Controller           -> HTTP handling
Service              -> Business logic + resource-level auth + relation validation
AuditService         -> Audit trail
`

## TeacherAssignment Model

`prisma
model TeacherAssignment {
  id               String                  @id @default(uuid()) @db.Uuid
  institutionId    String                  @map("institution_id") @db.Uuid
  teacherUserId    String                  @map("teacher_user_id") @db.Uuid
  courseId         String                  @map("course_id") @db.Uuid
  subjectId        String                  @map("subject_id") @db.Uuid
  academicPeriodId String                  @map("academic_period_id") @db.Uuid
  status           TeacherAssignmentStatus @default(ACTIVE)
  createdAt        DateTime                @default(now()) @map("created_at")
  updatedAt        DateTime                @updatedAt @map("updated_at")

  institution    Institution    @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  teacherUser    User           @relation(fields: [teacherUserId], references: [id], onDelete: Restrict)
  course         Course         @relation(fields: [courseId], references: [id], onDelete: Restrict)
  subject        Subject        @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  academicPeriod AcademicPeriod @relation(fields: [academicPeriodId], references: [id], onDelete: Restrict)

  @@unique([institutionId, teacherUserId, courseId, subjectId, academicPeriodId])
  @@index([institutionId])
  @@index([institutionId, teacherUserId])
  @@index([institutionId, courseId])
  @@index([institutionId, subjectId])
  @@index([institutionId, academicPeriodId])
  @@index([institutionId, status])
  @@map("teacher_assignments")
}
`

### Enums

`prisma
enum TeacherAssignmentStatus {
  ACTIVE
  INACTIVE
}
`

### Key Constraints

- **Composite unique**: (institutionId, teacherUserId, courseId, subjectId, academicPeriodId) -- same teacher-course-subject-period combination unique within a tenant
- **Index**: institutionId -- fast queries scoped to institution
- **Index**: (institutionId, teacherUserId) -- queries by teacher
- **Index**: (institutionId, courseId) -- queries by course
- **Index**: (institutionId, subjectId) -- queries by subject
- **Index**: (institutionId, academicPeriodId) -- queries by period
- **Index**: (institutionId, status) -- filtered queries
- **ON DELETE RESTRICT**: Prevents deletion of referenced resources when assignments exist

### Relations

`
Institution      --1:N-- TeacherAssignment
User (teacher)   --1:N-- TeacherAssignment
Course           --1:N-- TeacherAssignment
Subject          --1:N-- TeacherAssignment
AcademicPeriod   --1:N-- TeacherAssignment
`

## Resource-Level Authorization + Quadruple Relation Validation

### Principle

Every query is scoped by institutionId at the Prisma level. Additionally, creating an assignment validates that the teacher user has an ACTIVE membership in the institution, and that the course, subject, and academic period all belong to the same tenant.

### Implementation

`	ypescript
// create -- validates teacher membership + 3 resources + duplicate
async create(institutionId, dto, userId, ip?) {
  const teacherMembership = await this.prisma.userInstitution.findFirst({
    where: { userId: dto.teacherUserId, institutionId, status: 'ACTIVE' },
  });
  if (!teacherMembership) throw new ForbiddenException('Teacher user does not belong to this institution');

  const [course, subject, academicPeriod] = await Promise.all([
    this.prisma.course.findFirst({ where: { id: dto.courseId, institutionId } }),
    this.prisma.subject.findFirst({ where: { id: dto.subjectId, institutionId } }),
    this.prisma.academicPeriod.findFirst({ where: { id: dto.academicPeriodId, institutionId } }),
  ]);
  if (!course) throw new NotFoundException('Course not found in this institution');
  if (!subject) throw new NotFoundException('Subject not found in this institution');
  if (!academicPeriod) throw new NotFoundException('Academic period not found in this institution');

  const existing = await this.prisma.teacherAssignment.findUnique({
    where: {
      institutionId_teacherUserId_courseId_subjectId_academicPeriodId: {
        institutionId, teacherUserId: dto.teacherUserId, courseId: dto.courseId,
        subjectId: dto.subjectId, academicPeriodId: dto.academicPeriodId,
      },
    },
  });
  if (existing) throw new ConflictException('Teacher assignment already exists for this combination');
  // ...
}

// findOne -- always scoped
async findOne(institutionId: string, id: string): Promise<TeacherAssignment> {
  const assignment = await this.prisma.teacherAssignment.findFirst({
    where: { id, institutionId },
  });
  if (!assignment) throw new NotFoundException('Teacher assignment not found');
  return assignment;
}
`

### What This Prevents

| Attack | Defense |
|--------|---------|
| **IDOR/BOLA**: Access assignment from another tenant | indFirst includes institutionId -> 404 |
| **Cross-tenant teacher**: Assign teacher from tenant B | userInstitution.findFirst validates ACTIVE membership -> 403 |
| **Cross-tenant resources**: Use course/subject/period from tenant B | indFirst checks each resource against institutionId -> 404 |
| **Duplicate assignment** | Composite unique constraint -> 409 |
| **Body bypass**: Send institutionId in body | DTO whitelist strips it; institutionId from header only |

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | /api/v1/teacher-assignments | 	eacher-assignments:manage | Create assignment (validates teacher + 3 resources) |
| GET | /api/v1/teacher-assignments | 	eacher-assignments:read | List assignments (paginated, filterable) |
| GET | /api/v1/teacher-assignments/:id | 	eacher-assignments:read | Get assignment by ID |
| PATCH | /api/v1/teacher-assignments/:id | 	eacher-assignments:manage | Update assignment |
| PATCH | /api/v1/teacher-assignments/:id/deactivate | 	eacher-assignments:manage | Deactivate assignment |

### Query Parameters (List)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |
| 	eacherUserId | UUID | -- | Filter by teacher |
| courseId | UUID | -- | Filter by course |
| subjectId | UUID | -- | Filter by subject |
| cademicPeriodId | UUID | -- | Filter by academic period |

### Request/Response Examples

**Create Teacher Assignment:**
`json
POST /api/v1/teacher-assignments
X-Institution-Id: <uuid>

{
  "teacherUserId": "uuid",
  "courseId": "uuid",
  "subjectId": "uuid",
  "academicPeriodId": "uuid"
}

-> 201 Created
{
  "id": "uuid",
  "institutionId": "uuid",
  "teacherUserId": "uuid",
  "courseId": "uuid",
  "subjectId": "uuid",
  "academicPeriodId": "uuid",
  "status": "ACTIVE",
  "createdAt": "2026-08-21T...",
  "updatedAt": "2026-08-21T..."
}
`

**List Assignments with Filters:**
`json
GET /api/v1/teacher-assignments?teacherUserId=uuid&courseId=uuid&page=1&limit=10
X-Institution-Id: <uuid>

-> 200 OK
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
`

**Reject Teacher Not in Institution:**
`json
POST /api/v1/teacher-assignments
X-Institution-Id: <uuid>

{
  "teacherUserId": "teacher-from-other-tenant",
  "courseId": "uuid",
  "subjectId": "uuid",
  "academicPeriodId": "uuid"
}

-> 403 Forbidden
{
  "statusCode": 403,
  "message": "Teacher user does not belong to this institution"
}
`

## Permissions

| Code | Module | Description |
|------|--------|-------------|
| 	eacher-assignments:read | Teacher Assignments | List and read teacher assignments |
| 	eacher-assignments:manage | Teacher Assignments | CRUD teacher assignments |

### Role Assignments

| Role | 	eacher-assignments:read | 	eacher-assignments:manage |
|------|:---:|:---:|
| SUPER_ADMIN | Yes | Yes |
| INSTITUTION_ADMIN | Yes | Yes |
| TEACHER | Yes | No |
| PARENT | No | No |
| STUDENT | No | No |

## Guard Chain

`
AccessTokenGuard
  validates JWT, sets req.user = { userId }
TenantContextGuard
  validates X-Institution-Id header, sets req.tenant = { institutionId, userInstitutionId }
PermissionGuard
  checks @RequirePermission('teacher-assignments:read' or 'teacher-assignments:manage')
TeacherAssignmentsController
  passes req.tenant.institutionId to service
TeacherAssignmentsService
  validates teacher membership + 3 resources, uses institutionId in every Prisma query
`

## DTOs

### CreateTeacherAssignmentDto
`	ypescript
{
  teacherUserId: string;     // required, UUID
  courseId: string;          // required, UUID
  subjectId: string;         // required, UUID
  academicPeriodId: string;  // required, UUID
}
`

### UpdateTeacherAssignmentDto
`	ypescript
{
  status?: TeacherAssignmentStatus;
}
`

**Note**: institutionId is NOT in any DTO. It is stripped by whitelist: true and orbidNonWhitelisted: true in the global ValidationPipe.

### ListTeacherAssignmentsQueryDto
`	ypescript
{
  page?: number;             // default 1
  limit?: number;            // default 20, max 100
  teacherUserId?: string;    // filter by teacher (UUID)
  courseId?: string;         // filter by course (UUID)
  subjectId?: string;        // filter by subject (UUID)
  academicPeriodId?: string; // filter by academic period (UUID)
}
`

## Audit Trail

Every mutation is logged to AuditLog with:

| Field | Value |
|-------|-------|
| ction | TEACHER_ASSIGNMENT_CREATED, TEACHER_ASSIGNMENT_UPDATED, TEACHER_ASSIGNMENT_DEACTIVATED |
| entityType | TeacherAssignment |
| entityId | TeacherAssignment UUID |
| institutionId | From header |
| oldValues | Previous state (for updates) |
|
ewValues | New state |
| ipAddress | Request IP (if available) |

## Business Rules

1. **Teacher membership required** -- teacher user must have ACTIVE membership in the institution
2. **All referenced resources must belong to the same tenant** -- validated before create (3 resources in parallel)
3. **No duplicate assignment** -- composite unique (institutionId, teacherUserId, courseId, subjectId, academicPeriodId)
4. **Only status can be updated** -- teacherUserId, courseId, subjectId, and academicPeriodId are immutable after creation
5. **Physical deletion prohibited** -- only status change (ACTIVE -> INACTIVE)
6. **institutionId from header only** -- never from request body

## Seed

Up to 2 demo teacher assignments created for Demo School, assigning the teacher user to the first 2 courses with the first subject in academic period "2026-P1". Uses indUnique check for idempotency.

## Tests

### Unit Tests (15 tests -- 	eacher-assignments.service.spec.ts)

| Test | Description |
|------|-------------|
| create | Teacher assignment created successfully |
| create | Throws ForbiddenException if teacher not in tenant |
| create | Throws NotFoundException if course not found |
| create | Throws NotFoundException if subject not found |
| create | Throws NotFoundException if academicPeriod not found |
| create | Throws ConflictException for duplicate assignment |
| findOne | Returns a teacher assignment |
| findOne | Throws NotFoundException if not found |
| findOne | Throws NotFoundException for cross-tenant access |
| findAll | Returns paginated results scoped to tenant |
| findAll | Supports filter by teacherUserId |
| findAll | Supports filter by courseId |
| findAll | Supports filter by subjectId |
| findAll | Supports filter by academicPeriodId |
| findAll | Respects pagination params |
| update | Updates the status |
| update | Throws NotFoundException if assignment not found |
| deactivate | Sets status to INACTIVE |

### E2E Tests

See pps/api/test/teacher-assignments.e2e-spec.ts for full E2E test suite.

## Files

`
apps/api/src/modules/teacher-assignments/
  teacher-assignments.controller.ts          # REST endpoints
  teacher-assignments.service.ts             # Business logic + relation validation
  teacher-assignments.service.spec.ts        # 15+ unit tests
  teacher-assignments.module.ts              # Module wiring
  dto/
    create-teacher-assignment.dto.ts         # Create DTO
    update-teacher-assignment.dto.ts         # Update DTO
    list-teacher-assignments-query.dto.ts    # List query params

apps/api/test/
  teacher-assignments.e2e-spec.ts            # E2E tests

apps/api/prisma/
  schema.prisma                             # TeacherAssignment model
  migrations/20260822004102_add_mvp_domain_foundation/
    migration.sql                           # Migration
  seed.ts                                   # Demo teacher assignments for demo-school
`

## IDOR/BOLA Review

| # | Query | Description | institutionId? | Status |
|---|-------|-------------|----------------|--------|
| 1 | userInstitution.findFirst | Validate teacher membership | Yes where: { userId, institutionId, status: 'ACTIVE' } | SAFE |
| 2 | course.findFirst | Validate course exists in tenant | Yes where: { id, institutionId } | SAFE |
| 3 | subject.findFirst | Validate subject exists in tenant | Yes where: { id, institutionId } | SAFE |
| 4 | cademicPeriod.findFirst | Validate academic period exists in tenant | Yes where: { id, institutionId } | SAFE |
| 5 | 	eacherAssignment.findUnique | Check duplicate assignment | Yes composite unique with institutionId | SAFE |
| 6 | 	eacherAssignment.create | Create assignment | Yes data: { institutionId } | SAFE |
| 7 | 	eacherAssignment.findMany | List assignments | Yes where: { institutionId } | SAFE |
| 8 | 	eacherAssignment.count | Count assignments | Yes same where as findMany | SAFE |
| 9 | 	eacherAssignment.findFirst | findOne | Yes where: { id, institutionId } | SAFE |
| 10 | 	eacherAssignment.findFirst | Update ownership check | Yes where: { id, institutionId } | SAFE |
| 11 | 	eacherAssignment.update | Update assignment | Warning where: { id } -- pre-verified at #10 | SAFE |

**Total: 11 queries, all safe. No IDOR/BOLA vulnerabilities.**
