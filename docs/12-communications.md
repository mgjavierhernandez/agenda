# 12 - Communications Module

## Overview

The Communications Module allows an institution to publish communications directed to different audiences (ALL, TEACHERS, PARENTS, STUDENTS). Supports CRUD, status lifecycle, audience-based visibility, expiration, automatic recipient creation, and read tracking.

## Architecture

```
Guard Chain: AccessTokenGuard -> TenantContextGuard -> PermissionGuard -> Controller -> Service -> Prisma
```

## Communication Model

```prisma
model Communication {
  id            String                  @id @default(uuid()) @db.Uuid
  institutionId String                  @map("institution_id") @db.Uuid
  title         String                  @db.VarChar(200)
  content       String                  @db.Text
  audience      CommunicationAudience
  status        CommunicationStatus     @default(DRAFT)
  publishedAt   DateTime?               @map("published_at")
  expiresAt     DateTime?               @map("expires_at")
  createdAt     DateTime                @default(now()) @map("created_at")
  updatedAt     DateTime                @updatedAt @map("updated_at")

  institution Institution              @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  recipients  CommunicationRecipient[]
}
```

### Enums

- **CommunicationAudience**: `ALL`, `TEACHERS`, `PARENTS`, `STUDENTS`
- **CommunicationStatus**: `DRAFT`, `PUBLISHED`, `INACTIVE`

### Status Lifecycle

```
DRAFT -> PUBLISHED  (sets publishedAt)
DRAFT -> INACTIVE
PUBLISHED -> INACTIVE
INACTIVE -> (terminal)
```

## CommunicationRecipient Model

When a communication is published, `CommunicationRecipient` records are automatically created for each user matching the target audience. This enables per-user read tracking.

See [22-communication-recipients.md](22-communication-recipients.md) for full details.

### Recipient Creation Rules

| Audience | Recipients created for |
|----------|----------------------|
| `ALL` | All users with TEACHER, PARENT, or STUDENT role |
| `TEACHERS` | Users with TEACHER role |
| `PARENTS` | Users with PARENT role |
| `STUDENTS` | Users with STUDENT role |

Note: INSTITUTION_ADMIN and SUPER_ADMIN are not automatically included as recipients. They access communications via `communications:manage` permission.

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/api/v1/communications` | `communications:manage` | Create DRAFT |
| GET | `/api/v1/communications` | `communications:read` | List (all for managers, visible for consumers) |
| GET | `/api/v1/communications/:id` | `communications:read` | Get by ID |
| PATCH | `/api/v1/communications/:id` | `communications:manage` | Update |
| PATCH | `/api/v1/communications/:id/publish` | `communications:manage` | Publish + create recipients |
| PATCH | `/api/v1/communications/:id/deactivate` | `communications:manage` | Deactivate |

### POST /api/v1/communications

**Body (CreateCommunicationDto):**

```typescript
{
  title: string;        // required, 3-200 chars
  content: string;      // required
  audience: CommunicationAudience;  // ALL | TEACHERS | PARENTS | STUDENTS
  expiresAt?: string;   // optional, ISO 8601 date (must be future)
}
```

Creates with status `DRAFT`.

### GET /api/v1/communications

**Behavior differs by permission:**
- Users with `communications:manage`: See ALL communications (all statuses).
- Consumers (without `communications:manage`): See only PUBLISHED, non-expired communications that match their audience.

**Query (ListCommunicationsQueryDto):**

```typescript
{
  page?: number;            // default 1
  limit?: number;           // default 20
  search?: string;          // full-text on title/content
  status?: CommunicationStatus;
  audience?: CommunicationAudience;
  publishedFrom?: string;   // ISO date lower bound
  publishedTo?: string;     // ISO date upper bound
}
```

Default sort: `publishedAt DESC`.

### PATCH /api/v1/communications/:id/publish

No body required. Transitions DRAFT -> PUBLISHED, sets `publishedAt`, and automatically creates `CommunicationRecipient` records for all users matching the audience.

### PATCH /api/v1/communications/:id/deactivate

No body required. Transitions any non-INACTIVE status to INACTIVE.

## Audience-Based Visibility

The `canUserViewCommunication()` method checks:

1. Status must be `PUBLISHED`.
2. If `expiresAt` is set and in the past, communication is not visible.
3. Audience match:
   - `ALL` -> everyone sees it
   - `TEACHERS` -> TEACHER, INSTITUTION_ADMIN, SUPER_ADMIN
   - `PARENTS` -> PARENT, INSTITUTION_ADMIN, SUPER_ADMIN
   - `STUDENTS` -> STUDENT, INSTITUTION_ADMIN, SUPER_ADMIN

**Distinction between audience-based and recipient-based visibility:**
- **Audience-based** (`canUserViewCommunication`): Controls whether a user can see the communication in the list. Used by `findAllVisible` and `findOneVisible` for consumer users.
- **Recipient-based** (`CommunicationRecipient`): Tracks per-user read state. Created on publish. Used for unread counts and read tracking.

## Permissions

| Role | `communications:read` | `communications:manage` |
|------|:---:|:---:|
| SUPER_ADMIN | Y | Y |
| INSTITUTION_ADMIN | Y | Y |
| TEACHER | Y | - |
| PARENT | Y | - |
| STUDENT | Y | - |

TEACHER and PARENT also have `communications:create` (can create DRAFT communications).

## Audit Events

| Event | When |
|-------|------|
| `COMMUNICATION_CREATED` | Communication created (DRAFT) |
| `COMMUNICATION_UPDATED` | Communication fields updated |
| `COMMUNICATION_PUBLISHED` | DRAFT -> PUBLISHED |
| `COMMUNICATION_DEACTIVATED` | -> INACTIVE |

## Seed

Demo seed creates 4 communications:
- 3 with status `PUBLISHED`, 1 with `DRAFT`
- Audiences: PARENTS, TEACHERS, ALL, ALL
- With and without expiration dates

## Files

```
apps/api/src/modules/communications/
  communications.module.ts
  communications.controller.ts
  communications.service.ts
  communications.service.spec.ts
  dto/create-communication.dto.ts
  dto/update-communication.dto.ts
  dto/list-communications-query.dto.ts

apps/api/test/communications.e2e-spec.ts
```
