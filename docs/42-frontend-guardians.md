# Frontend: Guardians Module (GuardianStudent Relationships)

## Overview

Frontend module for managing **GuardianStudent relationships** — the linking of guardians (users) to students with a relationship type. This is NOT a standalone CRUD entity; it manages the many-to-many relationship between guardians and students.

**Backend endpoints (4):**
| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/guardians/students/:studentId` | Link current guardian to a student (201) | `guardians:manage` |
| GET | `/guardians/students` | List students linked to current guardian (paginated) | `guardians:read` |
| GET | `/guardians/students/:studentId/guardians` | Get guardians linked to a student | `guardians:read` |
| DELETE | `/guardians/students/:studentId` | Unlink (soft-delete, sets INACTIVE) | `guardians:manage` |

No PATCH/PUT endpoint. No standalone GET by ID. No deactivation — unlink (DELETE) is the equivalent.

## Prisma Model

```prisma
model GuardianStudent {
  id               UUID                  @id @default(uuid())
  institutionId    UUID
  guardianUserId   UUID
  studentId        UUID
  relationshipType RelationshipType
  isPrimary        Boolean               @default(false)
  status           GuardianStudentStatus @default(ACTIVE)
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  institution Institution        @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  guardian    User               @relation("GuardianUser", fields: [guardianUserId], references: [id], onDelete: Restrict)
  student     Student            @relation(fields: [studentId], references: [id], onDelete: Restrict)

  @@unique([institutionId, guardianUserId, studentId])
  @@index([institutionId])
  @@index([institutionId, guardianUserId])
  @@index([institutionId, studentId])
  @@index([institutionId, status])
}
```

## Enums

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

## API Types

```typescript
type RelationshipType = 'FATHER' | 'MOTHER' | 'LEGAL_GUARDIAN' | 'OTHER';
type GuardianStudentStatus = 'ACTIVE' | 'INACTIVE';

interface GuardianStudent {
  id: string;
  institutionId: string;
  guardianUserId: string;
  studentId: string;
  relationshipType: RelationshipType;
  isPrimary: boolean;
  status: GuardianStudentStatus;
  createdAt: string;
  updatedAt: string;
}

interface GuardianStudentWithStudent extends GuardianStudent {
  student: Student;
}

interface LinkGuardianInput {
  studentId: string;
  relationshipType: RelationshipType;
  isPrimary?: boolean;
}
```

## Hooks

| Hook | Type | Description |
|------|------|-------------|
| `useGuardianStudents` | Query | List students linked to current guardian (paginated, searchable) |
| `useGuardiansByStudent` | Query | Get guardians linked to a specific student |
| `useLinkGuardian` | Mutation | Link current guardian to a student (POST) |
| `useUnlinkGuardian` | Mutation | Unlink guardian from student (DELETE, sets INACTIVE) |

## Pages

| Page | Route | Description |
|------|-------|-------------|
| `GuardiansPage` | `/guardians` | List of linked students with search, pagination, unlink action |
| `GuardiansFormPage` | `/guardians/new` | Form to link a guardian to a student |

No detail page — clicking a student navigates to StudentDetailPage.

## Routing

| Route | Page | Access |
|-------|------|--------|
| `/guardians` | GuardiansPage | `guardians:read` |
| `/guardians/new` | GuardiansFormPage | `guardians:manage` |

## Sidebar

Entry: `Acudientes` with `👨‍👩‍👧` icon, guarded by `GUARDIANS_READ` permission.

## Search / Filters / Pagination

- **Search**: case-insensitive on student firstName/lastName (backend)
- **Pagination**: page, limit (default 20, max 100)
- **Sort**: by createdAt descending (backend)
- **Filters**: none beyond search

## Validation

- Student ID: required, must be valid UUID
- Relationship type: required, must be valid enum value (FATHER/MOTHER/LEGAL_GUARDIAN/OTHER)
- isPrimary: optional boolean (default false)

## Key Design Decisions

1. **No standalone guardian entity**: The backend manages GuardianStudent relationships, not individual guardians. A guardian is already a User in the system.
2. **Current user context**: The `linkStudent` endpoint always links the current authenticated user (`req.user.userId`) as the guardian. The frontend cannot specify a different guardian user.
3. **Soft delete via DELETE**: Unlinking sets status to INACTIVE (not a hard delete). Audit-logged.
4. **No detail page**: The list shows all relevant information. Clicking a student navigates to StudentDetailPage.
5. **Form simplicity**: The form only requires student ID (UUID) and relationship type. No guardian selection needed.

## Tests

- `guardians-hooks.test.tsx`: 6 tests (useGuardianStudents × 2, useGuardiansByStudent × 2, useLinkGuardian, useUnlinkGuardian)
- `guardians-pages.test.tsx`: 17 tests (GuardiansPage: 9, GuardiansFormPage: 8)

## Known Limitations

1. **Form UX**: The student ID input requires a UUID. A future improvement would be to add a student search/autocomplete.
2. **Guardian user not selectable**: The `linkStudent` endpoint always links the current user. An admin cannot link a different user as a guardian through this UI.
3. **No batch linking**: Each student must be linked individually.
4. **No detail page**: By design — the list provides all necessary information.
