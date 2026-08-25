# 06 - Students Module

## Overview

The Students Module provides CRUD operations for student records within a specific institution (tenant). It demonstrates **resource-level authorization** where tenant isolation is enforced at the data layer, not just the API guard chain.

## Architecture

```
Guard Chain:
AccessTokenGuard     → "Who are you?" (JWT → userId)
TenantContextGuard   → "Which institution?" (X-Institution-Id → institutionId)
PermissionGuard      → "What can you do?" (students:read / students:manage)
Controller           → HTTP handling
Service              → Business logic + resource-level auth
AuditService         → Audit trail
```

## Student Model

```prisma
model Student {
  id             String       @id @default(uuid()) @db.Uuid
  institutionId  String       @map("institution_id") @db.Uuid
  firstName      String       @map("first_name") @db.VarChar(100)
  lastName       String       @map("last_name") @db.VarChar(100)
  documentType   DocumentType @map("document_type")
  documentNumber String       @map("document_number") @db.VarChar(20)
  dateOfBirth    DateTime?    @map("date_of_birth")
  status         StudentStatus @default(ACTIVE)
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  institution Institution @relation(fields: [institutionId], references: [id], onDelete: Restrict)

  @@unique([institutionId, documentType, documentNumber])
  @@unique([id, institutionId])
  @@index([institutionId])
  @@map("students")
}
```

### Enums

```prisma
enum StudentStatus {
  ACTIVE
  INACTIVE
}

enum DocumentType {
  DNI
  PASSPORT
  NATIONAL_ID
  OTHER
}
```

### Key Constraints

- **Composite unique**: `(institutionId, documentType, documentNumber)` — same document number allowed across tenants, unique within a tenant
- **Composite unique**: `(id, institutionId)` — supports efficient tenant-scoped lookups
- **Index**: `institutionId` — fast queries scoped to institution
- **`ON DELETE RESTRICT`**: Prevents institution deletion when students exist

## Resource-Level Authorization

### Principle

Every query is scoped by `institutionId` at the Prisma level. The service **never** uses `findUnique({ where: { id } })` without including `institutionId`.

### Implementation

```typescript
// findOne — always scoped
async findOne(institutionId: string, studentId: string): Promise<Student> {
  const student = await this.prisma.student.findFirst({
    where: {
      id: studentId,
      institutionId,  // ← resource-level tenant scope
    },
  });
  if (!student) throw new NotFoundException('Student not found');
  return student;
}

// create — uses composite unique for duplicate check
async create(institutionId: string, dto: CreateStudentDto, userId: string, ipAddress?: string) {
  const existing = await this.prisma.student.findUnique({
    where: {
      institutionId_documentType_documentNumber: {
        institutionId,          // ← from header, never from body
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
      },
    },
  });
  if (existing) throw new ConflictException(...);
  // ...
}

// findAll — search scoped to institution
const where = { institutionId, ...searchConditions };
```

### What This Prevents

| Attack | Defense |
|--------|---------|
| **IDOR/BOLA**: User A accesses User B's student | `findFirst` includes `institutionId` — query returns empty → 404 |
| **Body bypass**: Malicious `institutionId` in body | DTO whitelist strips it; `institutionId` always from `X-Institution-Id` header |
| **Cross-tenant search**: Search returns other tenants | `WHERE institutionId = :header_institutionId` enforced at query level |

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `POST` | `/api/v1/students` | `students:manage` | Create student |
| `GET` | `/api/v1/students` | `students:read` | List students (paginated, searchable) |
| `GET` | `/api/v1/students/:id` | `students:read` | Get student by ID |
| `PATCH` | `/api/v1/students/:id` | `students:manage` | Update student |
| `PATCH` | `/api/v1/students/:id/deactivate` | `students:manage` | Deactivate student |

### Query Parameters (List)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `search` | string | — | Search in firstName, lastName, documentNumber (case-insensitive) |

### Request/Response Examples

**Create Student:**
```json
POST /api/v1/students
X-Institution-Id: <uuid>

{
  "firstName": "Carlos",
  "lastName": "Mendoza",
  "documentType": "DNI",
  "documentNumber": "40111222",
  "dateOfBirth": "2012-05-20"
}

→ 201 Created
{
  "id": "uuid",
  "institutionId": "uuid",
  "firstName": "Carlos",
  "lastName": "Mendoza",
  "documentType": "DNI",
  "documentNumber": "40111222",
  "dateOfBirth": "2012-05-20T00:00:00.000Z",
  "status": "ACTIVE",
  "createdAt": "2026-08-21T..."
}
```

**List Students:**
```json
GET /api/v1/students?page=1&limit=10&search=Carlos
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
| `students:read` | Students | List and read students |
| `students:manage` | Students | CRUD students and enrollments |

### Role Assignments

- **INSTITUTION_ADMIN**: `students:read` + `students:manage`
- **TEACHER**: `students:read`
- **PARENT**: `students:read`
- **STUDENT**: No student permissions (cannot list other students)

## Guard Chain

```
AccessTokenGuard
  ↓ validates JWT, sets req.user = { userId }
TenantContextGuard
  ↓ validates X-Institution-Id header, sets req.tenant = { institutionId, userInstitutionId }
PermissionGuard
  ↓ checks @RequirePermission('students:read' or 'students:manage')
StudentsController
  ↓ passes req.tenant.institutionId to service
StudentsService
  ↓ uses institutionId in every Prisma query
