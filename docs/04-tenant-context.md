# 04 - Tenant Context

## Overview

The Tenant Context system enables multi-tenant operations by allowing authenticated users to select and switch between institutions. It validates that every request targeting a specific tenant is backed by a valid `UserInstitution` membership with ACTIVE status.

## Design Principles

- **Request-level context**: Tenant context is determined per-request via the `X-Institution-Id` header
- **No persistent "active tenant"**: The active tenant is not stored in the database or JWT
- **Guard chain**: `AccessTokenGuard` → `TenantContextGuard` → (future RBAC guards)
- **JWT scope**: JWT identifies the user only (`sub = user.id`); tenant context is separate

## Architecture

```
Request Flow:
┌─────────────────────────────────────────────────────────┐
│  Client Request                                          │
│  Header: Authorization: Bearer <jwt>                    │
│  Header: X-Institution-Id: <uuid>                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  AccessTokenGuard                                       │
│  - Validates JWT token                                  │
│  - Extracts userId from token                           │
│  - Sets req.user = { userId }                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  TenantContextGuard                                      │
│  - Reads X-Institution-Id header                        │
│  - Validates UUID format                                │
│  - Calls TenantContextService.validateTenantAccess()    │
│  - Sets req.tenant = { institutionId, userInstitutionId }│
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Controller / Service                                    │
│  - Access tenant context from req.tenant                │
│  - Perform tenant-scoped operations                     │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints

### GET /api/v1/auth/institutions

Returns the list of institutions the authenticated user belongs to.

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Response (200):**
```json
{
  "institutions": [
    {
      "id": "uuid",
      "name": "Demo School",
      "slug": "demo-school",
      "status": "ACTIVE"
    }
  ]
}
```

### POST /api/v1/auth/tenant/select

Validates and returns institution details for a selected tenant.

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Body:**
```json
{
  "institutionId": "uuid"
}
```

**Response (200):**
```json
{
  "institution": {
    "id": "uuid",
    "name": "Demo School",
    "slug": "demo-school",
    "status": "ACTIVE"
  },
  "membership": {
    "id": "uuid",
    "status": "ACTIVE"
  }
}
```

**Errors:**
- `400` - Invalid UUID format or missing institutionId
- `401` - Unauthorized
- `404` - Institution not found or access denied

### GET /api/v1/auth/tenant

Returns the current tenant context from the `X-Institution-Id` header.

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `X-Institution-Id: <uuid>` (required)

**Response (200):**
```json
{
  "institution": {
    "id": "uuid",
    "name": "Demo School",
    "slug": "demo-school",
    "status": "ACTIVE"
  },
  "membership": {
    "id": "uuid",
    "status": "ACTIVE"
  }
}
```

**Errors:**
- `401` - Unauthorized
- `403` - Missing/institution header, invalid UUID format, inactive membership, or inactive institution

## Implementation Details

### TenantContextService

Located at: `src/modules/auth/tenant/tenant-context.service.ts`

**Methods:**
- `getUserInstitutions(userId)` - Returns list of institutions for a user
- `validateTenantAccess(userId, institutionId)` - Validates membership and returns tenant context
- `getInstitutionForContext(userId, institutionId)` - Returns institution and membership details

### TenantContextGuard

Located at: `src/modules/auth/tenant/tenant-context.guard.ts`

**Validations:**
1. User must be authenticated (from AccessTokenGuard)
2. `X-Institution-Id` header must be present
3. Header value must be a valid UUID
4. User must have an ACTIVE membership for the institution
5. Institution must have ACTIVE status

**On success:**
- Attaches `req.tenant = { institutionId, userInstitutionId }`

### AuthenticatedRequest Interface

```typescript
interface AuthenticatedRequest extends Request {
  user: { userId: string };
  tenant?: TenantContext;
}
```

## Validation Rules

| Check | Error Code | Error Message |
|-------|------------|---------------|
| Missing institution header | 403 | Institution context required |
| Invalid UUID format | 403 | Invalid institution ID format |
| No membership found | 403 | Access denied to this institution |
| INACTIVE membership | 403 | Membership is not active |
| INACTIVE institution | 403 | Institution is not active |
| SUSPENDED membership | 403 | Membership is not active |
| SUSPENDED institution | 403 | Institution is not active |

## Unit Tests

### TenantContextService Tests (10 tests)
- getUserInstitutions returns institutions for a user
- getUserInstitutions returns empty array for user with no memberships
- validateTenantAccess returns tenant context for valid access
- validateTenantAccess throws ForbiddenException for non-existent membership
- validateTenantAccess throws ForbiddenException for INACTIVE membership
- validateTenantAccess throws ForbiddenException for SUSPENDED membership
- validateTenantAccess throws ForbiddenException for INACTIVE institution
- validateTenantAccess throws ForbiddenException for SUSPENDED institution
- getInstitutionForContext returns institution and membership details
- getInstitutionForContext throws NotFoundException for non-existent membership

### TenantContextGuard Tests (9 tests)
- allows access with valid institution header and active membership
- throws UnauthorizedException when user is not authenticated
- throws ForbiddenException when institution header is missing
- throws ForbiddenException when institution header is empty
- throws ForbiddenException for invalid UUID format
- throws ForbiddenException when membership is inactive
- throws ForbiddenException when institution is inactive
- throws ForbiddenException when user has no access to institution
- attaches tenant context to request on success

## E2E Tests (15 tests)

Tests cover:
- GET /auth/institutions - returns list of user institutions
- POST /auth/tenant/select - validates and returns institution details
- GET /auth/tenant - returns current tenant from header
- Multi-tenant switching between institutions
- Error cases (401, 403, 404, 400)
- Inactive membership/institution handling

## Files

- `src/modules/auth/tenant/tenant-context.service.ts` - Service implementation
- `src/modules/auth/tenant/tenant-context.guard.ts` - Guard implementation
- `src/modules/auth/dto/select-tenant.dto.ts` - DTO for tenant selection
- `src/modules/auth/auth.controller.ts` - Updated with tenant endpoints
- `src/modules/auth/auth.module.ts` - Updated with tenant providers/exports
- `src/modules/auth/tenant/tenant-context.service.spec.ts` - Service unit tests
- `src/modules/auth/tenant/tenant-context.guard.spec.ts` - Guard unit tests
- `test/tenant-context.e2e-spec.ts` - E2E tests
