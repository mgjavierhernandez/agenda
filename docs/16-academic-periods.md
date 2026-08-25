# 16 - Academic Periods Module

## Overview

The Academic Periods Module provides CRUD operations for academic periods (e.g., semesters, trimesters) within a specific institution (tenant). Academic periods define date ranges for academic activities such as enrollments, grades, and teacher assignments. It follows the same architecture as Students and Courses modules, demonstrating resource-level authorization with tenant isolation at the data layer.

## Architecture

```
Guard Chain:
AccessTokenGuard     → "Who are you?" (JWT → userId)
TenantContextGuard   → "Which institution?" (X-Institution-Id → institutionId)
PermissionGuard      → "What can you do?" (academic-periods:read / academic-periods:manage)
Controller           → HTTP handling
Service              → Business logic + resource-level auth
AuditService         → Audit trail
```

## AcademicPeriod Model

```prisma
model AcademicPeriod {
  id            String               @id @default(uuid()) @db.Uuid
  institutionId String               @map("institution_id") @db.Uuid
  name          String               @db.VarChar(100)
  code          String               @db.VarChar(20)
  startDate     DateTime             @map("start_date") @db.Date
  endDate       DateTime             @map("end_date") @db.Date
  status        AcademicPeriodStatus @default(ACTIVE)
  createdAt     DateTime             @default(now()) @map("created_at")
  updatedAt     DateTime             @updatedAt @map("updated_at")

  institution        Institution         @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  enrollments        Enrollment[]
  teacherAssignments TeacherAssignment[]

  @@unique([institutionId, code])
  @@index([institutionId])
  @@index([institutionId, status])
  @@map("academic_periods")
}
```

### Enums

```prisma
enum AcademicPeriodStatus {
  ACTIVE
  INACTIVE
}
```

### Key Constraints

- **Composite unique**: `(institutionId, code)` — same code allowed across tenants, unique within a tenant
- **Index**: `institutionId` — fast queries scoped to institution
- **Index**: `(institutionId, status)` — filtered queries
- **`ON DELETE RESTRICT`**: Prevents institution deletion when academic periods exist

### Relations

```
Institution       ──1:N── AcademicPeriod
AcademicPeriod    ──1:N── Enrollment
AcademicPeriod    ──1:N── TeacherAssignment
```

## Resource-Level Authorization

### Principle

Every query is scoped by `institutionId` at the Prisma level. The service **never** uses `findUnique({ where: { id } })` without including `institutionId`.

### Implementation

```typescript
// findOne — always scoped
async findOne(institutionId: string, academicPeriodId: string): Promise<AcademicPeriod> {
  const academicPeriod = await this.prisma.academicPeriod.findFirst({
    where: { id: academicPeriodId, institutionId },
  });
  if (!academicPeriod) throw new NotFoundException('Academic period not found');
  return academicPeriod;
}

// create — validates date range and checks duplicate code
async create(institutionId: string, dto: CreateAcademicPeriodDto, userId: string, ipAddress?: string) {
  if (new Date(dto.startDate) >= new Date(dto.endDate)) {
    throw new BadRequestException('Start date must be before end date');
  }
  const existing = await this.prisma.academicPeriod.findFirst({
    where: { institutionId, code: dto.code },
  });
  if (existing) throw new ConflictException(...);
  // ...
}
```

### What This Prevents

| Attack | Defense |
|--------|---------|
| **IDOR/BOLA**: User A accesses User B's academic period | `findFirst` includes `institutionId` — query returns empty → 404 |
| **Body bypass**: Malicious `institutionId` in body | DTO whitelist strips it; `institutionId` always from `X-Institution-Id` header |
| **Cross-tenant search**: Search returns other tenants | `WHERE institutionId = :header_institutionId` enforced at query level |
| **Invalid date range**: startDate >= endDate | Validated in service before create/update |

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `POST` | `/api/v1/academic-periods` | `academic-periods:manage` | Create academic period |
| `GET` | `/api/v1/academic-periods` | `academic-periods:read` | List academic periods (paginated, searchable) |
| `GET` | `/api/v1/academic-periods/:id` | `academic-periods:read` | Get academic period by ID |
| `PATCH` | `/api/v1/academic-periods/:id` | `academic-periods:manage` | Update academic period |
| `PATCH` | `/api/v1/academic-periods/:id/deactivate` | `academic-periods:manage` | Deactivate academic period |

### Query Parameters (List)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | — | Search in name, code (case-insensitive) |

### Request/Response Examples

**Create Academic Period:**
```json
POST /api/v1/academic-periods
X-Institution-Id: <uuid>

{
  "name": "2026 - Periodo 1",
  "code": "2026-P1",
  "startDate": "2026-01-15",
  "endDate": "2026-06-30"
}

→ 201 Created
{
  "id": "uuid",
  "institutionId": "uuid",
  "name": "2026 - Periodo 1",
  "code": "2026-P1",
  "startDate": "2026-01-15T00:00:00.000Z",
  "endDate": "2026-06-30T00:00:00.000Z",
  "status": "ACTIVE",
  "createdAt": "2026-08-21T...",
  "updatedAt": "2026-08-21T..."
}
```

**List Academic Periods:**
```json
GET /api/v1/academic-periods?page=1&limit=10&search=2026
X-Institution-Id: <uuid>

→ 200 OK
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

**Reject Invalid Date Range:**
```json
POST /api/v1/academic-periods
X-Institution-Id: <uuid>

