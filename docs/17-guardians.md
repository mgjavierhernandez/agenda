# 17 - Guardians Module

## Overview

The Guardians Module manages the links between guardian users (parents/legal guardians) and students within a specific institution (tenant). Unlike standard CRUD modules, this module uses a **link/unlink** pattern — linking a guardian to a student creates the association, and unlinking sets the status to INACTIVE. It demonstrates resource-level authorization with additional membership validation.

## Architecture

```
Guard Chain:
AccessTokenGuard     → "Who are you?" (JWT → userId)
TenantContextGuard   → "Which institution?" (X-Institution-Id → institutionId)
PermissionGuard      → "What can you do?" (guardians:read / guardians:manage)
Controller           → HTTP handling
Service              → Business logic + resource-level auth + membership validation
AuditService         → Audit trail
```

## GuardianStudent Model

```prisma
model GuardianStudent {
  id               String                @id @default(uuid()) @db.Uuid
  institutionId    String                @map("institution_id") @db.Uuid
  guardianUserId   String                @map("guardian_user_id") @db.Uuid
  studentId        String                @map("student_id") @db.Uuid
  relationshipType RelationshipType      @map("relationship_type")
  isPrimary        Boolean               @default(false) @map("is_primary")
  status           GuardianStudentStatus @default(ACTIVE)
  createdAt        DateTime              @default(now()) @map("created_at")
  updatedAt        DateTime              @updatedAt @map("updated_at")

  institution  Institution @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  guardianUser User        @relation(fields: [guardianUserId], references: [id], onDelete: Restrict)
  student      Student     @relation(fields: [studentId], references: [id], onDelete: Restrict)

  @@unique([institutionId, guardianUserId, studentId])
  @@index([institutionId])
  @@index([institutionId, guardianUserId])
  @@index([institutionId, studentId])
  @@index([institutionId, status])
  @@map("guardian_students")
}
```

### Enums

```prisma
enum RelationshipType {
  FATHER
  MOTHER
  LEGAL_GUARDIAN
  OTHER
}

enum GuardianStudentStatus {
  ACTIVE
  INACTIVE
}
```

### Key Constraints

- **Composite unique**: `(institutionId, guardianUserId, studentId)` — same guardian-student pair unique within a tenant
- **Index**: `institutionId` — fast queries scoped to institution
- **Index**: `(institutionId, guardianUserId)` — queries by guardian
- **Index**: `(institutionId, studentId)` — queries by student
- **Index**: `(institutionId, status)` — filtered queries
- **`ON DELETE RESTRICT`**: Prevents deletion of users or students when guardian links exist

### Relations

```
Institution      ──1:N── GuardianStudent
User             ──1:N── GuardianStudent
Student          ──1:N── GuardianStudent
```

## Resource-Level Authorization + Membership Validation

### Principle

Every query is scoped by `institutionId` at the Prisma level. Additionally, linking a guardian validates that both the guardian user and the student belong to the same institution via active membership.

### Implementation

```typescript
// linkStudent — validates student, guardian membership, and duplicate
async linkStudent(institutionId, guardianUserId, dto, performingUserId, ipAddress?) {
  const student = await this.prisma.student.findFirst({
    where: { id: dto.studentId, institutionId },
  });
  if (!student) throw new NotFoundException('Student not found in this institution');

  const guardianMembership = await this.prisma.userInstitution.findFirst({
    where: { userId: guardianUserId, institutionId, status: 'ACTIVE' },
  });
  if (!guardianMembership) throw new ForbiddenException('Guardian user does not belong to this institution');

  const existing = await this.prisma.guardianStudent.findUnique({
    where: { institutionId_guardianUserId_studentId: { institutionId, guardianUserId, studentId: dto.studentId } },
  });
  if (existing) throw new ConflictException('Guardian is already linked to this student');
  // ...
}

// findStudentsByGuardian — scoped to guardian and institution
async findStudentsByGuardian(institutionId, guardianUserId, query) {
  const where = {
    institutionId,
    guardianUserId,
    status: 'ACTIVE',
    ...(query.search ? { student: { OR: [...] } } : {}),
  };
  // ...
}
```

### What This Prevents

