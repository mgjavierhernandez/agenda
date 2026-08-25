# 10 - Schedules Module

## Overview

The Schedules Module provides CRUD operations for academic schedule entries (timetable slots) within a specific institution (tenant). It validates that referenced Course and Subject belong to the same tenant, validates time ranges, and checks for overlapping schedules per course/day. This module demonstrates resource-level authorization with relation validation and business-rule enforcement.

## Architecture

```
Guard Chain:
AccessTokenGuard     → "Who are you?" (JWT → userId)
TenantContextGuard   → "Which institution?" (X-Institution-Id → institutionId)
PermissionGuard      → "What can you do?" (schedules:read / schedules:manage)
Controller           → HTTP handling
Service              → Business logic + resource-level auth + relation validation + overlap check
AuditService         → Audit trail
```

## Schedule Model

```prisma
model Schedule {
  id             String         @id @default(uuid()) @db.Uuid
  institutionId  String         @map("institution_id") @db.Uuid
  courseId        String         @map("course_id") @db.Uuid
  subjectId      String         @map("subject_id") @db.Uuid
  dayOfWeek      DayOfWeek      @map("day_of_week")
  startTime      DateTime       @map("start_time") @db.Time
  endTime        DateTime       @map("end_time") @db.Time
  classroom      String?        @db.VarChar(100)
  status         ScheduleStatus @default(ACTIVE)
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  institution Institution @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  course      Course      @relation(fields: [courseId], references: [id], onDelete: Restrict)
  subject     Subject     @relation(fields: [subjectId], references: [id], onDelete: Restrict)

  @@index([institutionId])
  @@index([institutionId, courseId])
  @@index([institutionId, subjectId])
  @@index([institutionId, dayOfWeek])
  @@index([institutionId, status])
  @@map("schedules")
}
```

### Enums

```prisma
enum ScheduleStatus {
  ACTIVE
  INACTIVE
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}
```

### Key Design Decisions

1. **No unique constraint** — Multiple schedules per course/subject/day/hour are allowed (different courses at same time, same course at different times).
2. **DayOfWeek as enum** — Fixed set of valid values, no arbitrary strings.
3. **Time stored as `@db.Time`** — Prisma represents times as `Date` objects. Service converts between `"HH:MM"` strings (DTO) and `Date` (DB) using `timeStringToDate()` / `dateToTimeString()` helpers.
4. **Overlap detection** — Service-level validation prevents overlapping schedules for the **same course** on the **same day**. Different courses can overlap.
5. **All foreign keys use `onDelete: Restrict`** — Prevents accidental cascade deletion.

### Relations

```
Institution ──1:N── Schedule
Course      ──1:N── Schedule
Subject     ──1:N── Schedule
```

## Resource-Level Authorization + Relation Validation

### Principle

Every query is scoped by `institutionId` at the Prisma level. Creating or updating a schedule validates that both Course and Subject belong to the same tenant.

### Implementation

```typescript
// Relation validation — both resources must be in the same tenant
private async validateRelations(institutionId, courseId, subjectId) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, institutionId },
  });
  if (!course) throw new NotFoundException('Course not found in this institution');

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, institutionId },
  });
  if (!subject) throw new NotFoundException('Subject not found in this institution');
}

// Overlap check — same course, same day, overlapping time
private async checkOverlap(institutionId, courseId, dayOfWeek, startTime, endTime, excludeId?) {
  const start = this.timeStringToDate(startTime);
  const end = this.timeStringToDate(endTime);

  const overlap = await prisma.schedule.findFirst({
    where: {
      institutionId,
      courseId,
      dayOfWeek: dayOfWeek as DayOfWeek,
      status: 'ACTIVE',
      OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  if (overlap) throw new BadRequestException('Schedule overlaps...');
}

// findOne — always scoped
async findOne(institutionId: string, scheduleId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, institutionId },
  });
  if (!schedule) throw new NotFoundException('Schedule not found');
  return schedule;
}
```

