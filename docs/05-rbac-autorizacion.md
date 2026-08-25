# 05 - RBAC Authorization

## Overview

The RBAC (Role-Based Access Control) Authorization system determines what an authenticated user can do within a specific institution (tenant). It operates after Authentication ("Who are you?") and Tenant Context ("Which institution are you operating in?").

## Architecture

```
Guard Chain:
AccessTokenGuard     → "Who are you?" (JWT → userId)
TenantContextGuard   → "Which institution?" (X-Institution-Id → institutionId)
PermissionGuard      → "What can you do?" (permission codes)
Controller           → Business logic
```

## Authorization Model

### Tenant Scope

```
User
  ↓
UserInstitution (membership in institution)
  ↓
UserRole (assigned roles within institution)
  ↓
Role (roleType = TENANT, institutionId = institution)
  ↓
RolePermission (role ↔ permission mapping)
  ↓
Permission (code = "module:action")
```

### Platform/Global Scope

```
User
  ↓
GlobalUserRole (platform-level role)
  ↓
Role (roleType = GLOBAL, institutionId = NULL)
  ↓
RolePermission (role ↔ permission mapping)
  ↓
Permission (code = "module:action")
```

### Permission Resolution

User's effective permissions = UNION(tenant permissions, global permissions)

This means:
- A user with TEACHER role in Institution A gets TEACHER's permissions for A
- A user with SUPER_ADMIN global role gets all 32 permissions globally
- A user with both gets the union of both sets

## Components

### AuthorizationService

Located at: `src/modules/auth/authorization/authorization.service.ts`

**Methods:**

| Method | Description | Returns |
|--------|-------------|---------|
| `hasPermission(userId, institutionId, code)` | Check single permission | `boolean` |
| `hasAnyPermission(userId, institutionId, codes[])` | Check if has ANY of the codes (OR) | `boolean` |
| `hasAllPermissions(userId, institutionId, codes[])` | Check if has ALL of the codes (AND) | `boolean` |
| `getUserPermissionCodes(userId, institutionId)` | Get all effective permission codes | `string[]` |
| `getUserRoles(userId, institutionId)` | Get tenant-scoped roles | `Role[]` |
| `hasRole(userId, institutionId, roleName)` | Check specific role | `boolean` |
| `getGlobalPermissionCodes(userId)` | Get global permission codes | `string[]` |

### PermissionGuard

Located at: `src/modules/auth/authorization/permission.guard.ts`

A NestJS guard that checks if the authenticated user has the required permissions for the current endpoint.

**Behavior:**
1. Reads required permissions from `@RequirePermission()` decorator metadata
2. If no permissions required → allows (pass-through)
3. Verifies user is authenticated (from AccessTokenGuard)
4. Verifies tenant context exists (from TenantContextGuard)
5. Calls `AuthorizationService.hasAllPermissions()` with AND semantics
6. Returns 403 Forbidden if any permission is missing

### RequirePermission Decorator

Located at: `src/modules/auth/authorization/require-permission.decorator.ts`

```typescript
@RequirePermission('students:read')
@RequirePermission('students:read', 'grades:read')  // AND semantics
```

When multiple codes are provided, ALL must be present (AND logic).

## Permission Codes

All 32 permissions follow the `module:action` format:

| Module | Permissions |
|--------|-------------|
| institution | `read`, `update` |
| users | `read`, `create`, `update`, `delete` |
| roles | `read`, `manage` |
| grades | `read`, `manage` |
| courses | `read`, `manage` |
| subjects | `read`, `manage` |
| students | `read`, `manage` |
| schedules | `read`, `manage` |
| tasks | `read`, `create`, `update`, `delete` |
| communications | `read`, `create`, `send_bulk` |
| signatures | `read`, `request`, `sign` |
| notifications | `read` |
| audit | `read` |
| files | `upload`, `read` |

**No wildcards exist.** Each permission is explicit.

## Roles

### Role Types

| Type | Scope | institutionId | Can be assigned to users |
|------|-------|---------------|--------------------------|
| GLOBAL | Platform-wide | NULL | Via GlobalUserRole |
| TEMPLATE | Blueprint for tenants | NULL | No (used to create tenant roles) |
| TENANT | Institution-specific | institution UUID | Via UserRole |

### Seed Roles

| Role | Type | Permissions |
|------|------|-------------|
| SUPER_ADMIN | GLOBAL | All 32 |
| INSTITUTION_ADMIN | TEMPLATE + TENANT | 31 (all except audit:read) |
| TEACHER | TEMPLATE + TENANT | 20 |
| PARENT | TEMPLATE + TENANT | 11 |
| STUDENT | TEMPLATE + TENANT | 7 |

### Template Roles

Template roles (RoleType.TEMPLATE) are **never** used for authorization. They serve as blueprints that institutions clone when creating tenant-specific roles. The AuthorizationService only considers roles with `roleType = TENANT` for tenant scope and `roleType = GLOBAL` for platform scope.

