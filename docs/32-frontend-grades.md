# PROMPT 32 — Frontend Grades Module

## Scope

Complete CRUD, search, pagination, filtering, RBAC, and tests for the Grades (Calificaciones) section in the React frontend.

## Implementation Summary

### Backend Contract Verified

- **Endpoints**: GET `/grades` (list), GET `/grades/:id`, POST `/grades`, PATCH `/grades/:id`, PATCH `/grades/:id/deactivate`
- **Permissions**: `grades:read` (read), `grades:manage` (CRUD)
- **Fields**: id, institutionId, studentId, courseId, subjectId, value (Decimal string), period, evaluationType, description, status, createdAt, updatedAt
- **Status enum**: ACTIVE | INACTIVE
- **Value range**: 0–5 (Decimal(5,2), returned as string)
- **Search**: case-insensitive on period, evaluationType, description
- **Filters**: studentId, courseId, subjectId, period (partial match), status
- **Pagination**: `{ data: Grade[], meta: { page, limit, total, totalPages } }`
- **No relations returned** — only foreign key IDs (studentId, courseId, subjectId)
- **Deactivate**: soft-delete via PATCH /grades/:id/deactivate

### Key Design Decision

The backend returns only foreign key IDs for student, course, and subject — no names. For the form page, dropdowns fetch full lists from the respective modules (useStudents, useCourses, useSubjects) to display human-readable labels. For list/detail pages, truncated UUIDs are shown.

### Files Created

| File | Description |
|------|-------------|
| `src/modules/grades/index.ts` | Module barrel export |
| `src/modules/grades/hooks/useGrades.ts` | List grades with search/pagination/status/student/course/subject/period filters |
| `src/modules/grades/hooks/useGrade.ts` | Single grade fetch by ID |
| `src/modules/grades/hooks/useCreateGrade.ts` | Create grade mutation |
| `src/modules/grades/hooks/useUpdateGrade.ts` | Update grade mutation |
| `src/modules/grades/hooks/useDeactivateGrade.ts` | Deactivate grade mutation |
| `src/modules/grades/hooks/index.ts` | Hooks barrel export |
| `src/modules/grades/pages/GradesPage.tsx` | List page (search, status/period filters, table, mobile cards, pagination) |
| `src/modules/grades/pages/GradeDetailPage.tsx` | Detail page (info, relations, actions, deactivate modal) |
| `src/modules/grades/pages/GradeFormPage.tsx` | Create/edit form with relation dropdowns (student, course, subject) |
| `src/modules/grades/__tests__/grades-page.test.tsx` | 5 tests |
| `src/modules/grades/__tests__/grade-detail-page.test.tsx` | 5 tests |
| `src/modules/grades/__tests__/grade-form-page.test.tsx` | 3 tests |

### Files Modified

| File | Changes |
|------|---------|
| `src/api/types.ts` | Added `GradeStatus`, `Grade`, `CreateGradeInput`, `UpdateGradeInput`, `ListGradesParams` |
| `src/app/router.tsx` | Added 4 routes: `/grades`, `/grades/new`, `/grades/:id`, `/grades/:id/edit` |
| `README.md` | Updated test count and features |

### Validation Results

| Check | Status |
|-------|--------|
| TypeCheck | ✅ |
| Lint | ✅ |
| Build | ✅ (407KB JS, 23KB CSS) |
| Tests | ✅ (65/65) |
