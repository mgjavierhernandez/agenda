# Frontend: School Grades Module

## Overview

Complete CRUD module for managing academic school grades (preescolar, primer grado, etc.) in the Agenda Escolar Digital. Includes list page with search and pagination, detail page with management actions, and create/edit form with validation.

**Backend endpoints (5):**
| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/school-grades` | Create school grade (201) | `school-grades:manage` |
| GET | `/school-grades` | List paginated + search + sort | `school-grades:read` |
| GET | `/school-grades/:id` | Get by ID | `school-grades:read` |
| PATCH | `/school-grades/:id` | Update | `school-grades:manage` |
| PATCH | `/school-grades/:id/deactivate` | Deactivate (set INACTIVE) | `school-grades:manage` |

No DELETE endpoint — deactivation only.

## Types

```typescript
type SchoolGradeStatus = 'ACTIVE' | 'INACTIVE';

interface SchoolGrade {
  id: string;
  institutionId: string;
  name: string;        // max 100 chars
  code: string;        // max 20 chars, unique per institution
  sortOrder: number;   // default 0, ascending display order
  status: SchoolGradeStatus;
  createdAt: string;
  updatedAt: string;
}
```

## Hooks

| Hook | Mutation/Query | Description |
|------|---------------|-------------|
| `useSchoolGrades` | Query | Paginated list with search |
| `useSchoolGrade` | Query | Single grade by ID |
| `useCreateSchoolGrade` | Mutation | Create (POST) |
| `useUpdateSchoolGrade` | Mutation | Update (PATCH) |
| `useDeactivateSchoolGrade` | Mutation | Deactivate (PATCH /deactivate) |

## Pages

| Page | Route | Description |
|------|-------|-------------|
| `SchoolGradesPage` | `/school-grades` | List with search, pagination, responsive table + cards |
| `SchoolGradeDetailPage` | `/school-grades/:id` | Detail view with edit/deactivate actions |
| `SchoolGradeFormPage` | `/school-grades/new`, `/school-grades/:id/edit` | Create/edit form |

## Sidebar

Entry: `Grados académicos` with `🎓` icon, guarded by `SCHOOL_GRADES_READ` permission.

## Tests

- `school-grades-hooks.test.tsx`: 5 tests (useSchoolGrades, useSchoolGrade, useCreateSchoolGrade, useUpdateSchoolGrade, useDeactivateSchoolGrade)
- `school-grades-pages.test.tsx`: 24 tests (SchoolGradesPage: 7, SchoolGradeDetailPage: 9, SchoolGradeFormPage: 8)

## Key Details

- Unique constraint: `(institutionId, code)` — backend enforces
- `sortOrder` field determines display order (ascending)
- No delete endpoint — only deactivation (set status to INACTIVE)
- Active grades show deactivate button; inactive grades do not
- Search: case-insensitive on name and code
- Sort: by `sortOrder` ascending (handled by backend)
- Form validates: name required (max 100), code required (max 20), sortOrder non-negative integer
- Date display: `toLocaleString('es-CO')`
- Permissions: `school-grades:read` (all roles), `school-grades:manage` (admin only)
