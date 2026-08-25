# 08 - Subjects Module

## Overview

The Subjects Module provides CRUD operations for subject records (asignaturas/materias) within a specific institution (tenant). It follows the exact same architecture as Students and Courses modules, demonstrating resource-level authorization with tenant isolation at the data layer.

## Architecture

```
Guard Chain:
AccessTokenGuard     → "Who are you?" (JWT → userId)
TenantContextGuard   → "Which institution?" (X-Institution-Id → institutionId)
PermissionGuard      → "What can you do?" (subjects:read / subjects:manage)
Controller           → HTTP handling
Service              → Business logic + resource-level auth
AuditService         → Audit trail
```

## Subject Model

```prisma
model Subject {
  id            String        @id @default(uuid()) @db.Uuid
  institutionId String        @map("institution_id") @db.Uuid
  code          String        @db.VarChar(50)
  name          String        @db.VarChar(150)
  description   String?       @db.Text
  status        SubjectStatus @default(ACTIVE)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  institution Institution @relation(fields: [institutionId], references: [id], onDelete: Restrict)

  @@unique([institutionId, code])
  @@index([institutionId])
  @@index([institutionId, status])
  @@map("subjects")
}
```

### Enums

```prisma
enum SubjectStatus {
  ACTIVE
  INACTIVE
}
```

### Key Constraints

- **Composite unique**: `(institutionId, code)` — same code allowed across tenants, unique within a tenant
- **Index**: `institutionId` — fast queries scoped to institution
- **Index**: `(institutionId, status)` — filtered queries
- **`ON DELETE RESTRICT`**: Prevents institution deletion when subjects exist

## Resource-Level Authorization

### Principle

Every query is scoped by `institutionId` at the Prisma level. The service **never** uses `findUnique({ where: { id } })` without including `institutionId`.

### What This Prevents

| Attack | Defense |
|--------|---------|
| **IDOR/BOLA**: User A accesses User B's subject | `findFirst` includes `institutionId` — query returns empty → 404 |
| **Body bypass**: Malicious `institutionId` in body | DTO whitelist strips it; `institutionId` always from `X-Institution-Id` header |
| **Cross-tenant search**: Search returns other tenants | `WHERE institutionId = :header_institutionId` enforced at query level |

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `POST` | `/api/v1/subjects` | `subjects:manage` | Create subject |
| `GET` | `/api/v1/subjects` | `subjects:read` | List subjects (paginated, searchable) |
| `GET` | `/api/v1/subjects/:id` | `subjects:read` | Get subject by ID |
| `PATCH` | `/api/v1/subjects/:id` | `subjects:manage` | Update subject |
| `PATCH` | `/api/v1/subjects/:id/deactivate` | `subjects:manage` | Deactivate subject |

### Query Parameters (List)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | — | Search in code, name (case-insensitive) |
| `status` | SubjectStatus | — | Filter by status |

### Request/Response Examples

**Create Subject:**
```json
POST /api/v1/subjects
X-Institution-Id: <uuid>

{
  "code": "MAT-S",
  "name": "Matemáticas",
  "description": "Asignatura de matemáticas"
}

→ 201 Created
{
  "id": "uuid",
  "institutionId": "uuid",
  "code": "MAT-S",
  "name": "Matemáticas",
  "description": "Asignatura de matemáticas",
  "status": "ACTIVE",
  "createdAt": "2026-08-21T...",
  "updatedAt": "2026-08-21T..."
}
```

## Permissions

| Code | Module | Description |
|------|--------|-------------|
| `subjects:read` | Subjects | List and read subjects |
| `subjects:manage` | Subjects | CRUD subjects |

Pre-existing in seed (32 permissions). No new permissions created.

### Role Assignments

| Role | `subjects:read` | `subjects:manage` |
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
  ↓ checks @RequirePermission('subjects:read' or 'subjects:manage')
SubjectsController
  ↓ passes req.tenant.institutionId to service
SubjectsService
  ↓ uses institutionId in every Prisma query
