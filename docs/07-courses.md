# 07 - Courses Module

## Overview

The Courses Module provides CRUD operations for course records within a specific institution (tenant). It follows the exact same architecture as the Students Module, demonstrating resource-level authorization with tenant isolation at the data layer.

## Architecture

```
Guard Chain:
AccessTokenGuard     → "Who are you?" (JWT → userId)
TenantContextGuard   → "Which institution?" (X-Institution-Id → institutionId)
PermissionGuard      → "What can you do?" (courses:read / courses:manage)
Controller           → HTTP handling
Service              → Business logic + resource-level auth
AuditService         → Audit trail
```

## Course Model

```prisma
model Course {
  id            String       @id @default(uuid()) @db.Uuid
  institutionId String       @map("institution_id") @db.Uuid
  code          String       @db.VarChar(50)
  name          String       @db.VarChar(150)
  description   String?      @db.Text
  status        CourseStatus @default(ACTIVE)
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  institution Institution @relation(fields: [institutionId], references: [id], onDelete: Restrict)

  @@unique([institutionId, code])
  @@index([institutionId])
  @@index([institutionId, status])
  @@map("courses")
}
```

### Enums

```prisma
enum CourseStatus {
  ACTIVE
  INACTIVE
}
```

### Key Constraints

- **Composite unique**: `(institutionId, code)` — same code allowed across tenants, unique within a tenant
- **Index**: `institutionId` — fast queries scoped to institution
- **Index**: `(institutionId, status)` — filtered queries
- **`ON DELETE RESTRICT`**: Prevents institution deletion when courses exist

## Resource-Level Authorization

### Principle

Every query is scoped by `institutionId` at the Prisma level. The service **never** uses `findUnique({ where: { id } })` without including `institutionId`.

### Implementation

```typescript
// findOne — always scoped
async findOne(institutionId: string, courseId: string): Promise<Course> {
  const course = await this.prisma.course.findFirst({
    where: {
      id: courseId,
      institutionId,  // ← resource-level tenant scope
    },
  });
  if (!course) throw new NotFoundException('Course not found');
  return course;
}

// create — uses composite unique for duplicate check
async create(institutionId: string, dto: CreateCourseDto, userId: string, ipAddress?: string) {
  const existing = await this.prisma.course.findUnique({
    where: {
      institutionId_code: {
        institutionId,          // ← from header, never from body
        code: dto.code,
      },
    },
  });
  if (existing) throw new ConflictException(...);
  // ...
}
```

### What This Prevents

| Attack | Defense |
|--------|---------|
| **IDOR/BOLA**: User A accesses User B's course | `findFirst` includes `institutionId` — query returns empty → 404 |
| **Body bypass**: Malicious `institutionId` in body | DTO whitelist strips it; `institutionId` always from `X-Institution-Id` header |
| **Cross-tenant search**: Search returns other tenants | `WHERE institutionId = :header_institutionId` enforced at query level |

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `POST` | `/api/v1/courses` | `courses:manage` | Create course |
| `GET` | `/api/v1/courses` | `courses:read` | List courses (paginated, searchable) |
| `GET` | `/api/v1/courses/:id` | `courses:read` | Get course by ID |
| `PATCH` | `/api/v1/courses/:id` | `courses:manage` | Update course |
| `PATCH` | `/api/v1/courses/:id/deactivate` | `courses:manage` | Deactivate course |

### Query Parameters (List)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | — | Search in code, name (case-insensitive) |
| `status` | CourseStatus | — | Filter by status |

### Request/Response Examples

**Create Course:**
```json
POST /api/v1/courses
X-Institution-Id: <uuid>

{
  "code": "MAT-001",
  "name": "Matemáticas",
  "description": "Curso de matemáticas"
}

→ 201 Created
{
  "id": "uuid",
  "institutionId": "uuid",
  "code": "MAT-001",
  "name": "Matemáticas",
  "description": "Curso de matemáticas",
  "status": "ACTIVE",
  "createdAt": "2026-08-21T...",
  "updatedAt": "2026-08-21T..."
}
```

**List Courses:**
```json
GET /api/v1/courses?page=1&limit=10&search=MAT&status=ACTIVE
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
| `courses:read` | Courses | List and read courses |
| `courses:manage` | Courses | CRUD courses |

### Role Assignments

| Role | `courses:read` | `courses:manage` |
|------|:---:|:---:|
| SUPER_ADMIN | ✅ | ✅ |
| INSTITUTION_ADMIN | ✅ | ✅ |
| TEACHER | ✅ | ✅ |
| PARENT | ❌ | ❌ |
| STUDENT | ❌ | ❌ |

## Guard Chain

```
AccessTokenGuard
  ↓ validates JWT, sets req.user = { userId }
TenantContextGuard
  ↓ validates X-Institution-Id header, sets req.tenant = { institutionId, userInstitutionId }
PermissionGuard
  ↓ checks @RequirePermission('courses:read' or 'courses:manage')
CoursesController
  ↓ passes req.tenant.institutionId to service
CoursesService
  ↓ uses institutionId in every Prisma query
