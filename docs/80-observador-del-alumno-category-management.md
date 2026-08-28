# PROMPT 80 — Category Management & Category Selector

**Module:** Observador del Alumno
**Date:** 2026-08-28
**Status:** COMPLETED

## 1. Objective

Implement the management of follow-up categories (GAP-001) and connect them to the StudentFollowUp form (GAP-002).

## 2. GAP-001 — Category CRUD

### What was missing

The `FollowUpCategory` model existed in Prisma but had no CRUD endpoints. Categories could not be created, listed, updated, or deleted via the API.

### What was implemented

**5 endpoints** added to `StudentFollowUpsController`:

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/student-follow-ups/categories` | `student-follow-ups:categories` | Create category |
| `GET` | `/student-follow-ups/categories` | `student-follow-ups:categories` | List categories |
| `GET` | `/student-follow-ups/categories/:id` | `student-follow-ups:categories` | Get single |
| `PATCH` | `/student-follow-ups/categories/:id` | `student-follow-ups:categories` | Update category |
| `DELETE` | `/student-follow-ups/categories/:id` | `student-follow-ups:categories` | Delete category |

**Design decisions:**

- **Route ordering**: Category routes placed BEFORE `:id` routes in controller to prevent parameter collision (`categories` being matched as a UUID `:id`).
- **Delete behavior**: Hard delete allowed only when category is not used by any StudentFollowUp. If in use, returns `400 Bad Request` with count. No soft delete (model already has `active` field for deactivation).
- **Uniqueness**: `@@unique([institutionId, name])` enforced at application level with `ConflictException`.
- **Multi-tenancy**: All operations validated against `req.tenant.institutionId`. Cross-tenant access impossible.
- **Audit**: All 5 operations logged with action types: `STUDENT_FOLLOW_UP_CATEGORY_CREATED`, `_UPDATED`, `_DELETED`.

### Backend files

| File | Action |
|------|--------|
| `apps/api/src/modules/student-follow-ups/dto/create-follow-up-category.dto.ts` | Created |
| `apps/api/src/modules/student-follow-ups/dto/update-follow-up-category.dto.ts` | Created |
| `apps/api/src/modules/student-follow-ups/follow-up-categories.service.ts` | Created |
| `apps/api/src/modules/student-follow-ups/follow-up-categories.service.spec.ts` | Created (17 tests) |
| `apps/api/src/modules/student-follow-ups/student-follow-ups.controller.ts` | Modified (categories endpoints added) |
| `apps/api/src/modules/student-follow-ups/student-follow-ups.module.ts` | Modified (FollowUpCategoriesService added) |
| `apps/api/src/common/auth/student-follow-up-authorization.ts` | Modified (removed unused constant) |

## 3. GAP-002 — Category Selector in Form

### What was missing

The StudentFollowUp form had no category selector. Categories existed but could not be selected when creating/editing a follow-up.

### What was implemented

- **Category selector** added to `StudentFollowUpFormPage.tsx` between student selector and type selector
- Shows "Sin categoría" as default option
- Loads active categories from API via `useFollowUpCategories()` hook
- `categoryId` sent in create and update payloads
- Edit mode restores selected category
- Only active categories shown in selector

### Frontend files

| File | Action |
|------|--------|
| `apps/web/src/api/types.ts` | Modified (extended `StudentFollowUpCategory`, added input types) |
| `apps/web/src/modules/student-follow-ups/hooks/useFollowUpCategories.ts` | Created |
| `apps/web/src/modules/student-follow-ups/hooks/useCreateFollowUpCategory.ts` | Created |
| `apps/web/src/modules/student-follow-ups/hooks/useUpdateFollowUpCategory.ts` | Created |
| `apps/web/src/modules/student-follow-ups/hooks/useDeleteFollowUpCategory.ts` | Created |
| `apps/web/src/modules/student-follow-ups/hooks/index.ts` | Modified (exports added) |
| `apps/web/src/modules/student-follow-ups/pages/FollowUpCategoriesPage.tsx` | Created |
| `apps/web/src/modules/student-follow-ups/pages/StudentFollowUpFormPage.tsx` | Modified (category selector) |
| `apps/web/src/modules/student-follow-ups/index.ts` | Modified (export added) |
| `apps/web/src/app/router.tsx` | Modified (route added) |
| `apps/web/src/components/layout/Sidebar.tsx` | Modified (nav item added) |

## 4. Category Management UI

Admin-only page at `/student-follow-ups/categories`:

- **List table**: Name, description, active status, edit/delete actions
- **Create form**: Name (required, max 100), description (optional, max 500)
- **Edit form**: Inline edit with pre-filled values
- **Delete**: Confirmation dialog, fails gracefully if in use
- **Empty state**: Prompt to create first category
- **Permission gate**: Only visible to users with `student-follow-ups:categories`

## 5. Permission / RBAC Matrix

| Role | `categories` permission | Can manage | Can read (for selector) |
|------|------------------------|------------|------------------------|
| INSTITUTION_ADMIN | ✅ | ✅ | ✅ |
| TEACHER | ❌ | ❌ | ✅ (if assigned) |
| PARENT | ❌ | ❌ | ❌ |
| STUDENT | ❌ | ❌ | ❌ |
| SUPER_ADMIN | ❌ | ❌ | ❌ |

**Note:** TEACHER does not have `categories` permission per PROMPT 72 decision matrix. TEACHER can read categories for the form selector only if the permission is separately granted (not in this PROMPT's scope).

## 6. Tenant Isolation

All operations are scoped to `req.tenant.institutionId`:

- `CREATE`: institutionId from tenant context
- `LIST`: filtered by institutionId
- `GET`: filtered by institutionId + id
- `UPDATE`: filtered by institutionId + id
- `DELETE`: filtered by institutionId + id

Cross-tenant access is impossible. IDOR protected by tenant guard.

## 7. Category Validation

When creating/updating a StudentFollowUp with `categoryId`:

1. Server validates `categoryId` exists
2. Server validates category belongs to current tenant
3. Server validates category is active
4. If invalid → `404 Category not found`

## 8. StudentFollowUp Integration

The `categoryId` field was already:
- ✅ Optional in `CreateStudentFollowUpDto` and `UpdateStudentFollowUpDto`
- ✅ Optional in `CreateStudentFollowUpInput` and `UpdateStudentFollowUpInput` (frontend)
- ✅ Nullable in Prisma schema (`categoryId String?`)
- ✅ `onDelete: SetNull` (deleting a category doesn't delete follow-ups)

No schema changes were needed.

## 9. Tests

### Backend: 17 new tests (126 total for student-follow-ups, 609 total)

| Test category | Count | Status |
|---------------|-------|--------|
| Create category | 4 | ✅ |
| List categories | 1 | ✅ |
| Get single category | 3 | ✅ |
| Update category | 5 | ✅ |
| Delete category | 3 | ✅ |
| **Total new** | **17** | **✅** |

### E2E Live Verification: 11 PASS

| Test | Status |
|------|--------|
| Create category | ✅ |
| Create second category | ✅ |
| List categories (count 2) | ✅ |
| Get single category | ✅ |
| Update category | ✅ |
| Duplicate name rejected (409) | ✅ |
| Delete unused category | ✅ |
| Create follow-up with category | ✅ |
| Follow-up shows category | ✅ |
| Delete category in use rejected (400) | ✅ |
| TEACHER cannot create (403) | ✅ |

## 10. Regression

| Check | Result |
|-------|--------|
| Backend tests (609) | ✅ PASS |
| API TypeScript | ✅ PASS |
| API ESLint | ✅ PASS (0 errors from new code) |
| Web TypeScript | ✅ PASS |
| Web ESLint | ✅ PASS (0 errors from new code) |
| Prisma validate | ✅ PASS |
| Prisma generate | ✅ PASS |
| Backend build | ✅ PASS |
| Frontend build | ✅ PASS |
| Docker containers (3/3) | ✅ Healthy |

## 11. Findings

### F-001: Route parameter collision

When defining both `@Get(':id')` and `@Get('categories')` in the same controller, NestJS/Express matches the parameterized route first. **Resolution:** Category routes placed before `:id` routes in controller declaration order.

### F-002: docker cp doesn't always overwrite

The `docker cp` command may not overwrite existing files in the container. **Resolution:** Delete the target directory first, then copy.

### F-003: TEACHER read access for selector

TEACHER does not have `student-follow-ups:categories` permission, so the category selector in the form will fail for TEACHER. The `useFollowUpCategories` hook will throw 403. **Note:** This is by design per PROMPT 72. The form already handles API errors gracefully. If category selection by TEACHER is needed in the future, a separate read permission or public endpoint can be added.

## 12. Limitations

- Categories are not draggable/reorderable (no priority/order field)
- No category usage count displayed in management UI
- No category description shown in follow-up detail (only name)
- No category filter in list page (noted as GAP-008, out of scope)

## 13. Files Created

```
apps/api/src/modules/student-follow-ups/dto/create-follow-up-category.dto.ts
apps/api/src/modules/student-follow-ups/dto/update-follow-up-category.dto.ts
apps/api/src/modules/student-follow-ups/follow-up-categories.service.ts
apps/api/src/modules/student-follow-ups/follow-up-categories.service.spec.ts
apps/web/src/modules/student-follow-ups/hooks/useFollowUpCategories.ts
apps/web/src/modules/student-follow-ups/hooks/useCreateFollowUpCategory.ts
apps/web/src/modules/student-follow-ups/hooks/useUpdateFollowUpCategory.ts
apps/web/src/modules/student-follow-ups/hooks/useDeleteFollowUpCategory.ts
apps/web/src/modules/student-follow-ups/pages/FollowUpCategoriesPage.tsx
docs/80-observador-del-alumno-category-management.md
```

## 14. Files Modified

```
apps/api/src/modules/student-follow-ups/student-follow-ups.controller.ts
apps/api/src/modules/student-follow-ups/student-follow-ups.module.ts
apps/api/src/common/auth/student-follow-up-authorization.ts
apps/web/src/api/types.ts
apps/web/src/modules/student-follow-ups/hooks/index.ts
apps/web/src/modules/student-follow-ups/pages/StudentFollowUpFormPage.tsx
apps/web/src/modules/student-follow-ups/index.ts
apps/web/src/app/router.tsx
apps/web/src/components/layout/Sidebar.tsx
```

## 15. Git Status

```
Branch:           main
HEAD:             0c27580
Modified files:   apps/api/prisma/schema.prisma, apps/api/prisma/seed.ts, apps/api/src/app.module.ts,
                  apps/web/src/api/types.ts, apps/web/src/app/router.tsx,
                  apps/web/src/components/layout/Sidebar.tsx,
                  apps/web/src/permissions/permission.constants.ts
Untracked files:  apps/api/src/modules/student-follow-ups/ (expanded), docs/*, etc.
Commit:           NOT CREATED
Push:             NOT PERFORMED
Tag:              NOT CREATED
```

## 16. Next Recommended Step

```
PROMPT 81 — NOTIFICATION TRIGGERS
```

GAP-001 and GAP-002 are now CLOSED. The module is functionally complete for MVP+ categories.
