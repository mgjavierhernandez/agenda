# PROMPT 30 — Frontend Courses Module

## Scope

Complete CRUD, search, pagination, filtering, RBAC, and tests for the Courses section in the React frontend.

## Implementation Summary

### Backend Contract Verified

- **Endpoints**: GET `/courses` (list), GET `/courses/:id`, POST `/courses`, PATCH `/courses/:id`, PATCH `/courses/:id/deactivate`
- **Permissions**: `courses:read` (read), `courses:manage` (CRUD)
- **Fields**: id, institutionId, code, name, description, status, createdAt, updatedAt
- **Status enum**: ACTIVE | INACTIVE
- **Search**: case-insensitive on `code` and `name` only
- **Pagination**: `{ data: Course[], meta: { page, limit, total, totalPages } }`
- **No relations returned** in any endpoint response

### Files Created

| File | Description |
|------|-------------|
| `src/modules/courses/index.ts` | Module barrel export |
| `src/modules/courses/hooks/useCourses.ts` | List courses with search/pagination/status filter |
| `src/modules/courses/hooks/useCourse.ts` | Single course fetch by ID |
| `src/modules/courses/hooks/useCreateCourse.ts` | Create course mutation |
| `src/modules/courses/hooks/useUpdateCourse.ts` | Update course mutation |
| `src/modules/courses/hooks/useDeactivateCourse.ts` | Deactivate course mutation |
| `src/modules/courses/hooks/index.ts` | Hooks barrel export |
| `src/modules/courses/pages/CoursesPage.tsx` | List page (search, status filter, table, mobile cards, pagination) |
| `src/modules/courses/pages/CourseDetailPage.tsx` | Detail page (info, actions, deactivate modal) |
| `src/modules/courses/pages/CourseFormPage.tsx` | Create/edit form (validation, API errors, textarea for description) |
| `src/modules/courses/__tests__/courses-page.test.tsx` | 5 tests |
| `src/modules/courses/__tests__/course-detail-page.test.tsx` | 5 tests |
| `src/modules/courses/__tests__/course-form-page.test.tsx` | 3 tests |

### Files Modified

| File | Changes |
|------|---------|
| `src/api/types.ts` | Added `CourseStatus`, `Course`, `CreateCourseInput`, `UpdateCourseInput`, `ListCoursesParams` |
| `src/app/router.tsx` | Added 4 routes: `/courses`, `/courses/new`, `/courses/:id`, `/courses/:id/edit` |

### Key Differences from Students

- **Status filter**: CoursesPage includes a status dropdown filter (backend supports `status` query param)
- **Description**: Optional textarea field in form (max 1000 chars)
- **Code field**: Unique per institution, displayed as monospace in table/detail
- **No documentType/dateOfBirth**: Simpler entity than Student

### Validation Results

| Check | Status |
|-------|--------|
| TypeCheck | ✅ |
| Lint | ✅ |
| Build | ✅ (378KB JS, 23KB CSS) |
| Tests | ✅ (39/39) |
