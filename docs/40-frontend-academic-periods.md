# PROMPT 40 - Periodos Académicos (Frontend)

## Executive Summary

Implementación completa del módulo frontend de **Academic Periods** (Periodos Académicos) para Agenda Escolar Digital. El módulo permite gestionar periodos académicos con CRUD completo, búsqueda, paginación, RBAC y lifecycle de desactivación.

## Backend Contract Verified

### Prisma Models

**AcademicPeriod** (`academic_periods`)
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | UUID | NO | PK |
| institutionId | UUID | NO | FK → Institution |
| name | VARCHAR(100) | NO | |
| code | VARCHAR(20) | NO | Unique per institution |
| startDate | DateTime (Date) | NO | @db.Date |
| endDate | DateTime (Date) | NO | @db.Date |
| status | AcademicPeriodStatus | NO | Default: ACTIVE |
| createdAt | DateTime | NO | |
| updatedAt | DateTime | NO | |

### Enums

**AcademicPeriodStatus**: `ACTIVE`, `INACTIVE`

### Unique Constraints

- `@@unique([institutionId, code])` — Code must be unique within an institution

### Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | /academic-periods | academic-periods:manage | Create period (201) |
| GET | /academic-periods | academic-periods:read | List periods (paginated) |
| GET | /academic-periods/:id | academic-periods:read | Get one period |
| PATCH | /academic-periods/:id | academic-periods:manage | Update period |
| PATCH | /academic-periods/:id/deactivate | academic-periods:manage | Deactivate period |

No DELETE endpoint exists. Deactivation is the only destructive lifecycle operation.

### Query Parameters (GET /academic-periods)

- `page` (default: 1), `limit` (default: 20, max: 100)
- `search` (free-text on name/code, case-insensitive)

### DTOs

**CreateAcademicPeriodDto**: `name` (required, max 100), `code` (required, max 20), `startDate` (required, ISO date), `endDate` (required, ISO date)

**UpdateAcademicPeriodDto**: All fields optional — `name`, `code`, `startDate`, `endDate`, `status`

### Permissions

| Role | academic-periods:read | academic-periods:manage |
|---|---|---|
| SUPER_ADMIN | YES | YES |
| INSTITUTION_ADMIN | YES | YES |
| TEACHER | YES | NO |
| PARENT | YES | NO |
| STUDENT | YES | NO |

### Business Rules

1. **Date order**: `startDate` must be strictly before `endDate`
2. **Code uniqueness**: Per institution (same code allowed across institutions)
3. **Tenant isolation**: All queries scoped to `institutionId`
4. **No DELETE**: Deactivation only (sets status to INACTIVE)
5. **No date overlap checking**: Multiple overlapping periods allowed
6. **No active period constraint**: Multiple active periods can coexist
7. **Partial date validation on update**: If only one date provided, validated against existing other date

## Frontend Implementation

### Files Created

```
apps/web/src/modules/academic-periods/
  index.ts                           # Barrel export
  hooks/
    index.ts                         # Hooks barrel
    useAcademicPeriods.ts            # Paginated list with search
    useAcademicPeriod.ts             # Single period by ID
    useCreateAcademicPeriod.ts       # Create mutation
    useUpdateAcademicPeriod.ts       # Update mutation
    useDeactivateAcademicPeriod.ts   # Deactivate mutation
  pages/
    AcademicPeriodsPage.tsx          # List with search, table + cards
    AcademicPeriodDetailPage.tsx     # Detail with edit/deactivate actions
    AcademicPeriodFormPage.tsx       # Create/Edit form
  __tests__/
    academic-periods-hooks.test.tsx  # 5 hook tests
    academic-periods-pages.test.tsx  # 25 page tests
```

### Files Modified

- `apps/web/src/api/types.ts` — Added AcademicPeriodStatus, AcademicPeriod, ListAcademicPeriodsParams, CreateAcademicPeriodInput, UpdateAcademicPeriodInput, ACADEMIC_PERIOD_STATUS_LABELS
- `apps/web/src/app/router.tsx` — Added 4 routes
- `apps/web/src/components/layout/Sidebar.tsx` — Added "Periodos académicos" entry

### Routes

- `/academic-periods` — AcademicPeriodsPage (list)
- `/academic-periods/new` — AcademicPeriodFormPage (create)
- `/academic-periods/:id` — AcademicPeriodDetailPage (detail)
- `/academic-periods/:id/edit` — AcademicPeriodFormPage (edit)

### Sidebar

- Entry "Periodos académicos" with 🗓️ icon, `ACADEMIC_PERIODS_READ` permission

### Key Behaviors

- **Date inputs**: Uses `type="date"` for `@db.Date` fields (no timezone issues)
- **Date validation**: Frontend validates `startDate < endDate` matching backend rule
- **Status badge**: Green for ACTIVE, gray for INACTIVE
- **Lifecycle**: Deactivate button only shown for ACTIVE periods with manage permission
- **Confirmation modal** for deactivate action
- **API error display** on form submit failure
- **No institutionId** sent from frontend (tenant context only)

## Tests

### Hook Tests (5)

- useAcademicPeriods: fetches paginated data, sends search param
- useAcademicPeriod: fetches by ID, skips when empty
- useCreateAcademicPeriod: creates and invalidates list
- useUpdateAcademicPeriod: updates with patch
- useDeactivateAcademicPeriod: deactivates

### Page Tests (25)

- AcademicPeriodsPage: header, empty state, table data, code, status badge, create button (shown/hidden by permission)
- AcademicPeriodDetailPage: details, code, status badge, edit/deactivate buttons (shown/hidden), back button, date fields
- AcademicPeriodFormPage: create form, form fields, required name/code validation, date order validation, edit form with existing data, permission check

**Total frontend tests: 237** (all passing)
**Backend regression: 15/15 academic-periods tests passing**