### Time Conversion

Prisma's `@db.Time` columns return `Date` objects. The service converts:

```typescript
private timeStringToDate(time: string): Date {
  const [h, m, s] = time.split(':');
  return new Date(1970, 0, 1, Number(h), Number(m), Number(s || '0'));
}

private dateToTimeString(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return s === '00' ? `${h}:${m}` : `${h}:${m}:${s}`;
}
```

### What This Prevents

| Attack | Defense |
|--------|---------|
| **IDOR/BOLA**: Access schedule from another tenant | `findFirst` includes `institutionId` → 404 |
| **Cross-tenant relations**: Use Course from tenant B | `validateRelations` checks each resource against `institutionId` → 404 |
| **Body bypass**: Send `institutionId` in body | DTO whitelist strips it; `institutionId` from header only |
| **Time overlap**: Duplicate schedule for same course/day | `checkOverlap` validates no overlapping ACTIVE schedules |
| **Invalid time range**: startTime >= endTime | `validateTimeRange` enforced in service layer |

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `POST` | `/api/v1/schedules` | `schedules:manage` | Create schedule (validates relations + overlap) |
| `GET` | `/api/v1/schedules` | `schedules:read` | List schedules (paginated, filterable) |
| `GET` | `/api/v1/schedules/:id` | `schedules:read` | Get schedule by ID |
| `PATCH` | `/api/v1/schedules/:id` | `schedules:manage` | Update schedule |
| `PATCH` | `/api/v1/schedules/:id/deactivate` | `schedules:manage` | Deactivate schedule |

### Query Parameters (List)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | — | Search in classroom |
| `status` | ScheduleStatus | — | Filter by status |
| `courseId` | UUID | — | Filter by course |
| `subjectId` | UUID | — | Filter by subject |
| `dayOfWeek` | DayOfWeek | — | Filter by day |

### Request/Response Examples

**Create Schedule:**
```json
POST /api/v1/schedules
X-Institution-Id: <uuid>

{
  "courseId": "uuid",
  "subjectId": "uuid",
  "dayOfWeek": "MONDAY",
  "startTime": "08:00",
  "endTime": "09:30",
  "classroom": "Aula 101"
}

→ 201 Created
{
  "id": "uuid",
  "institutionId": "uuid",
  "courseId": "uuid",
  "subjectId": "uuid",
  "dayOfWeek": "MONDAY",
  "startTime": "1970-01-01T08:00:00.000Z",
  "endTime": "1970-01-01T09:30:00.000Z",
  "classroom": "Aula 101",
  "status": "ACTIVE",
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Permissions

| Code | Module | Description |
|------|--------|-------------|
| `schedules:read` | Schedules | List and read schedules |
| `schedules:manage` | Schedules | CRUD schedules |

Pre-existing in seed (32 permissions). No new permissions created.

### Role Assignments

| Role | `schedules:read` | `schedules:manage` |
|------|:---:|:---:|
| SUPER_ADMIN | ✅ | ✅ |
| INSTITUTION_ADMIN | ✅ | ✅ |
| TEACHER | ✅ | ❌ |
| PARENT | ✅ | ❌ |
| STUDENT | ✅ | ❌ |

**Note**: TEACHER, PARENT, and STUDENT have read-only access. Only INSTITUTION_ADMIN and SUPER_ADMIN can manage schedules.

## Guard Chain

```
AccessTokenGuard
  ↓ validates JWT, sets req.user = { userId }
TenantContextGuard
  ↓ validates X-Institution-Id header, sets req.tenant = { institutionId, userInstitutionId }
PermissionGuard
  ↓ checks @RequirePermission('schedules:read' or 'schedules:manage')
SchedulesController
  ↓ passes req.tenant.institutionId to service
SchedulesService
  ↓ validates relations, validates time range, checks overlap, uses institutionId in every Prisma query