```

## DTOs

### CreateSubjectDto
```typescript
{
  code: string;          // required, max 50 chars
  name: string;          // required, max 150 chars
  description?: string;  // optional, max 1000 chars
  status?: SubjectStatus; // optional, default ACTIVE
}
```

### UpdateSubjectDto
```typescript
{
  code?: string;
  name?: string;
  description?: string;
  status?: SubjectStatus;
}
```

**Note**: `institutionId` is NOT in any DTO. It is stripped by `whitelist: true` and `forbidNonWhitelisted: true` in the global ValidationPipe.

### ListSubjectsQueryDto
```typescript
{
  page?: number;          // default 1
  limit?: number;         // default 20, max 100
  search?: string;        // case-insensitive search in code, name
  status?: SubjectStatus; // filter by status
}
```

## Audit Trail

Every mutation is logged to `AuditLog` with:

| Field | Value |
|-------|-------|
| `action` | `SUBJECT_CREATED`, `SUBJECT_UPDATED`, `SUBJECT_DEACTIVATED` |
| `entityType` | `Subject` |
| `entityId` | Subject UUID |
| `institutionId` | From header |
| `oldValues` | Previous state (for updates) |
| `newValues` | New state |
| `ipAddress` | Request IP (if available) |

## Seed

3 demo subjects created for Demo School: MAT-S (Matemáticas), CIE-S (Ciencias Naturales), LEN-S (Lengua y Literatura). Uses `upsert` on composite unique for idempotency.

## Tests

### Unit Tests (15 tests — `subjects.service.spec.ts`)

| Test | Description |
|------|-------------|
| create | Subject created with institutionId |
| create | Rejects duplicate code within same tenant |
| create | Allows same code in different tenant |
| findOne | Returns subject scoped to institution |
| findOne | Throws NotFoundException for wrong institution |
| findAll | Returns only current tenant subjects |
| findAll | Supports pagination |
| findAll | Supports search by code/name |
| findAll | Supports filter by status |
| update | Updates subject within institution |
| update | Throws NotFoundException for wrong institution |
| update | Cannot modify institutionId |
| update | Rejects duplicate code within same tenant on update |
| deactivate | Sets status to INACTIVE |
| deactivate | Throws NotFoundException for cross-tenant |

### E2E Tests (28 tests — `subjects.e2e-spec.ts`)

| Test | Description |
|------|-------------|
| TEST-01 | Admin creates subject → 201 |
| TEST-02 | Teacher with subjects:manage can create → 201 |
| TEST-03 | Admin lists subjects → only current tenant |
| TEST-04 | Teacher with subjects:read → 200 |
| TEST-05 | Student without subjects:read → 403 |
| TEST-06 | Student without subjects:manage → 403 |
| TEST-07 | Admin gets subject from other tenant → 404 |
| TEST-07b | Admin updates subject from other tenant → 404 |
| TEST-08 | Admin updates subject in current tenant → 200 |
| TEST-09 | Admin gets subject by ID → 200 |
| TEST-09b | Admin deactivates subject from other tenant → 404 |
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
apps/api/src/modules/subjects/
  subjects.controller.ts          # REST endpoints
  subjects.service.ts             # Business logic + resource-level auth
  subjects.service.spec.ts        # 15 unit tests
  subjects.module.ts              # Module wiring
  dto/
    create-subject.dto.ts         # Create DTO
    update-subject.dto.ts         # Update DTO
    list-subjects-query.dto.ts    # List query params

apps/api/test/
  subjects.e2e-spec.ts            # 28 E2E tests

apps/api/prisma/
  schema.prisma                   # Subject model
  migrations/20260821112148_add_subjects_module/
    migration.sql                 # Migration
  seed.ts                         # Demo subjects for demo-school
```

## Comparison with Students and Courses

| Aspect | Students | Courses | Subjects |
|--------|----------|---------|----------|
| Unique constraint | `(institutionId, documentType, documentNumber)` | `(institutionId, code)` | `(institutionId, code)` |
| Status enum | `StudentStatus` | `CourseStatus` | `SubjectStatus` |
| Permissions | `students:read`, `students:manage` | `courses:read`, `courses:manage` | `subjects:read`, `subjects:manage` |
| Search fields | firstName, lastName, documentNumber | code, name | code, name |
| Status filter | Not supported | Supported | Supported |
| Delete strategy | Deactivate (PATCH) | Deactivate (PATCH) | Deactivate (PATCH) |
| Audit actions | STUDENT_* | COURSE_* | SUBJECT_* |
| IDOR/BOLA protection | findFirst(id, institutionId) | findFirst(id, institutionId) | findFirst(id, institutionId) |
