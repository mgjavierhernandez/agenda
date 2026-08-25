# 15 - School Grades Module

## Overview

The School Grades Module provides CRUD operations for school grade levels (e.g., Primero, Segundo, Tercero) within a specific institution (tenant). School grades represent the educational levels used to organize students and enrollments. It follows the same architecture as Students and Courses modules, demonstrating resource-level authorization with tenant isolation at the data layer.

## Architecture

```
Guard Chain:
AccessTokenGuard     → "Who are you?" (JWT → userId)
TenantContextGuard   → "Which institution?" (X-Institution-Id → institutionId)
PermissionGuard      → "What can you do?" (school-grades:read / school-grades:manage)
Controller           → HTTP handling
Service              → Business logic + resource-level auth
AuditService         → Audit trail
```

## SchoolGrade Model

```prisma
model SchoolGrade {
  id            String            @id @default(uuid()) @db.Uuid
  institutionId String            @map("institution_id") @db.Uuid
  name          String            @db.VarChar(100)
  code          String            @db.VarChar(20)
  sortOrder     Int               @default(0) @map("sort_order")
  status        SchoolGradeStatus @default(ACTIVE)
  createdAt     DateTime          @default(now()) @map("created_at")
  updatedAt     DateTime          @updatedAt @map("updated_at")

  institution Institution  @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  enrollments Enrollment[]

  @@unique([institutionId, code])
  @@index([institutionId])
  @@index([institutionId, status])
  @@map("school_grades")
}
```

### Enums

```prisma
enum SchoolGradeStatus {
  ACTIVE
  INACTIVE
}
```

### Key Constraints

- **Composite unique**: `(institutionId, code)` — same code allowed across tenants, unique within a tenant
- **Index**: `institutionId` — fast queries scoped to institution
- **Index**: `(institutionId, status)` — filtered queries
- **`ON DELETE RESTRICT`**: Prevents institution deletion when school grades exist

### Relations

```
Institution ──1:N── SchoolGrade
SchoolGrade ──1:N── Enrollment
```

## Resource-Level Authorization

### Principle

Every query is scoped by `institutionId` at the Prisma level. The service **never** uses `findUnique({ where: { id } })` without including `institutionId`.

### Implementation

```typescript
// findOne — always scoped
async findOne(institutionId: string, id: string): Promise<SchoolGrade> {
  const schoolGrade = await this.prisma.schoolGrade.findFirst({
    where: { id, institutionId },
  });
  if (!schoolGrade) throw new NotFoundException('School grade not found');
  return schoolGrade;
}

// create — uses composite unique for duplicate check
async create(institutionId: string, dto: CreateSchoolGradeDto, userId: string, ipAddress?: string) {
  const existing = await this.prisma.schoolGrade.findUnique({
    where: {
      institutionId_code: {
        institutionId,
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
| **IDOR/BOLA**: User A accesses User B's school grade | `findFirst` includes `institutionId` — query returns empty → 404 |
| **Body bypass**: Malicious `institutionId` in body | DTO whitelist strips it; `institutionId` always from `X-Institution-Id` header |
| **Cross-tenant search**: Search returns other tenants | `WHERE institutionId = :header_institutionId` enforced at query level |

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `POST` | `/api/v1/school-grades` | `school-grades:manage` | Create school grade |
| `GET` | `/api/v1/school-grades` | `school-grades:read` | List school grades (paginated, searchable) |
| `GET` | `/api/v1/school-grades/:id` | `school-grades:read` | Get school grade by ID |
| `PATCH` | `/api/v1/school-grades/:id` | `school-grades:manage` | Update school grade |
| `PATCH` | `/api/v1/school-grades/:id/deactivate` | `school-grades:manage` | Deactivate school grade |

### Query Parameters (List)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | — | Search in name, code (case-insensitive) |

### Request/Response Examples

**Create School Grade:**
```json
POST /api/v1/school-grades
X-Institution-Id: <uuid>

{
  "name": "Primero",
  "code": "1RO",
  "sortOrder": 1
}

→ 201 Created
{
  "id": "uuid",
  "institutionId": "uuid",
  "name": "Primero",
  "code": "1RO",
  "sortOrder": 1,
  "status": "ACTIVE",
  "createdAt": "2026-08-21T...",
  "updatedAt": "2026-08-21T..."
}
```

**List School Grades:**
```json
GET /api/v1/school-grades?page=1&limit=10&search=Prim
X-Institution-Id: <uuid>

→ 200 OK
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 6,
    "totalPages": 1
  }
}
```

**Note**: Results are ordered by `sortOrder` ascending.

## Permissions

| Code | Module | Description |
|------|--------|-------------|
| `school-grades:read` | School Grades | List and read school grades |
| `school-grades:manage` | School Grades | CRUD school grades |

### Role Assignments

| Role | `school-grades:read` | `school-grades:manage` |
|------|:---:|:---:|
| SUPER_ADMIN | ✅ | ✅ |
| INSTITUTION_ADMIN | ✅ | ✅ |
| TEACHER | ✅ | ❌ |
| PARENT | ❌ | ❌ |
| STUDENT | ❌ | ❌ |

## Guard Chain

```
AccessTokenGuard
  ↓ validates JWT, sets req.user = { userId }