{
  "name": "Invalid Period",
  "code": "INV",
  "startDate": "2026-06-30",
  "endDate": "2026-01-15"
}

→ 400 Bad Request
{
  "statusCode": 400,
  "message": "Start date must be before end date"
}
```

## Permissions

| Code | Module | Description |
|------|--------|-------------|
| `academic-periods:read` | Academic Periods | List and read academic periods |
| `academic-periods:manage` | Academic Periods | CRUD academic periods |

### Role Assignments

| Role | `academic-periods:read` | `academic-periods:manage` |
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
  ↓ checks @RequirePermission('academic-periods:read' or 'academic-periods:manage')
AcademicPeriodsController
  ↓ passes req.tenant.institutionId to service
AcademicPeriodsService
  ↓ uses institutionId in every Prisma query
```

## DTOs

### CreateAcademicPeriodDto
```typescript
{
  name: string;          // required, max 100 chars
  code: string;          // required, max 20 chars
  startDate: string;     // required, ISO date string (YYYY-MM-DD)
  endDate: string;       // required, ISO date string (YYYY-MM-DD)
}
```

### UpdateAcademicPeriodDto
```typescript
{
  name?: string;         // max 100 chars
  code?: string;         // max 20 chars
  startDate?: string;    // ISO date string
  endDate?: string;      // ISO date string
  status?: AcademicPeriodStatus;
}
```

**Note**: `institutionId` is NOT in any DTO. It is stripped by `whitelist: true` and `forbidNonWhitelisted: true` in the global ValidationPipe.

### ListAcademicPeriodsQueryDto
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
| `action` | `ACADEMIC_PERIOD_CREATED`, `ACADEMIC_PERIOD_UPDATED`, `ACADEMIC_PERIOD_DEACTIVATED` |
| `entityType` | `AcademicPeriod` |
| `entityId` | AcademicPeriod UUID |
| `institutionId` | From header |
| `oldValues` | Previous state (for updates) |
| `newValues` | New state |
| `ipAddress` | Request IP (if available) |

## Business Rules

1. **Unique code per tenant** — validated using composite unique `(institutionId, code)`
2. **startDate must be before endDate** — validated in service before create and update
3. **Partial date updates** — when updating only startDate or endDate, the service validates against the existing counterpart
4. **Physical deletion prohibited** — only status change (ACTIVE → INACTIVE)
5. **`institutionId` from header only** — never from request body

## Seed

2 demo academic periods created for Demo School:
- 2026 - Periodo 1 (2026-P1): 2026-01-15 to 2026-06-30
- 2026 - Periodo 2 (2026-P2): 2026-07-15 to 2026-12-15

Uses `findFirst` check for idempotency.

## Tests

### Unit Tests (17 tests — `academic-periods.service.spec.ts`)

| Test | Description |
|------|-------------|
| create | Academic period created with institutionId |
| create | Rejects duplicate code within same tenant |
| create | Rejects startDate >= endDate |
| create | Allows same code in different tenant |
| findOne | Returns academic period scoped to institution |
| findOne | Throws NotFoundException for cross-tenant resource |
| findAll | Returns only current tenant academic periods |
| findAll | Supports pagination |
| findAll | Supports search by name/code |
| update | Updates academic period only in current tenant |
| update | Throws NotFoundException for cross-tenant update |
| update | Cannot modify institutionId |
| update | Rejects duplicate code within same tenant on update |
| update | Rejects startDate >= endDate on update |
| deactivate | Sets status to INACTIVE |
| deactivate | Throws NotFoundException for cross-tenant |

### E2E Tests

See `apps/api/test/academic-periods.e2e-spec.ts` for full E2E test suite.

## Files

```
apps/api/src/modules/academic-periods/
  academic-periods.controller.ts          # REST endpoints
  academic-periods.service.ts             # Business logic + resource-level auth
  academic-periods.service.spec.ts        # 17 unit tests
  academic-periods.module.ts              # Module wiring
  dto/
    create-academic-period.dto.ts         # Create DTO
    update-academic-period.dto.ts         # Update DTO
    list-academic-periods-query.dto.ts    # List query params

apps/api/test/
  academic-periods.e2e-spec.ts            # E2E tests

apps/api/prisma/
  schema.prisma                          # AcademicPeriod model
  migrations/20260822004102_add_mvp_domain_foundation/
    migration.sql                        # Migration
  seed.ts                                # Demo academic periods for demo-school
```

## IDOR/BOLA Review

| # | Query | Description | institutionId? | Status |
|---|-------|-------------|----------------|--------|
| 1 | `academicPeriod.findFirst` | Duplicate code check on create | ✅ `where: { institutionId, code }` | SAFE |
| 2 | `academicPeriod.findFirst` | findOne | ✅ `where: { id, institutionId }` | SAFE |
| 3 | `academicPeriod.findMany` | List academic periods | ✅ `where: { institutionId }` | SAFE |
| 4 | `academicPeriod.count` | Count academic periods | ✅ same where as findMany | SAFE |
| 5 | `academicPeriod.create` | Create academic period | ✅ `data: { institutionId }` | SAFE |
| 6 | `academicPeriod.update` | Update academic period | ⚠️ `where: { id }` — pre-verified at #2 | SAFE |
| 7 | `academicPeriod.findFirst` | Duplicate code check on update | ✅ `where: { institutionId, code, id: { not } }` | SAFE |

**Total: 7 queries, all safe. No IDOR/BOLA vulnerabilities.**
