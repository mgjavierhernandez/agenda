# 23 - Users Module

## Overview

The Users Module provides CRUD operations for managing users within an institution context. Users are globally unique by email but are accessed through tenant-scoped endpoints that require an `X-Institution-Id` header. A user must have a `UserInstitution` membership to be visible within a given institution.

## Architecture

```
Guard Chain: AccessTokenGuard -> TenantContextGuard -> PermissionGuard -> Controller -> Service -> Prisma
```

## Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/api/v1/users` | `users:create` | Create user |
| GET | `/api/v1/users` | `users:read` | List users (paginated, searchable) |
| GET | `/api/v1/users/:id` | `users:read` | Get user by ID |
| PATCH | `/api/v1/users/:id` | `users:update` | Update user |
| PATCH | `/api/v1/users/:id/deactivate` | `users:delete` | Deactivate user (revokes all refresh tokens) |

### POST /api/v1/users

**Body (CreateUserDto):**

```typescript
{
  email: string;      // required, valid email
  password: string;   // required, min 8 chars
  firstName: string;  // required
  lastName: string;   // required
}
```

- Email is normalized to lowercase before persistence.
- Password is hashed with argon2id (memoryCost: 65536, timeCost: 3, parallelism: 4).
- Duplicate email returns `409 Conflict`.

### GET /api/v1/users

**Query (ListUsersQueryDto):**

```typescript
{
  page?: number;     // default 1
  limit?: number;    // default 20, max 100
  search?: string;   // matches firstName, lastName, or email
  status?: UserStatus; // ACTIVE | INACTIVE | SUSPENDED
}
```

Returns only users that have a `UserInstitution` membership in the current institution.

### GET /api/v1/users/:id

Returns the user record. The user must belong to the current institution (via `UserInstitution`).

### PATCH /api/v1/users/:id

**Body (UpdateUserDto):**

```typescript
{
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: UserStatus;
}
```

- Email changes are normalized to lowercase.
- Duplicate email returns `409 Conflict`.
- `passwordHash` is never exposed in responses.

### PATCH /api/v1/users/:id/deactivate

No body required. Sets user status to `INACTIVE` and revokes all active refresh tokens for the user across all institutions.

## DTOs

| DTO | Fields |
|-----|--------|
| `CreateUserDto` | `email`, `password`, `firstName`, `lastName` |
| `UpdateUserDto` | `firstName?`, `lastName?`, `email?`, `status?` |
| `ListUsersQueryDto` | `page?`, `limit?`, `search?`, `status?` |

## Business Rules

- **Email normalization**: All emails are lowercased before storage.
- **Password hashing**: Passwords are hashed using argon2id with parameters `memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`.
- **Password sanitization**: `passwordHash` is never included in API responses.
- **Deactivation**: Deactivating a user revokes all of their refresh tokens, preventing further authenticated requests.
- **Membership visibility**: A user is only visible within an institution if they have an active `UserInstitution` record for that institution.

## Tenant Isolation

Users are scoped to the institution identified by the `X-Institution-Id` header. The `TenantContextGuard` extracts this header and ensures all queries are filtered to the current tenant. A user without a `UserInstitution` membership in the requested institution will not appear in results.

## RBAC

Access is controlled by `TenantContextGuard` + `PermissionGuard`. The following roles have access:

| Role | `users:read` | `users:create` | `users:update` | `users:delete` |
|------|:---:|:---:|:---:|:---:|
| SUPER_ADMIN | Y | Y | Y | Y |
| INSTITUTION_ADMIN | Y | Y | Y | Y |
| TEACHER | Y | - | - | - |
| PARENT | Y | - | - | - |
| STUDENT | Y | - | - | - |

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Validation error (invalid body or query params) |
| 401 | Unauthenticated (missing or invalid JWT) |
| 403 | Forbidden (insufficient permissions) |
| 404 | User not found (or not in current institution) |
| 409 | Duplicate email |

## Files

```
apps/api/src/modules/users/
  users.controller.ts
  users.service.ts
  users.module.ts
  dto/create-user.dto.ts
  dto/update-user.dto.ts
  dto/list-users-query.dto.ts

apps/api/test/users.e2e-spec.ts
```
