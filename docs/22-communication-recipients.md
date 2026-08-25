# 22 - Communication Recipients Module

## Overview

The Communication Recipients Module tracks which users have received a communication and whether they have read it. Recipients are automatically created when a communication is published, based on the target audience. The module provides read tracking, unread counts, and bulk mark-all-read.

## Architecture

```
Guard Chain: AccessTokenGuard -> TenantContextGuard -> PermissionGuard -> Controller -> Service -> Prisma
```

## Prisma Model

```prisma
model CommunicationRecipient {
  id              String                       @id @default(uuid()) @db.Uuid
  institutionId   String                       @map("institution_id") @db.Uuid
  communicationId String                       @map("communication_id") @db.Uuid
  userId          String                       @map("user_id") @db.Uuid
  status          CommunicationRecipientStatus @default(DELIVERED)
  readAt          DateTime?                    @map("read_at")
  createdAt       DateTime                     @default(now()) @map("created_at")
  updatedAt       DateTime                     @updatedAt @map("updated_at")

  institution   Institution    @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  communication Communication  @relation(fields: [communicationId], references: [id], onDelete: Restrict)
  user          User           @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@unique([communicationId, userId])
}
```

### Enums

- **CommunicationRecipientStatus**: `DELIVERED`, `READ`

### Relations

| Relation | Target | Required | On Delete |
|----------|--------|----------|-----------|
| institution | Institution | Yes | Restrict |
| communication | Communication | Yes | Restrict |
| user | User | Yes | Restrict |

### Indexes

- `institutionId`
- `[institutionId, communicationId]`
- `[institutionId, userId]`
- `[userId, status]`

## Read Tracking

- On creation, status is `DELIVERED` and `readAt` is null.
- When a user reads a communication, status becomes `READ` and `readAt` is set to the current timestamp.
- Reading an already-READ recipient is a no-op (returns existing record).
- `mark-all-read` updates all DELIVERED recipients for the user to READ.

## Audience Interaction

When a communication is published (`communications:manage` triggers `PATCH /communications/:id/publish`):

1. The `CommunicationsService.publish()` method sets status to `PUBLISHED`.
2. `createRecipientsForCommunication()` is called automatically.
3. Based on `audience`:
   - `ALL` -- recipients created for all users with TEACHER, PARENT, or STUDENT roles
   - `TEACHERS` -- recipients created for users with TEACHER role
   - `PARENTS` -- recipients created for users with PARENT role
   - `STUDENTS` -- recipients created for users with STUDENT role
4. INSTITUTION_ADMIN and SUPER_ADMIN are NOT automatically included as recipients (they access via `communications:manage` permission, not via audience).

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/api/v1/communication-recipients` | `communications:read` | List user's recipients (paginated) |
| GET | `/api/v1/communication-recipients/unread-count` | `communications:read` | Get unread count |
| PATCH | `/api/v1/communication-recipients/mark-all-read` | `communications:read` | Mark all as read |
| PATCH | `/api/v1/communication-recipients/:id/read` | `communications:read` | Mark one as read |

### GET /api/v1/communication-recipients

Returns only the authenticated user's recipients. Each entry includes the communication summary.

**Query (ListRecipientsQueryDto):**

```typescript
{
  status?: CommunicationRecipientStatus;  // DELIVERED | READ
  page?: number;   // default 1
  limit?: number;  // default 20
}
```

**Response:**

```typescript
{
  data: CommunicationRecipient[];
  meta: { page, limit, total, totalPages };
}
```

### GET /api/v1/communication-recipients/unread-count

**Response:**

```typescript
{ count: number }
```

### PATCH /api/v1/communication-recipients/mark-all-read

Marks all DELIVERED recipients for the current user as READ.

**Response:**

```typescript
{ updated: number }
```

### PATCH /api/v1/communication-recipients/:id/read

Marks a specific recipient as READ.

**Response:**

```typescript
CommunicationRecipient
```

## RBAC

| Role | Read Recipients | Mark as Read |
|------|:---:|:---:|
| SUPER_ADMIN | ✅ (own) | ✅ (own) |
| INSTITUTION_ADMIN | ✅ (own) | ✅ (own) |
| TEACHER | ✅ (own) | ✅ (own) |
| PARENT | ✅ (own) | ✅ (own) |
| STUDENT | ✅ (own) | ✅ (own) |

All users can manage their own read state. The controller queries by `req.user.userId`, so users only see their own recipients.

## Audit Events

| Event | When |
|-------|------|
| `COMMUNICATION_READ` | User marks a recipient as READ |
| `COMMUNICATIONS_ALL_READ` | User marks all recipients as READ |

## Security

- **User identity** -- Recipients are always queried by the authenticated user's `userId`. Users cannot read or modify other users' recipients.
- **Tenant isolation** -- All Prisma queries include `institutionId`.
- **IDOR/BOLA protection** -- `findFirst({ where: { id, institutionId } })` for recipient lookups.
- **Body whitelist** -- `forbidNonWhitelisted: true`.

## Seed

Demo seed creates 4 CommunicationRecipients:
- For each PUBLISHED communication, recipients are created for all users in the demo institution
- Status: `DELIVERED`

## Files

```
apps/api/src/modules/communication-recipients/
  communication-recipients.controller.ts
  communication-recipients.service.ts
  communication-recipients.module.ts
  communication-recipients.service.spec.ts
  dto/communication-recipient.dto.ts
```
