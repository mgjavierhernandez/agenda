# PROMPT 29 — Frontend Students Module

## Scope

Complete CRUD, search, pagination, filtering, RBAC, and tests for the Students section in the React frontend.

## Implementation Summary

### Files Created

| File | Description |
|------|-------------|
| `src/modules/students/index.ts` | Module barrel export |
| `src/modules/students/hooks/useStudents.ts` | List students with search/pagination |
| `src/modules/students/hooks/useStudent.ts` | Single student fetch by ID |
| `src/modules/students/hooks/useCreateStudent.ts` | Create student mutation |
| `src/modules/students/hooks/useUpdateStudent.ts` | Update student mutation |
| `src/modules/students/hooks/useDeactivateStudent.ts` | Deactivate student mutation |
| `src/modules/students/hooks/index.ts` | Hooks barrel export |
| `src/modules/students/pages/StudentsPage.tsx` | List page (search, table, mobile cards, pagination) |
| `src/modules/students/pages/StudentDetailPage.tsx` | Detail page (info, actions, deactivate modal) |
| `src/modules/students/pages/StudentFormPage.tsx` | Create/edit form (validation, API errors) |
| `src/modules/students/__tests__/students-page.test.tsx` | 5 tests |
| `src/modules/students/__tests__/student-detail-page.test.tsx` | 5 tests |
| `src/modules/students/__tests__/student-form-page.test.tsx` | 3 tests |

### Files Modified

| File | Changes |
|------|---------|
| `src/api/types.ts` | Added `Student`, `CreateStudentInput`, `UpdateStudentInput`, `ListStudentsParams`, `PaginatedApiResponse<T>`, `StudentStatus`, `DocumentType` |
| `src/app/router.tsx` | Added 4 routes: `/students`, `/students/new`, `/students/:id`, `/students/:id/edit` |

### Key Patterns

- **Hooks**: All mutations use `useMutation` + `useQueryClient().invalidateQueries()`
- **Pagination**: `PaginatedApiResponse<T>` matches backend `{ data, meta: { page, limit, total, totalPages } }`
- **RBAC**: Pages check `students:read` / `students:manage` via `usePermissions()`
- **Responsive**: Desktop table + mobile cards in `StudentsPage`
- **Forms**: `react-hook-form` with `onSubmit` validation for required fields

### Validation Results

| Check | Status |
|-------|--------|
| TypeCheck | ✅ |
| Lint | ✅ |
| Build | ✅ (365KB JS, 22KB CSS) |
| Tests | ✅ (26/26) |
| Backend E2E | ✅ (551/553, 2 pre-existing tenant failures) |
