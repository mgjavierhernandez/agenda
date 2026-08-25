# Frontend: Enrollments Module (Matrículas)

## Overview

Complete CRUD module for managing student enrollments (matrículas) — linking students to courses within academic periods and school grades. Includes list with filters, detail view with lifecycle actions, and create form with entity selectors.

**Backend endpoints (5):**
| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/enrollments` | Create enrollment (201) | `enrollments:manage` |
| GET | `/enrollments` | List paginated + filters | `enrollments:read` |
| GET | `/enrollments/:id` | Get by ID | `enrollments:read` |
| PATCH | `/enrollments/:id` | Update (status only) | `enrollments:manage` |
| PATCH | `/enrollments/:id/deactivate` | Deactivate (set INACTIVE) | `enrollments:manage` |

No DELETE endpoint — deactivation only.

## Prisma Model

```prisma
model Enrollment {
  id               UUID             @id @default(uuid())
  institutionId    UUID
  studentId        UUID
  courseId          UUID
  schoolGradeId    UUID
  academicPeriodId UUID
  status           EnrollmentStatus @default(ACTIVE)
  enrolledAt       DateTime         @default(now())
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  institution    Institution     @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  student        Student         @relation(fields: [studentId], references: [id], onDelete: Restrict)
  course         Course          @relation(fields: [courseId], references: [id], onDelete: Restrict)
  schoolGrade    SchoolGrade     @relation(fields: [schoolGradeId], references: [id], onDelete: Restrict)
  academicPeriod AcademicPeriod  @relation(fields: [academicPeriodId], references: [id], onDelete: Restrict)
  taskAssignments TaskAssignment[]

  @@unique([institutionId, studentId, courseId, academicPeriodId])
  @@index([institutionId])
  @@index([institutionId, studentId])
  @@index([institutionId, courseId])
  @@index([institutionId, schoolGradeId])
  @@index([institutionId, academicPeriodId])
  @@index([institutionId, status])
}
```

## Enums

```prisma
enum EnrollmentStatus {
  ACTIVE
  INACTIVE
  WITHDRAWN
}
```

## Endpoints

| Method | Path | Permission | Body/Query | Response |
|--------|------|------------|------------|----------|
| POST | `/enrollments` | `enrollments:manage` | CreateEnrollmentDto | 201 Enrollment |
| GET | `/enrollments` | `enrollments:read` | ListEnrollmentsQueryDto | Paginated list |
| GET | `/enrollments/:id` | `enrollments:read` | — | Enrollment |
| PATCH | `/enrollments/:id` | `enrollments:manage` | UpdateEnrollmentDto | Enrollment |
| PATCH | `/enrollments/:id/deactivate` | `enrollments:manage` | — | Enrollment |

## DTOs

**CreateEnrollmentDto**: studentId (required), courseId (required), schoolGradeId (required), academicPeriodId (required)
**UpdateEnrollmentDto**: status (optional, EnrollmentStatus enum)
**ListEnrollmentsQueryDto**: page (default 1), limit (default 20, max 100), studentId, courseId, schoolGradeId, academicPeriodId

## API Types

```typescript
type EnrollmentStatus = 'ACTIVE' | 'INACTIVE' | 'WITHDRAWN';

interface Enrollment {
  id: string;
  institutionId: string;
  studentId: string;
  courseId: string;
  schoolGradeId: string;
  academicPeriodId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateEnrollmentInput {
  studentId: string;
  courseId: string;
  schoolGradeId: string;
  academicPeriodId: string;
}

interface UpdateEnrollmentInput {
  status?: EnrollmentStatus;
}
```

## Hooks

| Hook | Type | Description |
|------|------|-------------|
| `useEnrollments` | Query | Paginated list with filters (studentId, courseId, schoolGradeId, academicPeriodId) |
| `useEnrollment` | Query | Single enrollment by ID |
| `useCreateEnrollment` | Mutation | Create (POST) |
| `useUpdateEnrollment` | Mutation | Update status (PATCH) |
| `useDeactivateEnrollment` | Mutation | Deactivate (PATCH /deactivate) |

## Pages

| Page | Route | Description |
|------|-------|-------------|
| `EnrollmentsPage` | `/enrollments` | List with 4 filter dropdowns, responsive table + cards |
| `EnrollmentDetailPage` | `/enrollments/:id` | Detail with related entity names, deactivate/withdraw actions |
| `EnrollmentFormPage` | `/enrollments/new` | Create form with entity selectors |

## Routing

| Route | Page | Access |
|-------|------|--------|
| `/enrollments` | EnrollmentsPage | `enrollments:read` |
| `/enrollments/new` | EnrollmentFormPage | `enrollments:manage` |
| `/enrollments/:id` | EnrollmentDetailPage | `enrollments:read` |

No edit route — only status can be updated.

## Search / Filters / Pagination

- **No text search** — backend does not support search parameter
- **Filters**: studentId, courseId, schoolGradeId, academicPeriodId (all via dropdown selectors)
- **Pagination**: page, limit (default 20, max 100)
- **Sort**: by createdAt descending (backend)

## Relations

Backend returns flat Enrollment entity (IDs only). Frontend resolves display names:
- List page: fetches all students/courses/schoolGrades/academicPeriods for lookup maps
- Detail page: fetches individual related entities via existing hooks

## Enrollment Lifecycle

- **ACTIVE** → default status on creation
- **INACTIVE** → via PATCH /deactivate or PATCH with status: 'INACTIVE'
- **WITHDRAWN** → via PATCH with status: 'WITHDRAWN'

Only ACTIVE enrollments can be deactivated or withdrawn.

## Form Validation

- All 4 fields required (studentId, courseId, schoolGradeId, academicPeriodId)
- No UUID validation needed — selectors only
- Backend validates: entity existence, tenant scope, composite unique constraint

## UI/UX

- Spanish language throughout
- Filter dropdowns populated from related entities
- "Limpiar filtros" button when filters active
- Detail page shows resolved entity names (not UUIDs)
- Confirmation modals for deactivate and withdraw actions
- Status badges: ACTIVE=green, INACTIVE=gray, WITHDRAWN=yellow

## Responsive Behavior

- Desktop: table with columns (Estudiante, Curso, Grado, Periodo, Estado, Fecha, Acciones)
- Mobile: card view with all information
- Filter dropdowns stack vertically on mobile
- Pagination at bottom

## Multi-tenancy

- institutionId injected by TenantContextGuard via X-Institution-Id header
- No institutionId in forms or user input
- Backend validates tenant scope on all operations

## Security Review

- No secrets, tokens, or passwords
- No console.log, eval, dangerouslySetInnerHTML
- No localStorage/sessionStorage manipulation
- RBAC via usePermissions + PERMISSIONS constants
- Backend authorization is authoritative

## Tests

- `enrollments-hooks.test.tsx`: 7 tests (useEnrollments ×3, useEnrollment ×2, useCreateEnrollment, useUpdateEnrollment, useDeactivateEnrollment)
- `enrollments-pages.test.tsx`: 22 tests (EnrollmentsPage: 7, EnrollmentDetailPage: 8, EnrollmentFormPage: 7)

## Known Limitations

1. **No edit page**: Backend only supports status update via PATCH. No full edit form.
2. **No text search**: Backend list endpoint only supports ID-based filters, not text search.
3. **Selector performance**: List page fetches all related entities (up to 200 each) for display. For large datasets, this could be optimized with search-as-you-type.
4. **No batch operations**: Each enrollment must be created individually.
