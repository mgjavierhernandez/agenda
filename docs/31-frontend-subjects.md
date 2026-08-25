# PROMPT 31 — Frontend Subjects Module

## Scope

Complete CRUD, search, pagination, filtering, RBAC, and tests for the Subjects (Asignaturas) section in the React frontend.

## Implementation Summary

### Backend Contract Verified

- **Endpoints**: GET `/subjects` (list), GET `/subjects/:id`, POST `/subjects`, PATCH `/subjects/:id`, PATCH `/subjects/:id/deactivate`
- **Permissions**: `subjects:read` (read), `subjects:manage` (CRUD)
- **Fields**: id, institutionId, code, name, description, status, createdAt, updatedAt
- **Status enum**: ACTIVE | INACTIVE
- **Search**: case-insensitive on `code` and `name` only
- **Pagination**: `{ data: Subject[], meta: { page, limit, total, totalPages } }`
- **No relations returned** in any endpoint response
- **Unique constraint**: `[institutionId, code]` — code unique per institution

### Files Created

| File | Description |
|------|-------------|
| `src/modules/subjects/index.ts` | Module barrel export |
| `src/modules/subjects/hooks/useSubjects.ts` | List subjects with search/pagination/status filter |
| `src/modules/subjects/hooks/useSubject.ts` | Single subject fetch by ID |
| `src/modules/subjects/hooks/useCreateSubject.ts` | Create subject mutation |
| `src/modules/subjects/hooks/useUpdateSubject.ts` | Update subject mutation |
| `src/modules/subjects/hooks/useDeactivateSubject.ts` | Deactivate subject mutation |
| `src/modules/subjects/hooks/index.ts` | Hooks barrel export |
| `src/modules/subjects/pages/SubjectsPage.tsx` | List page (search, status filter, table, mobile cards, pagination) |
| `src/modules/subjects/pages/SubjectDetailPage.tsx` | Detail page (info, actions, deactivate modal) |
| `src/modules/subjects/pages/SubjectFormPage.tsx` | Create/edit form (validation, API errors, textarea for description) |
| `src/modules/subjects/__tests__/subjects-page.test.tsx` | 5 tests |
| `src/modules/subjects/__tests__/subject-detail-page.test.tsx` | 5 tests |
| `src/modules/subjects/__tests__/subject-form-page.test.tsx` | 3 tests |

### Files Modified

| File | Changes |
|------|---------|
| `src/api/types.ts` | Added `SubjectStatus`, `Subject`, `CreateSubjectInput`, `UpdateSubjectInput`, `ListSubjectsParams` |
| `src/app/router.tsx` | Added 4 routes: `/subjects`, `/subjects/new`, `/subjects/:id`, `/subjects/:id/edit` |
| `README.md` | Updated test count and features |

### Validation Results

| Check | Status |
|-------|--------|
| TypeCheck | ✅ |
| Lint | ✅ |
| Build | ✅ (390KB JS, 23KB CSS) |
| Tests | ✅ (52/52) |