```

## DTOs

### CreateScheduleDto
```typescript
{
  courseId: string;          // required, UUID
  subjectId: string;         // required, UUID
  dayOfWeek: DayOfWeek;      // required, enum (MONDAY..SUNDAY)
  startTime: string;         // required, "HH:MM" or "HH:MM:SS"
  endTime: string;           // required, "HH:MM" or "HH:MM:SS"
  classroom?: string;        // optional, max 100 chars
  status?: ScheduleStatus;   // optional, default ACTIVE
}
```

### UpdateScheduleDto
```typescript
{
  courseId?: string;
  subjectId?: string;
  dayOfWeek?: DayOfWeek;
  startTime?: string;        // "HH:MM" or "HH:MM:SS"
  endTime?: string;          // "HH:MM" or "HH:MM:SS"
  classroom?: string;
  status?: ScheduleStatus;
}
```

**Note**: `institutionId` is NOT in any DTO. It is stripped by `whitelist: true` and `forbidNonWhitelisted: true` in the global ValidationPipe.

### ListSchedulesQueryDto
```typescript
{
  page?: number;          // default 1
  limit?: number;         // default 20, max 100
  search?: string;        // case-insensitive search in classroom
  status?: ScheduleStatus;
  courseId?: string;      // filter by course (UUID)
  subjectId?: string;     // filter by subject (UUID)
  dayOfWeek?: DayOfWeek;  // filter by day
}
```

## Audit Trail

Every mutation is logged to `AuditLog` with:

| Field | Value |
|-------|-------|
| `action` | `SCHEDULE_CREATED`, `SCHEDULE_UPDATED`, `SCHEDULE_DEACTIVATED` |
| `entityType` | `Schedule` |
| `entityId` | Schedule UUID |
| `institutionId` | From header |
| `oldValues` | Previous state (for updates) |
| `newValues` | New state |
| `ipAddress` | Request IP (if available) |

## Business Rules

1. **Time validation**: `startTime` must be strictly before `endTime` (string comparison of `"HH:MM"` format).
2. **Overlap detection**: Prevents overlapping schedules for the **same course** on the **same day**. Different courses can overlap at the same time.
3. **All referenced resources must belong to the same tenant** — validated before create/update.
4. **Physical deletion prohibited** — only status change (ACTIVE → INACTIVE).

## Seed

6 demo schedule records created for Demo School using 2 courses × 2 subjects × 3 days. Uses `findFirst` check for idempotency. Times stored as `Date` objects via `new Date('1970-01-01T08:00:00')`.

## Tests

### Unit Tests (20 tests — `schedules.service.spec.ts`)

| Test | Description |
|------|-------------|
| create | Schedule created with institutionId |
| create | Rejects course from another tenant |
| create | Rejects subject from another tenant |
| create | Rejects startTime >= endTime |
| create | Rejects overlapping schedule for same course/day |
| findOne | Returns schedule scoped to institution |
| findOne | Throws NotFoundException for wrong institution |
| findAll | Returns only current tenant schedules |
| findAll | Supports pagination |
| findAll | Supports filter by courseId |
| findAll | Supports filter by subjectId |
| findAll | Supports filter by dayOfWeek |
| findAll | Supports filter by status |
| update | Updates schedule within institution |
| update | Throws NotFoundException for wrong institution |
| update | Cannot modify institutionId |
| update | Validates relations when courseId changes |
| update | Rejects startTime >= endTime on update |
| deactivate | Sets status to INACTIVE |
| deactivate | Throws NotFoundException for cross-tenant |

### E2E Tests (30 tests — `schedules.e2e-spec.ts`)

| Test | Description |
|------|-------------|
| TEST-01 | Admin creates schedule → 201 |
| TEST-02 | Teacher without schedules:manage → 403 |
| TEST-03 | Admin lists schedules → only current tenant |
| TEST-04 | Parent with schedules:read → 200 |
| TEST-05 | Student with schedules:read → 200 |
| TEST-05b | Admin deactivates schedule → 200 |
| TEST-06 | Admin gets schedule by ID → 200 |
| TEST-07 | Admin updates schedule → 200 |
| TEST-07b | Admin deactivates from other tenant → 404 |
| TEST-08 | Parent without schedules:manage → 403 |
| TEST-09 | Student without schedules:manage → 403 |
| TEST-11 | Without access token → 401 |
| TEST-12b | Without X-Institution-Id → 403 |
| TEST-12c | Institution without membership → 403 |
| TEST-13 | Inactive membership → 403 |
| TEST-14 | Inactive institution → 403 |
| TEST-16 | Admin gets schedule from other tenant → 404 |
| TEST-17 | Admin updates schedule from other tenant → 404 |
| TEST-19 | Course from another tenant → 404 |
| TEST-20 | Subject from another tenant → 404 |
| TEST-22 | Body institutionId rejected → 400 |
| TEST-23 | Body institutionId rejected on PATCH → 400 |
| TEST-25 | Pagination returns correct meta |
| TEST-29 | SUPER_ADMIN with membership can operate |
| TEST-30 | SUPER_ADMIN without membership → 403 |
| — | Rejects missing required fields → 400 |
| — | Rejects startTime >= endTime → 400 |
| — | Filter by courseId |
| — | Filter by subjectId |
| — | Filter by dayOfWeek |
| — | Filter by status |

## Files

```
apps/api/src/modules/schedules/
  schedules.controller.ts          # REST endpoints
  schedules.service.ts             # Business logic + relation validation + overlap + resource-level auth
  schedules.service.spec.ts        # 20 unit tests
  schedules.module.ts              # Module wiring
  dto/
    create-schedule.dto.ts         # Create DTO
    update-schedule.dto.ts         # Update DTO
    list-schedules-query.dto.ts    # List query params