```

## DTOs

### CreateStudentDto
```typescript
{
  firstName: string;        // required, max 100 chars
  lastName: string;         // required, max 100 chars
  documentType: DocumentType; // required, enum
  documentNumber: string;   // required, max 20 chars
  dateOfBirth?: string;     // optional, ISO date string
}
```

### UpdateStudentDto
```typescript
{
  firstName?: string;
  lastName?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  dateOfBirth?: string;
  status?: StudentStatus;
}
```

**Note**: `institutionId` is NOT in any DTO. It is stripped by `whitelist: true` and `forbidNonWhitelisted: true` in the global ValidationPipe.

### ListStudentsQueryDto
```typescript
{
  page?: number;     // default 1
  limit?: number;    // default 20, max from global config
  search?: string;   // case-insensitive search
}
```

## Audit Trail

Every mutation is logged to `AuditLog` with:

| Field | Value |
|-------|-------|
| `action` | `STUDENT_CREATED`, `STUDENT_UPDATED`, `STUDENT_DEACTIVATED` |
| `entityType` | `Student` |
| `entityId` | Student UUID |
| `institutionId` | From header |
| `oldValues` | Previous state (for updates) |
| `newValues` | New state |
| `ipAddress` | Request IP (if available) |

## Migration

```sql
-- 20260821050000_add_students_module/migration.sql
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "DocumentType" AS ENUM ('DNI', 'PASSPORT', 'NATIONAL_ID', 'OTHER');

CREATE TABLE "students" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "institution_id" UUID NOT NULL,
  "first_name" VARCHAR(100) NOT NULL,
  "last_name" VARCHAR(100) NOT NULL,
  "document_type" "DocumentType" NOT NULL,
  "document_number" VARCHAR(20) NOT NULL,
  "date_of_birth" TIMESTAMP(3),
  "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "students"
  ADD CONSTRAINT "students_institutionId_documentType_documentNumber_key"
  UNIQUE ("institution_id", "document_type", "document_number");

ALTER TABLE "students"
  ADD CONSTRAINT "students_id_institutionId_key"
  UNIQUE ("id", "institution_id");

-- Index
CREATE INDEX "students_institutionId_idx" ON "students"("institution_id");

-- Foreign key
ALTER TABLE "students"
  ADD CONSTRAINT "students_institutionId_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "institutions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE "institutions" ADD COLUMN "students" ...
```

## Tests

### Unit Tests (13 tests — `students.service.spec.ts`)

| Test | Description |
|------|-------------|
| create | Student created with institutionId |
| create | Rejects duplicate document within same tenant |
| create | Allows same document in different tenant |
| findOne | Returns student scoped to institution |
| findOne | Throws NotFoundException for wrong institution |
| findAll | Returns only current tenant students |
| findAll | Supports pagination |
| findAll | Supports search by name |
| update | Updates student within institution |
| update | Throws NotFoundException for wrong institution |
| update | Rejects duplicate document within same tenant |
| deactivate | Sets status to INACTIVE |
| deactivate | Throws NotFoundException for wrong institution |

### E2E Tests (29 tests — `students.e2e-spec.ts`)

| Test | Description |
|------|-------------|
| TEST-01 | Admin creates student → 201 |
| TEST-02 | Admin gets student by ID → 200 |
| TEST-03 | Admin lists students → only current tenant |
| TEST-04 | Teacher with students:read → 200 |
| TEST-05 | Parent with students:read → 200 |
| TEST-06 | Teacher without students:create → 403 |
| TEST-07 | Parent without students:update → 403 |
| TEST-08 | Admin gets student from other tenant → 404 |
| TEST-09 | Admin updates student in current tenant → 200 |
| TEST-09b | Admin updates student from other tenant → 404 |
| TEST-10 | Admin deactivates student → 200 |
| TEST-10b | Admin deactivates student from other tenant → 404 |
| TEST-11 | Body institutionId rejected by forbidNonWhitelisted → 400 |
| TEST-12 | Student without students:read → 403 |
| TEST-13 | Without access token → 401 |
| TEST-14 | Without X-Institution-Id → 403 |
| TEST-14b | Institution without membership → 403 |
| TEST-15 | Inactive membership → 403 |
| TEST-16 | Inactive institution → 403 |
| TEST-17 | Duplicate document within same tenant → 409 |
| TEST-18 | Same document in different tenant → 201 |
| TEST-19 | Search returns only current tenant results |
| TEST-19b | Search is tenant-scoped |
| TEST-20 | Pagination returns correct meta |
| TEST-21 | Body institutionId cannot bypass tenant → 400 |
| TEST-22 | SUPER_ADMIN with membership in A can operate in A |
| TEST-23 | SUPER_ADMIN without membership in B cannot operate in B |

## Files

```
apps/api/src/modules/students/
  students.controller.ts          # REST endpoints
  students.service.ts             # Business logic + resource-level auth
  students.service.spec.ts        # 13 unit tests
  students.module.ts              # Module wiring
  dto/
    create-student.dto.ts         # Create DTO
    update-student.dto.ts         # Update DTO
    list-students-query.dto.ts    # List query params

apps/api/src/common/audit/
  audit.service.ts                # Reusable audit service
  audit.module.ts                 # AuditModule

apps/api/test/
  students.e2e-spec.ts            # 29 E2E tests

apps/api/prisma/
  schema.prisma                   # Student model
  migrations/20260821050000_add_students_module/
    migration.sql                 # Migration
  seed.ts                         # Demo students for demo-school
```
