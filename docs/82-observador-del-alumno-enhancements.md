# PROMPT 82 — OBSERVADOR DEL ALUMNO — ENHANCEMENTS

## 1. Executive Summary

Implemented four enhancements to the Student Follow-Up module (Observador del Alumno), closing GAPs 004, 005, 006, and 008. Changes span backend services, helpers, and frontend UI. All modifications maintain tenant isolation, RBAC, confidentiality matrix, and existing patterns.

## 2. Changes Overview

| GAP | Feature | Backend | Frontend | Tests |
|-----|---------|---------|----------|-------|
| GAP-004 | OVERDUE auto-computation | New helper + integration | effectiveStatus in types | 13 unit tests |
| GAP-005 | Responsible User Picker | Institution membership validation | User picker in commitment form | 3 unit tests |
| GAP-006 | Entry Edit UI | Already existed (updateEntry) | Inline edit UI with form | 2 unit tests |
| GAP-008 | Additional Filters UI | Already supported all params | Category + date range filters | UI integration |

## 3. GAP-004 — OVERDUE Auto-Computation

### 3.1 Approach
Derived status at read time. No scheduler exists in the project, so OVERDUE is computed dynamically when commitments are queried.

### 3.2 Backend

**New file:** `apps/api/src/modules/student-follow-ups/commitment-overdue.helper.ts`

```typescript
deriveCommitmentStatus(dueDate, currentStatus) → CommitmentStatus
deriveCommitmentStatuses(commitments) → Map<string, CommitmentStatus>
```

- Uses date-only UTC comparison (`Date.UTC`) to avoid timezone issues
- Only `PENDING` commitments can become `OVERDUE`
- Returns original status for all other cases (COMPLETED, CANCELLED)

**Integration points:**
- `findCommitments()` — adds `effectiveStatus` to each commitment response
- `findCommitment()` — adds `effectiveStatus` to single commitment response

### 3.3 Frontend

**Modified:** `apps/web/src/api/types.ts`
- Added `effectiveStatus?: CommitmentStatus` to `Commitment` interface

**Modified:** `apps/web/src/modules/student-follow-ups/pages/StudentFollowUpDetailPage.tsx`
- Commitment badges now display `effectiveStatus` when available, falling back to `status`

### 3.4 Tests
- `commitment-overdue.helper.spec.ts` — 13 tests covering:
  - PENDING + overdue dueDate → OVERDUE
  - PENDING + future dueDate → PENDING
  - PENDING + today → PENDING (end of day)
  - COMPLETED + overdue → COMPLETED (not overridden)
  - CANCELLED + overdue → CANCELLED
  - Bulk derivation with mixed statuses
  - Null dueDate handling

## 4. GAP-005 — Responsible User Picker

### 4.1 Backend

**Modified:** `apps/api/src/modules/student-follow-ups/student-follow-ups.service.ts`

Added institution membership validation in both `createCommitment()` and `updateCommitment()`:
- Verifies `userInstitution` exists for the given `responsibleUserId` and `institutionId`
- Throws `BadRequestException` if user is not a member of the institution

### 4.2 Frontend

**New file:** `apps/web/src/modules/student-follow-ups/hooks/useUsers.ts`
- Fetches active users from `GET /users` with `limit=200` and `status=ACTIVE`
- Supports optional search parameter

**Modified:** `apps/web/src/modules/student-follow-ups/hooks/index.ts`
- Added `useUsers` export

**Modified:** `apps/web/src/modules/student-follow-ups/pages/StudentFollowUpDetailPage.tsx`
- Added user picker dropdown in commitment creation form
- Defaults to follow-up creator when no user selected
- Shows user name options from `useUsers` hook

### 4.3 Tests
- `useUsers.test.tsx` — 3 tests:
  - Fetches active users with default params
  - Includes search param when provided
  - Sets limit=200 and status=ACTIVE
- `useFollowUpCommitments.test.tsx` — 3 tests:
  - Fetches commitments for a follow-up
  - Does not fetch when followUpId is empty
  - Returns commitment with effectiveStatus when provided

## 5. GAP-006 — Entry Edit UI