TenantContextGuard
  ↓ validates X-Institution-Id header, sets req.tenant = { institutionId, userInstitutionId }
PermissionGuard
  ↓ checks @RequirePermission('school-grades:read' or 'school-grades:manage')
SchoolGradesController
  ↓ passes req.tenant.institutionId to service
SchoolGradesService
  ↓ uses institutionId in every Prisma query
```

## DTOs

### CreateSchoolGradeDto
```typescript
{
  name: string;          // required, max 100 chars
  code: string;          // required, max 20 chars
  sortOrder?: number;    // optional, integer >= 0, default 0
}
```

### UpdateSchoolGradeDto
```typescript
{
  name?: string;         // max 100 chars
  code?: string;         // max 20 chars
  sortOrder?: number;    // integer >= 0
  status?: SchoolGradeStatus;
}
```

**Note**: `institutionId` is NOT in any DTO. It is stripped by `whitelist: true` and `forbidNonWhitelisted: true` in the global ValidationPipe.

### ListSchoolGradesQueryDto
```typescript
{
  page?: number;         // default 1
  limit?: number;        // default 20, max 100
  search?: string;       // case-insensitive search in name, code
}
```

## Audit Trail

Every mutation is logged to `AuditLog` with:

| Field | Value |
|-------|-------|
| `action` | `SCHOOL_GRADE_CREATED`, `SCHOOL_GRADE_UPDATED`, `SCHOOL_GRADE_DEACTIVATED` |
| `entityType` | `SchoolGrade` |
| `entityId` | SchoolGrade UUID |
| `institutionId` | From header |
| `oldValues` | Previous state (for updates) |
| `newValues` | New state |
| `ipAddress` | Request IP (if available) |

## Business Rules

1. **Unique code per tenant** — validated using composite unique `(institutionId, code)`
2. **sortOrder for ordering** — defaults to 0, used to order results ascending
3. **Physical deletion prohibited** — only status change (ACTIVE → INACTIVE)
4. **`institutionId` from header only** — never from request body

## Seed

6 demo school grades created for Demo School: Preescolar (PRE), Primero (1RO), Segundo (2DO), Tercero (3RO), Cuarto (4TO), Quinto (5TO). Uses `findFirst` check for idempotency.

## Tests

### Unit Tests (14 tests — `school-grades.service.spec.ts`)

| Test | Description |
|------|-------------|
| create | School grade created with institutionId |
| create | Rejects duplicate code within same tenant |
| create | Allows same code in different tenant |
| findOne | Returns school grade scoped to institution |
| findOne | Throws NotFoundException for cross-tenant resource |
| findAll | Returns only current tenant school grades |
| findAll | Supports pagination |
| findAll | Supports search by name/code |
| update | Updates school grade only in current tenant |
| update | Throws NotFoundException for cross-tenant update |
| update | Rejects duplicate code within same tenant on update |
| deactivate | Sets status to INACTIVE |
| deactivate | Throws NotFoundException for cross-tenant |

### E2E Tests

See `apps/api/test/school-grades.e2e-spec.ts` for full E2E test suite.

## Files

```
apps/api/src/modules/school-grades/
  school-grades.controller.ts          # REST endpoints
  school-grades.service.ts             # Business logic + resource-level auth
  school-grades.service.spec.ts        # 14 unit tests
  school-grades.module.ts              # Module wiring
  dto/
    create-school-grade.dto.ts         # Create DTO
    update-school-grade.dto.ts         # Update DTO
    list-school-grades-query.dto.ts    # List query params

apps/api/test/
  school-grades.e2e-spec.ts            # E2E tests

apps/api/prisma/
  schema.prisma                       # SchoolGrade model
  migrations/20260822004102_add_mvp_domain_foundation/
    migration.sql                     # Migration
  seed.ts                             # Demo school grades for demo-school
```

## IDOR/BOLA Review

| # | Query | Description | institutionId? | Status |
|---|-------|-------------|----------------|--------|
| 1 | `schoolGrade.findUnique` | Duplicate check on create | ✅ composite unique | SAFE |
| 2 | `schoolGrade.findFirst` | findOne | ✅ `where: { id, institutionId }` | SAFE |
| 3 | `schoolGrade.findMany` | List school grades | ✅ `where: { institutionId }` | SAFE |
| 4 | `schoolGrade.count` | Count school grades | ✅ same where as findMany | SAFE |
| 5 | `schoolGrade.create` | Create school grade | ✅ `data: { institutionId }` | SAFE |
| 6 | `schoolGrade.update` | Update school grade | ⚠️ `where: { id }` — pre-verified at #2 | SAFE |

**Total: 6 queries, all safe. No IDOR/BOLA vulnerabilities.**
