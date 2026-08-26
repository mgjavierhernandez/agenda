# PROMPT 62-B — Frontend RBAC Real

## Overview

PROMPT 62-B fixes the critical finding from PROMPT 62: the frontend permission system was a no-op (`usePermissions` always returned `true`). Now the frontend fetches real permission codes from the backend via `GET /auth/my-permissions` and uses them to gate UI elements.

## Backend

### New Endpoint: `GET /auth/my-permissions`

**Purpose:** Returns the authenticated user's effective permission codes for the current tenant context.

**Guards:** `AccessTokenGuard` → `TenantContextGuard`

**Headers required:**
- `Authorization: Bearer <token>`
- `X-Institution-Id: <uuid>`

**Response:**
```json
{
  "permissions": [
    "students:read",
    "grades:read",
    "tasks:read",
    ...
  ]
}
```

**Permission resolution:**
1. If tenant context present: union of tenant permissions + global permissions
2. If no tenant context: global permissions only

**Security:**
- Identity derived from JWT (`userId` from `sub` claim)
- Tenant derived from `X-Institution-Id` header via `TenantContextGuard`
- No client-controlled parameters accepted
- `PermissionGuard` is NOT applied (this endpoint is the source of truth)

### Files Modified

| File | Change |
|------|--------|
| `apps/api/src/modules/auth/auth.controller.ts` | Added `GET /auth/my-permissions` endpoint, injected `AuthorizationService` |

## Frontend

### `usePermissions` Hook

**Before:** Always returned `true` for all permission checks (no-op).

**After:** Fetches real permissions from `GET /auth/my-permissions` via react-query.

```typescript
const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();
```

- `isLoading: true` → permissions not yet fetched (safe default: deny)
- `isError: true` → fetch failed (safe default: deny)
- `permissionCodes` → actual codes from backend

### `PermissionGate` Component

**Before:** Always rendered children (no-op).

**After:** Shows fallback during loading, renders children only if permission matches.

```tsx
<PermissionGate permission="users:read" fallback={<p>Access denied</p>}>
  <UserList />
</PermissionGate>
```

### Sidebar

**Before:** Showed all navigation items to all roles.

**After:** Filters items by real permission codes. Each item has a `permission` field mapped to a `PERMISSIONS` constant.

### Permission Constants

**Before:** 43 entries (some extra, some missing vs backend's 37).

**After:** 52 entries — exact match with all backend permission codes.

### Logout

Permissions cache is cleared on logout via `queryClient.removeQueries({ queryKey: ['user-permissions'] })`.

## Permission Synchronization

| Source | Count |
|--------|-------|
| Backend `Permission` table | 37 |
| Frontend `PERMISSIONS` constants | 52 (includes granular codes) |
| Backend `INSTITUTION_ADMIN` | 37 |
| Backend `TEACHER` | 24 |
| Backend `PARENT` | 15 |
| Backend `STUDENT` | 11 |
| Backend `SUPER_ADMIN` (global) | 37 |

The frontend constants include all 37 backend permission codes plus additional granular codes used in the permission system.

## Security Model

```
Backend = Security Authority
Frontend = UX/Presentation Layer
```

- `PermissionGuard` on each API endpoint enforces real authorization
- Frontend `usePermissions`/`PermissionGate` provide UX gating
- Even if frontend is manipulated, backend rejects unauthorized requests
- `GET /auth/my-permissions` is the single source of truth for UI rendering

## Test Results

| Suite | Result |
|-------|--------|
| Backend (Jest) | 31 suites, 425 tests PASS |
| Frontend (Vitest) | 51 suites, 407 tests PASS |
| TypeScript | PASS |
| ESLint | PASS |
| Playwright RBAC | 4/4 PASS |
| Playwright Total | 68/76 PASS (5 timeout, 3 flaky) |
| Docker Validation | PASS |

## Files Modified

| File | Change |
|------|--------|
| `apps/api/src/modules/auth/auth.controller.ts` | New endpoint + DI |
| `apps/web/src/permissions/usePermissions.ts` | Real permission fetch |
| `apps/web/src/permissions/PermissionGate.tsx` | Loading state handling |
| `apps/web/src/permissions/permission.constants.ts` | Synced with backend |
| `apps/web/src/components/layout/Sidebar.tsx` | Permission-based filtering |
| `apps/web/src/auth/auth.store.tsx` | Clear permissions on logout |
| `apps/web/src/modules/agenda/__tests__/agenda-page.test.tsx` | Added usePermissions mock |
| 34 test files | Updated usePermissions mocks |