apps/api/test/
  schedules.e2e-spec.ts            # 30 E2E tests

apps/api/prisma/
  schema.prisma                      # Schedule model + enums
  migrations/20260821191348_add_schedules_module/
    migration.sql                    # Migration
  seed.ts                            # Demo schedules for demo-school
```

## IDOR/BOLA Review

| # | Query | Description | institutionId? | Status |
|---|-------|-------------|----------------|--------|
| 1 | `course.findFirst` | Validate course exists in tenant | ✅ `where: { id, institutionId }` | SAFE |
| 2 | `subject.findFirst` | Validate subject exists in tenant | ✅ `where: { id, institutionId }` | SAFE |
| 3 | `schedule.findFirst` | Overlap check | ✅ `where: { institutionId, courseId, ... }` | SAFE |
| 4 | `schedule.create` | Create schedule | ✅ `data: { institutionId }` | SAFE |
| 5 | `schedule.findMany` | List schedules | ✅ `where: { institutionId }` | SAFE |
| 6 | `schedule.count` | Count schedules | ✅ same where as findMany | SAFE |
| 7 | `schedule.findFirst` | findOne | ✅ `where: { id, institutionId }` | SAFE |
| 8 | `schedule.findFirst` | Update ownership check | ✅ `where: { id, institutionId }` | SAFE |
| 9 | `schedule.update` | Update schedule | ⚠️ `where: { id }` — pre-verified at #8 | SAFE |

**Total: 9 queries, all safe. No IDOR/BOLA vulnerabilities.**

## Comparison with Other Modules

| Aspect | Students | Courses | Subjects | Grades | Schedules |
|--------|----------|---------|----------|--------|-----------|
| Unique constraint | `(instId, docType, docNumber)` | `(instId, code)` | `(instId, code)` | None | None |
| Foreign relations | Institution | Institution | Institution | Inst+Student+Course+Subject | Institution+Course+Subject |
| Relation validation | None | None | None | Yes (3 resources) | Yes (2 resources) |
| Business rules | — | — | — | Grade range 0-5 | Time range + overlap |
| Delete strategy | Deactivate | Deactivate | Deactivate | Deactivate | Deactivate |
| Special features | — | — | — | Multi-eval per period | DayOfWeek enum + Time |
