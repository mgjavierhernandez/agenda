# 24 - Institutions Module

## Overview

The Institutions Module manages platform-level institution records. This is a **global scope** module -- it operates outside of tenant isolation and does not require an `X-Institution-Id` header. Access is restricted to users with the `SUPER_ADMIN` role.

## Architecture

```
Guard Chain: AccessTokenGuard -> PermissionGuard -> Controller -> Service -> Prisma
```

No `TenantContextGuard` -- institutions are managed at the platform level.

## Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/api/v1/institutions` | `institution:manage` | Create institution |
| GET | `/api/v1/institutions` | `institution:read` | List institutions (paginated) |
| GET | `/api/v1/institutions/:id` | `institution:read` | Get institution by ID |
| PATCH | `/api/v1/institutions/:id` | `institution:manage` | Update institution |
| PATCH | `/api/v1/institutions/:id/deactivate` | `institution:manage` | Deactivate institution (idempotent) |

### POST /api/v1/institutions

**Body (CreateInstitutionDto):**

```typescript
{
  name: string;   // required, 2-200 chars
  slug: string;   // required, unique, URL-friendly
}
```

- Slug must be globally unique. Duplicate slug returns `409 Conflict`.

### GET /api/v1/institutions

**Query (ListInstitutionsQueryDto):**

```typescript
{
  page?: number;     // default 1
  limit?: number;    // default 20, max 100
  status?: InstitutionStatus; // ACTIVE | INACTIVE | SUSPENDED
  search?: string;   // matches name or slug
}
```

### GET /api/v1/institutions/:id

Returns the institution record by UUID.

### PATCH /api/v1/institutions/:id

**Body (UpdateInstitutionDto):**

```typescript
{
  name?: string;
  slug?: string;
}
```

- Slug changes must remain globally unique. Duplicate slug returns `409 Conflict`.

### PATCH /api/v1/institutions/:id/deactivate

No body required. Sets institution status to `INACTIVE`. This operation is **idempotent** -- calling it on an already-inactive institution returns the current state without error.

## DTOs

| DTO | Fields |
|-----|--------|
| `CreateInstitutionDto` | `name`, `slug` |
| `UpdateInstitutionDto` | `name?`, `slug?` |
| `ListInstitutionsQueryDto` | `page?`, `limit?`, `status?`, `search?` |

## Business Rules

- **Slug uniqueness**: Each institution slug must be globally unique.
- **Idempotent deactivation**: Deactivating an already-inactive institution succeeds without error.
- **Global scope**: No `X-Institution-Id` header is required or used.

## RBAC

Access is controlled by `AccessTokenGuard` + `PermissionGuard` at the global scope. Only users with the `SUPER_ADMIN` global role have access to these endpoints. The guard chain checks `GlobalUserRole` permissions rather than tenant-scoped `UserRole`.

| Role | `institution:read` | `institution:manage` |
|------|:---:|:---:|
| SUPER_ADMIN | Y | Y |
| INSTITUTION_ADMIN | - | - |
| TEACHER | - | - |
| PARENT | - | - |
| STUDENT | - | - |

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Validation error (invalid body or query params) |
| 401 | Unauthenticated (missing or invalid JWT) |
| 403 | Forbidden (not a SUPER_ADMIN) |
| 404 | Institution not found |
| 409 | Duplicate slug |

## Files

```
apps/api/src/modules/institutions/
  institutions.controller.ts
  institutions.service.ts
  institutions.module.ts
  dto/create-institution.dto.ts
  dto/update-institution.dto.ts
  dto/list-institutions-query.dto.ts

apps/api/test/institutions.e2e-spec.ts
```
