# Prompt 33 — Frontend Schedules Module

## 1. Purpose

Implement the complete frontend Schedules module providing CRUD operations (list, detail, create, edit, deactivation) for class schedules, following the established patterns from Students, Courses, Subjects, and Grades modules.

## 2. Architecture

The module follows the exact same architecture as existing modules:

```
apps/web/src/modules/schedules/
├── index.ts                         # Barrel exports (3 page components)
├── hooks/
│   ├── index.ts                     # Barrel exports (5 hooks)
│   ├── useSchedules.ts             # GET /schedules (paginated list with filters)
│   ├── useSchedule.ts              # GET /schedules/:id (single entity)
│   ├── useCreateSchedule.ts        # POST /schedules
│   ├── useUpdateSchedule.ts        # PATCH /schedules/:id
│   └── useDeactivateSchedule.ts    # PATCH /schedules/:id/deactivate
├── pages/
│   ├── SchedulesPage.tsx           # List page with search, filters, pagination
│   ├── ScheduleDetailPage.tsx      # Detail view with actions
│   └── ScheduleFormPage.tsx        # Create/Edit form (reusable)
└── __tests__/
    ├── schedules-page.test.tsx
    ├── schedule-detail-page.test.tsx
    └── schedule-form-page.test.tsx
```

## 3. Routes

| Route | Component | Description |
| --- | --- | --- |
| `/schedules` | `SchedulesPage` | Schedule list with filters and pagination |
| `/schedules/new` | `ScheduleFormPage` | Create new schedule |
| `/schedules/:id` | `ScheduleDetailPage` | Schedule detail view |
| `/schedules/:id/edit` | `ScheduleFormPage` | Edit existing schedule |