## SUPER_ADMIN

SUPER_ADMIN is a GLOBAL role with all 32 permissions.

**Key behaviors:**
- Has GlobalUserRole (not UserRole)
- Permissions apply across all institutions when the user has a membership
- To operate within a tenant, the SUPER_ADMIN user MUST have a UserInstitution membership
- Does NOT automatically bypass TenantContextGuard
- Does NOT bypass permission checks
- The scope follows the operation: platform operations use global permissions, tenant operations require tenant context

**Example:**
```
SUPER_ADMIN with GlobalUserRole:
  → Has all 32 permissions globally
  → To access /auth/authorization-check (requires institution:read + tenant context):
    → Must have UserInstitution membership in the target institution
    → PermissionGuard resolves: global permissions include institution:read → ALLOW
```

## Cross-Tenant Protection

The system enforces tenant isolation at multiple levels:

### Database Level (existing)
- Composite FKs: UserRole(userInstitutionId, institutionId) → UserInstitution(id, institutionId)
- UserRole.institutionId must match UserInstitution.institutionId

### Application Level (AuthorizationService)
- `getUserPermissionCodes(userId, institutionId)` queries with explicit `institutionId` filter
- `getUserRoles(userId, institutionId)` queries with explicit `institutionId` filter
- Tenant-scoped UserRole queries always include `institutionId` condition

### Guard Level (PermissionGuard)
- Uses `req.tenant.institutionId` from TenantContextGuard (validated header)
- Never trusts `institutionId` from request body
- Never trusts `institutionId` from query parameters

## Resource-Level Authorization

**This is NOT yet implemented** in this phase but is designed for:

For any tenant resource:
```
resource.institutionId must equal req.tenant.institutionId
```

- `PermissionGuard` determines: "Can you perform this action?"
- Service/Repository determines: "Does this resource belong to the current tenant?"

This prevents IDOR/BOLA attacks where a user with valid permissions accesses resources from another tenant.

## Error Handling

| Scenario | HTTP Status | Message |
|----------|-------------|---------|
| Missing permission | 403 | "Forbidden" |
| Missing tenant context | 403 | "Tenant context required" |
| Unauthenticated | 401 | "Invalid credentials" |

Generic messages are used to avoid information disclosure.

## Usage Examples

### Protecting an Endpoint

```typescript
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
@RequirePermission('students:read')
@Get('students')
async getStudents(@Request() req: AuthenticatedRequest) {
  // Only users with students:read permission can reach here
  // req.tenant.institutionId is validated and available
}
```

### Multiple Permissions (AND)

```typescript
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
@RequirePermission('grades:read', 'students:read')
@Get('student-grades')
async getStudentGrades() {
  // User must have BOTH grades:read AND students:read
}
```

### Programmatic Check

```typescript
const hasPermission = await this.authorizationService.hasPermission(
  userId,
  institutionId,
  'users:create',
);
```

## Guard Chain

```
Request
  │
  ▼
AccessTokenGuard
  │  Validates JWT
  │  Sets req.user = { userId }
  │
  ▼
TenantContextGuard
  │  Reads X-Institution-Id header
  │  Validates membership + institution status
  │  Sets req.tenant = { institutionId, userInstitutionId }
  │
  ▼
PermissionGuard
  │  Reads @RequirePermission() metadata
  │  Calls AuthorizationService.hasAllPermissions()
  │  Uses req.user.userId + req.tenant.institutionId
  │  Throws 403 if missing permissions
  │
  ▼
Controller → Service → Prisma
```

## Demo Endpoint

`GET /api/v1/auth/authorization-check`

Technical validation endpoint protected by the full guard chain.

```json
{
  "authorized": true,
  "institutionId": "uuid"
}
```

Requires: `AccessTokenGuard` + `TenantContextGuard` + `PermissionGuard(@RequirePermission('institution:read'))`

## Security Properties

1. **No body trust**: `req.tenant.institutionId` comes only from validated header
2. **No JWT bypass**: Permissions are NOT in JWT, resolved per-request from database
3. **No template role leakage**: Template roles are filtered out in queries
4. **No cross-tenant access**: All queries include institutionId filter
5. **No information disclosure**: Generic 403 message

## Files

- `src/modules/auth/authorization/authorization.service.ts` - Authorization logic
- `src/modules/auth/authorization/permission.guard.ts` - Guard implementation
- `src/modules/auth/authorization/require-permission.decorator.ts` - Decorator
- `src/modules/auth/authorization/index.ts` - Barrel exports
- `src/modules/auth/authorization/authorization.service.spec.ts` - Unit tests (14 tests)
- `src/modules/auth/authorization/permission.guard.spec.ts` - Unit tests (7 tests)
- `src/modules/auth/auth.controller.ts` - Updated with demo endpoint
- `src/modules/auth/auth.module.ts` - Updated with authorization providers
- `test/rbac-authorization.e2e-spec.ts` - E2E tests (20 tests)