```

## DTOs

### CreateCourseDto
```typescript
{
  code: string;          // required, max 50 chars
  name: string;          // required, max 150 chars
  description?: string;  // optional, max 1000 chars
  status?: CourseStatus; // optional, default ACTIVE
}
```

### UpdateCourseDto
```typescript
{
  code?: string;
  name?: string;
  description?: string;
  status?: CourseStatus;
}
```

**Note**: `institutionId` is NOT in any DTO. It is stripped by `whitelist: true` and `forbidNonWhitelisted: true` in the global ValidationPipe.

### ListCoursesQueryDto
```typescript
{
  page?: number;         // default 1
  limit?: number;        // default 20, max 100
  search?: string;       // case-insensitive search in code, name
  status?: CourseStatus; // filter by status
}
```

## Audit Trail

Every mutation is logged to `AuditLog` with:

| Field | Value |
|-------|-------|
| `action` | `COURSE_CREATED`, `COURSE_UPDATED`, `COURSE_DEACTIVATED` |
| `entityType` | `Course` |
| `entityId` | Course UUID |
| `institutionId` | From header |
| `oldValues` | Previous state (for updates) |
| `newValues` | New state |
| `ipAddress` | Request IP (if available) |

## Migration

```sql
-- 20260821105656_add_courses_module/migration.sql
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "courses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "institution_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- Unique constraint
ALTER TABLE "courses"
  ADD CONSTRAINT "courses_institutionId_code_key"
  UNIQUE ("institution_id", "code");

-- Indexes
CREATE INDEX "courses_institutionId_idx" ON "courses"("institution_id");
CREATE INDEX "courses_institutionId_status_idx" ON "courses"("institution_id", "status");

-- Foreign key
ALTER TABLE "courses"
  ADD CONSTRAINT "courses_institutionId_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "institutions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

## Tests

### Unit Tests (14 tests — `courses.service.spec.ts`)

| Test | Description |
|------|-------------|
| create | Course created with institutionId |
| create | Rejects duplicate code within same tenant |
| create | Allows same code in different tenant |
| findOne | Returns course scoped to institution |
| findOne | Throws NotFoundException for wrong institution |
| findAll | Returns only current tenant courses |
| findAll | Supports pagination |
| findAll | Supports search by code/name |
| findAll | Supports filter by status |
| update | Updates course within institution |
| update | Throws NotFoundException for wrong institution |
| update | Cannot modify institutionId |
| update | Rejects duplicate code within same tenant on update |
| deactivate | Sets status to INACTIVE |

### E2E Tests (29 tests — `courses.e2e-spec.ts`)

| Test | Description |
|------|-------------|
| TEST-01 | Admin creates course → 201 |
| TEST-02 | Admin gets course by ID → 200 |
| TEST-03 | Admin lists courses → only current tenant |
| TEST-04 | Teacher with courses:read → 200 |
| TEST-05 | Student without courses:read → 403 |
| TEST-06 | Student without courses:manage → 403 |
| TEST-07 | Admin gets course from other tenant → 404 |
| TEST-07b | Admin updates course from other tenant → 404 |
| TEST-08 | Admin updates course in current tenant → 200 |
| TEST-09 | Admin deactivates course → 200 |
| TEST-09b | Admin deactivates course from other tenant → 404 |
| TEST-10 | Body institutionId rejected by forbidNonWhitelisted → 400 |
| TEST-10b | Body institutionId cannot bypass tenant → 400 |
| TEST-11 | Without access token → 401 |
| TEST-12 | Without X-Institution-Id → 403 |
| TEST-12b | Institution without membership → 403 |
| TEST-13 | Inactive membership → 403 |
| TEST-14 | Inactive institution → 403 |
| TEST-15 | Duplicate code within same tenant → 409 |
| TEST-16 | Same code in different tenant → 201 |
| TEST-17 | Search returns only current tenant results |
| TEST-18 | Pagination returns correct meta |
| TEST-19 | SUPER_ADMIN with membership in A can operate in A |
| TEST-20 | SUPER_ADMIN without membership in B cannot operate in B |

## Files

```
apps/api/src/modules/courses/
  courses.controller.ts          # REST endpoints
  courses.service.ts             # Business logic + resource-level auth
  courses.service.spec.ts        # 14 unit tests
  courses.module.ts              # Module wiring
  dto/
    create-course.dto.ts         # Create DTO
    update-course.dto.ts         # Update DTO
    list-courses-query.dto.ts    # List query params

apps/api/test/
  courses.e2e-spec.ts            # 29 E2E tests

apps/api/prisma/
  schema.prisma                   # Course model
  migrations/20260821105656_add_courses_module/
    migration.sql                 # Migration
  seed.ts                         # Demo courses for demo-school
```

## Comparison with Students Module

| Aspect | Students | Courses |
|--------|----------|---------|
| Unique constraint | `(institutionId, documentType, documentNumber)` | `(institutionId, code)` |
| Status enum | `StudentStatus` | `CourseStatus` |
| Permissions | `students:read`, `students:manage` | `courses:read`, `courses:manage` |
| Search fields | firstName, lastName, documentNumber | code, name |
| Status filter | Not supported in query | Supported in query |
| Delete strategy | Deactivate (PATCH) | Deactivate (PATCH) |
| Audit actions | STUDENT_CREATED/UPDATED/DEACTIVATED | COURSE_CREATED/UPDATED/DEACTIVATED |
| IDOR/BOLA protection | findFirst(id, institutionId) | findFirst(id, institutionId) |
| Guard chain | AccessToken → Tenant → Permission | AccessToken → Tenant → Permission |