| Attack | Defense |
|--------|---------|
| **IDOR/BOLA**: Access guardian links from another tenant | `findUnique` includes `institutionId` in composite key → 404 |
| **Cross-tenant student**: Link student from another tenant | `student.findFirst` with `institutionId` → 404 |
| **Unauthorized guardian**: Link guardian not in institution | `userInstitution.findFirst` validates ACTIVE membership → 403 |
| **Duplicate link**: Link same guardian-student twice | Composite unique constraint → 409 |

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `POST` | `/api/v1/guardians/students/:studentId` | `guardians:manage` | Link guardian to student |
| `GET` | `/api/v1/guardians/students` | `guardians:read` | List students linked to current guardian |
| `GET` | `/api/v1/guardians/students/:studentId/guardians` | `guardians:read` | List guardians linked to a student |
| `DELETE` | `/api/v1/guardians/students/:studentId` | `guardians:manage` | Unlink guardian from student |

### Query Parameters (List My Students)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | — | Search in student firstName, lastName (case-insensitive) |

### Request/Response Examples

**Link Guardian to Student:**
```json
POST /api/v1/guardians/students/:studentId
X-Institution-Id: <uuid>

{
  "relationshipType": "FATHER",
  "isPrimary": true
}

→ 201 Created
{
  "id": "uuid",
  "institutionId": "uuid",
  "guardianUserId": "uuid",
  "studentId": "uuid",
  "relationshipType": "FATHER",
  "isPrimary": true,
  "status": "ACTIVE",
  "createdAt": "2026-08-21T...",
  "updatedAt": "2026-08-21T..."
}
```

**List My Students:**
```json
GET /api/v1/guardians/students?page=1&limit=10&search=Carlos
X-Institution-Id: <uuid>

→ 200 OK
{
  "data": [
    {
      "id": "uuid",
      "institutionId": "uuid",
      "guardianUserId": "uuid",
      "studentId": "uuid",
      "relationshipType": "FATHER",
      "isPrimary": true,
      "status": "ACTIVE",
      "student": {
        "id": "uuid",
        "firstName": "Carlos",
        "lastName": "Mendoza",
        ...
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

**Unlink Guardian from Student:**
```json
DELETE /api/v1/guardians/students/:studentId
X-Institution-Id: <uuid>

→ 200 OK
{
  "id": "uuid",
  "institutionId": "uuid",
  "guardianUserId": "uuid",
  "studentId": "uuid",
  "status": "INACTIVE",
  ...
}
```

## Permissions

| Code | Module | Description |
|------|--------|-------------|
| `guardians:read` | Guardians | Read guardian-student links |
| `guardians:manage` | Guardians | Link/unlink guardians to students |

### Role Assignments

| Role | `guardians:read` | `guardians:manage` |
|------|:---:|:---:|
| SUPER_ADMIN | ✅ | ✅ |
| INSTITUTION_ADMIN | ✅ | ✅ |
| TEACHER | ❌ | ❌ |
| PARENT | ✅ | ✅ |
| STUDENT | ❌ | ❌ |

**Note**: PARENT can link/unlink their own guardian-student associations. The service uses `req.user.userId` as the `guardianUserId`, ensuring parents can only manage their own links.

## Guard Chain

```
AccessTokenGuard
  ↓ validates JWT, sets req.user = { userId }
TenantContextGuard
  ↓ validates X-Institution-Id header, sets req.tenant = { institutionId, userInstitutionId }
PermissionGuard
  ↓ checks @RequirePermission('guardians:read' or 'guardians:manage')
GuardiansController
  ↓ passes req.tenant.institutionId and req.user.userId to service
GuardiansService
  ↓ validates student and guardian membership, uses institutionId in every Prisma query