## 4. API Endpoints Consumed

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/schedules` | List schedules (paginated, filtered) |
| `GET` | `/api/v1/schedules/:id` | Get single schedule |
| `POST` | `/api/v1/schedules` | Create schedule |
| `PATCH` | `/api/v1/schedules/:id` | Update schedule |
| `PATCH` | `/api/v1/schedules/:id/deactivate` | Deactivate schedule |

## 5. API Types

All types defined in `apps/web/src/api/types.ts`:

- `ScheduleStatus`: `'ACTIVE' | 'INACTIVE'`
- `DayOfWeek`: `'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'`
- `DAY_OF_WEEK_LABELS`: Spanish label mapping for day-of-week enum values
- `DAY_OF_WEEK_ORDER`: Ordered array of all day-of-week values
- `Schedule`: Full entity type with all fields from backend
- `CreateScheduleInput`: Required fields for creation (courseId, subjectId, dayOfWeek, startTime, endTime, optional classroom, status)
- `UpdateScheduleInput`: All optional fields for update
- `ListSchedulesParams`: Query parameters (page, limit, search, status, courseId, subjectId, dayOfWeek)

## 6. Hooks

### `useSchedules(params)`
- Builds URLSearchParams from filter parameters
- Uses React Query with key `['schedules', { ...filters }]`
- Supports: page, limit, search, status, courseId, subjectId, dayOfWeek
- Search filters on classroom field (backend-supported)

### `useSchedule(id)`
- Single schedule fetch, disabled when `id` is empty
- Key: `['schedules', id]`

### `useCreateSchedule()`
- POST mutation, invalidates `['schedules']` list on success
- Returns created schedule object (used for navigation)

### `useUpdateSchedule()`
- PATCH mutation, invalidates both list and detail cache
- Takes `{ id, data: UpdateScheduleInput }`

### `useDeactivateSchedule()`
- PATCH to `/:id/deactivate`, invalidates list cache
- Takes schedule ID string

## 7. Pages

### SchedulesPage
- **Header**: Title "Horarios", description, create button (manage permission only)
- **Search**: Debounced search (400ms) on classroom field
- **Filters**: Status (ACTIVE/INACTIVE), Day of Week (all 7 days)
- **Clear filters**: Single button clears all filters and resets page
- **Desktop**: Table with columns: Día, Inicio, Fin, Curso, Asignatura, Aula, Estado, Acciones
- **Mobile**: Card layout with day, time range, classroom, course ID (truncated), status badge
- **Pagination**: "Mostrando X-Y de Z" with Anterior/Siguiente buttons
- **States**: Loading (Spinner), Empty (EmptyState with contextual message), Error (ErrorState)

### ScheduleDetailPage
- **Header**: Day + time range as title, classroom as description
- **Actions**: Edit (manage), Deactivate (manage, ACTIVE only)
- **Grid layout**: Two cards (Info + Relations/Metadata)
- **Info card**: Día, Hora inicio, Hora fin, Aula, Estado (with Badge)
- **Relations card**: Curso ID, Asignatura ID, Schedule ID, Created, Updated
- **Deactivate**: Confirmation modal with Cancel/Desactivar buttons
- **Navigation**: "Volver a horarios" button

### ScheduleFormPage
- **Reusable** for create and edit (determined by route param)
- **Fields**: Course (select), Subject (select), Day of Week (select), Start Time (input), End Time (input), Classroom (input), Status (select)
- **Relation selectors**: Reuses `useCourses()` and `useSubjects()` for dropdowns
- **Validation**: Required fields, HH:MM time format regex, start < end, classroom max 100 chars
- **API errors**: Displayed via `getErrorMessage()` in red banner
- **Submit**: Creates or updates, navigates to detail page on success

## 8. Filters / Search / Pagination

### Supported Backend Filters
- `search`: Filters by classroom (case-insensitive contains)
- `status`: `ACTIVE` or `INACTIVE`
- `courseId`: Filter by course UUID
- `subjectId`: Filter by subject UUID
- `dayOfWeek`: Filter by day-of-week enum

### Frontend Filter Implementation
- **Search**: Text input with 400ms debounce, clears page to 1
- **Status**: Dropdown with "Todos", "Activo", "Inactivo"
- **Day of Week**: Dropdown with "Todos" + all 7 days in Spanish
- **Clear filters**: Single button when any filter is active
- **Note**: courseId and subjectId filters are supported by backend but not exposed in list page UI to keep UX simple (relations shown as truncated UUIDs in table)

### Pagination
- Standard pattern: page state, limit=20, "Mostrando X-Y de Z"
- Anterior/Siguiente buttons disabled at boundaries

## 9. RBAC

### Permissions Used
- `schedules:read` — View list and detail pages (also sidebar visibility)
- `schedules:manage` — Create, edit, deactivate actions

### Implementation
- Sidebar already has `/schedules` entry with `PERMISSIONS.SCHEDULES_READ`
- Create button hidden without `schedules:manage`
- Edit/Deactivate buttons hidden without `schedules:manage`
- Backend enforces authorization; frontend UI is not a security boundary

## 10. Tenant Isolation

- All API calls go through centralized `apiClient` which injects `X-Institution-Id` header
- No `institutionId` is sent from forms or URL parameters
- No manual tenant context manipulation
- Backend `TenantContextGuard` handles tenant scoping server-side

## 11. Relation Handling

- **Courses**: Uses `useCourses({ limit: 100 })` for create/edit form dropdowns
- **Subjects**: Uses `useSubjects({ limit: 100 })` for create/edit form dropdowns
- **Table display**: Shows truncated UUIDs for courseId/subjectId (consistent with Grades pattern)
- **No teacher/academicPeriod relations**: Backend Schedule model has no teacherUserId or academicPeriodId fields

## 12. Date/Time Handling

- **Backend representation**: `startTime` and `endTime` are `@db.Time` fields serialized as ISO strings (e.g., `"1970-01-01T08:00:00.000Z"`) by Prisma
- **Frontend display**: Shows raw time string from API response (preserving backend format)
- **Form input**: Accepts HH:MM format strings, validated with regex `/^([01]\d|2[0-3]):[0-5]\d$/`
- **Validation**: Client-side ensures startTime < endTime using string comparison (same format guaranteed by regex)
- **Day of week**: Backend enum `DayOfWeek` (MONDAY-SUNDAY), mapped to Spanish labels via `DAY_OF_WEEK_LABELS`
- **No timezone conversion**: Times are local school schedule times

## 13. Validation

### Client-Side Validation
- courseId: required
- subjectId: required
- dayOfWeek: required (default MONDAY)
- startTime: required, HH:MM format (regex validated)
- endTime: required, HH:MM format (regex validated)
- startTime < endTime (string comparison after format validation)
- classroom: optional, max 100 characters

### Backend Validation
- Same constraints enforced server-side (DTOs with class-validator)
- Additionally validates: overlap detection, relation existence within tenant
- Backend remains the authoritative validation layer

## 14. Tests

### New Tests (14 tests)

**SchedulesPage (5 tests)**:
1. renders page title
2. shows empty state when no schedules
3. shows create button when user has manage permission
4. renders schedule list
5. navigates to detail on click

**ScheduleDetailPage (6 tests)**:
6. renders schedule day
7. shows schedule times
8. shows classroom
9. shows edit button when user has manage permission
10. shows deactivate button for active schedules
11. shows error state for 404

**ScheduleFormPage (3 tests)**:
12. renders create form
13. shows validation errors on empty submit
14. creates schedule on valid submit

### Test Counts
- **Previous baseline**: 65 tests (19 test files)
- **New tests**: 14
- **Total**: 79 tests (22 test files)
- **All passing**: ✅

## 15. Responsive Behavior

- **Desktop (md+)**: Full table with all columns, action buttons
- **Mobile (<md)**: Card layout with stacked information, "Ver detalle" button
- **Same responsive pattern** as Students, Courses, Subjects, Grades modules
- **Filters**: Stack vertically on mobile, inline on desktop
- **Pagination**: Consistent across all modules

## 16. Known Limitations

1. **Course/Subject display in table**: Shows truncated UUIDs instead of resolved names. This matches the Grades module pattern. A future enhancement could add `include` query parameters to the backend to return related entity names.
2. **No teacher assignment**: The backend Schedule model does not include teacherUserId. If teacher assignment is needed, a backend schema change would be required.
3. **No academic period**: The backend Schedule model does not include academicPeriodId.
4. **No bulk operations**: Only single schedule create/edit/deactivate.
5. **Search limited to classroom**: Backend search only filters by classroom field, not by course/subject names.

## 17. Security Review

- ✅ No `institutionId` sent from forms
- ✅ No tenant ID manually accepted from URL
- ✅ No password/token exposure
- ✅ Centralized API client used for all requests
- ✅ Permission gates applied (schedules:read, schedules:manage)
- ✅ No sensitive data stored in localStorage
- ✅ No arbitrary API URL construction
- ✅ Relation IDs come from trusted UI selections (dropdowns)
- ✅ Backend remains responsible for authorization
- ✅ No `dangerouslySetInnerHTML`
- ✅ No client-side authorization assumptions treated as security