### 5.1 Backend
Already existed: `updateEntry()` method in service, `useUpdateFollowUpEntry` hook in frontend.

### 5.2 Frontend

**Modified:** `apps/web/src/modules/student-follow-ups/pages/StudentFollowUpDetailPage.tsx`
- Added edit button per entry (visible to users with `canFollowUp` permission when follow-up is not closed)
- Inline edit form with entry type select and content textarea
- Save/cancel buttons with loading state
- Cache invalidation on save

### 5.3 Tests
- `useUpdateFollowUpEntry.test.tsx` — 2 tests:
  - Updates an entry via PATCH
  - Sends partial updates

## 6. GAP-008 — Additional Filters UI

### 6.1 Backend
Already supported: `studentId`, `categoryId`, `createdFrom`, `createdTo` query parameters in `ListStudentFollowUpsQueryDto`.

### 6.2 Frontend

**Modified:** `apps/web/src/modules/student-follow-ups/pages/StudentFollowUpsPage.tsx`
- Added category filter dropdown (fetched from `useFollowUpCategories`)
- Added date range filters (createdFrom, createdTo)
- Clear filters button now resets all new filters
- `hasActiveFilters` includes new filter states

**Modified:** `apps/web/src/modules/student-follow-ups/hooks/useUsers.ts`
- Fixed TypeScript error: `apiClient.get()` already returns parsed JSON, removed `.json()` call

## 7. Files Modified/Created

### Backend (apps/api/)
| File | Action |
|------|--------|
| `student-follow-ups.service.ts` | Modified — institution validation + effectiveStatus |
| `commitment-overdue.helper.ts` | **Created** — OVERDUE derivation logic |
| `commitment-overdue.helper.spec.ts` | **Created** — 13 unit tests |
| `student-follow-ups.service.spec.ts` | Modified — mocks updated |
| `follow-up-notification.helper.ts` | Created (PROMPT 81) |
| `follow-up-notification.helper.spec.ts` | Created (PROMPT 81) |

### Frontend (apps/web/)
| File | Action |
|------|--------|
| `src/api/types.ts` | Modified — effectiveStatus field |
| `src/modules/student-follow-ups/hooks/useUsers.ts` | **Created** — user list hook |
| `src/modules/student-follow-ups/hooks/useUpdateFollowUpEntry.ts` | Existed — now integrated |
| `src/modules/student-follow-ups/hooks/index.ts` | Modified — useUsers export |
| `src/modules/student-follow-ups/pages/StudentFollowUpDetailPage.tsx` | Modified — user picker + entry edit + effectiveStatus |
| `src/modules/student-follow-ups/pages/StudentFollowUpsPage.tsx` | Modified — additional filters |
| `src/modules/student-follow-ups/__tests__/useUsers.test.tsx` | **Created** — 3 tests |
| `src/modules/student-follow-ups/__tests__/useUpdateFollowUpEntry.test.tsx` | **Created** — 2 tests |
| `src/modules/student-follow-ups/__tests__/useFollowUpCommitments.test.tsx` | **Created** — 3 tests |

## 8. Test Results

| Suite | Suites | Tests | Status |
|-------|--------|-------|--------|
| API (Jest) | 36 | 641 | All pass |
| Web (Vitest) | 55 | 426 | All pass |
| **Total** | **91** | **1,067** | **All pass** |

## 9. Constraints Respected

- No commits, pushes, or tags — working tree only
- Tenant isolation maintained (institution validation added)
- RBAC unchanged (permission checks preserved)
- Confidentiality matrix unchanged
- SUPER_ADMIN denial preserved
- Resource-level authorization preserved
- PROMPT 70-81 work untouched
- No new database migrations required
- No new API endpoints created
- Existing notification system not modified

## 10. Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Derived OVERDUE at read time | No scheduler exists in project; avoids async complexity |
| User picker via GET /users | Reuses existing endpoint; no new backend needed |
| Inline entry edit | Simpler than modal; maintains context |
| Category filter via existing hook | useFollowUpCategories already existed |
| Date filters as native inputs | Simple, no external dependencies |