```

## DTOs

### LinkGuardianDto
```typescript
{
  studentId: string;           // required, UUID (from URL param, overridden in controller)
  relationshipType: RelationshipType; // required, enum
  isPrimary?: boolean;         // optional, default false
}
```

### ListGuardiansQueryDto
```typescript
{
  page?: number;         // default 1
  limit?: number;        // default 20, max 100
  search?: string;       // case-insensitive search in student firstName, lastName
}
```

**Note**: `institutionId` is NOT in any DTO. It is stripped by `whitelist: true` and `forbidNonWhitelisted: true` in the global ValidationPipe.

## Audit Trail

Every mutation is logged to `AuditLog` with:

| Field | Value |
|-------|-------|
| `action` | `GUARDIAN_LINKED`, `GUARDIAN_UNLINKED` |
| `entityType` | `GuardianStudent` |
| `entityId` | GuardianStudent UUID |
| `institutionId` | From header |
| `oldValues` | Previous state (for unlink) |
| `newValues` | New state (link details or INACTIVE status) |
| `ipAddress` | Request IP (if available) |

## Business Rules

1. **Link/unlink pattern** — linking creates ACTIVE record, unlinking sets status to INACTIVE (no physical deletion)
2. **Guardian membership required** — guardian user must have ACTIVE membership in the institution
3. **Student must belong to same tenant** — validated before link creation
4. **No duplicate links** — composite unique `(institutionId, guardianUserId, studentId)` prevents duplicates
5. **Already inactive link** — unlinking an already INACTIVE link returns 409 Conflict
6. **isPrimary flag** — indicates the primary guardian for the student
7. **`institutionId` from header only** — never from request body

## Seed

Up to 2 demo guardian-student links created for Demo School, linking the parent user to the first 2 students. Uses `findUnique` check for idempotency.

## Tests

### Unit Tests (12 tests — `guardians.service.spec.ts`)

| Test | Description |
|------|-------------|
| linkStudent | Links guardian to student successfully |
| linkStudent | Throws NotFoundException for student not in same tenant |
| linkStudent | Throws ForbiddenException when guardian is not in institution |
| linkStudent | Throws ConflictException for duplicate link |
| findStudentsByGuardian | Returns only linked students for the guardian |
| findStudentsByGuardian | Supports pagination |
| findStudentsByGuardian | Supports search by student name |
| findStudentsByGuardian | Is tenant-scoped |
| findByStudent | Returns guardians for a student |
| findByStudent | Throws NotFoundException for cross-tenant student |
| unlinkStudent | Unlinks guardian from student |
| unlinkStudent | Throws NotFoundException for non-existent link |
| unlinkStudent | Throws ConflictException for already inactive link |
| unlinkStudent | Is tenant-scoped |

### E2E Tests

See `apps/api/test/guardians.e2e-spec.ts` for full E2E test suite.

## Files

```
apps/api/src/modules/guardians/
  guardians.controller.ts          # REST endpoints
  guardians.service.ts             # Business logic + membership validation
  guardians.service.spec.ts        # 12+ unit tests
  guardians.module.ts              # Module wiring
  dto/
    link-guardian.dto.ts           # Link DTO
    list-guardians-query.dto.ts    # List query params

apps/api/test/
  guardians.e2e-spec.ts            # E2E tests

apps/api/prisma/
  schema.prisma                    # GuardianStudent model
  migrations/20260822004102_add_mvp_domain_foundation/
    migration.sql                  # Migration
  seed.ts                          # Demo guardian-student links for demo-school
```

## IDOR/BOLA Review

| # | Query | Description | institutionId? | Status |
|---|-------|-------------|----------------|--------|
| 1 | `student.findFirst` | Validate student in tenant | ✅ `where: { id, institutionId }` | SAFE |
| 2 | `userInstitution.findFirst` | Validate guardian membership | ✅ `where: { userId, institutionId, status: 'ACTIVE' }` | SAFE |
| 3 | `guardianStudent.findUnique` | Check duplicate link | ✅ composite unique with institutionId | SAFE |
| 4 | `guardianStudent.create` | Create link | ✅ `data: { institutionId }` | SAFE |
| 5 | `guardianStudent.findMany` | List by guardian | ✅ `where: { institutionId, guardianUserId }` | SAFE |
| 6 | `guardianStudent.count` | Count links | ✅ same where as findMany | SAFE |
| 7 | `guardianStudent.findMany` | List by student | ✅ `where: { institutionId, studentId }` | SAFE |
| 8 | `guardianStudent.findUnique` | Unlink ownership check | ✅ composite unique with institutionId | SAFE |
| 9 | `guardianStudent.update` | Deactivate link | ⚠️ `where: { id }` — pre-verified at #8 | SAFE |

**Total: 9 queries, all safe. No IDOR/BOLA vulnerabilities.**
