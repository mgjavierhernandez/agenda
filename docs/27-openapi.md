# 27 — API Contract & OpenAPI Foundation

## 1. Objective

Document the official REST API contract for Agenda Escolar Digital using OpenAPI/Swagger, aligned with the real backend state. No business functionality changes were made.

## 2. Swagger Access

| Item | Value |
|------|-------|
| Swagger UI | `http://localhost:3000/api/docs` |
| OpenAPI JSON | `http://localhost:3000/api/docs-json` |
| Environment | Development / Test only |
| Production | Swagger is **disabled** in `NODE_ENV=production` |

Swagger is configured via `@nestjs/swagger` in `apps/api/src/main.ts`.

## 3. Authentication

All protected endpoints require a JWT Bearer token:

```
Authorization: Bearer <token>
```

In Swagger UI, click **Authorize** and paste the access token obtained from `POST /api/v1/auth/login`.

### Auth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Login with email + password → returns accessToken + refreshToken |
| `/api/v1/auth/refresh` | POST | Exchange refreshToken for new token pair |
| `/api/v1/auth/logout` | POST | Invalidate refresh token |
| `/api/v1/auth/forgot-password` | POST | Request password reset email |
| `/api/v1/auth/reset-password` | POST | Reset password with token |
| `/api/v1/auth/profile` | GET | Get current user profile (requires JWT) |
| `/api/v1/auth/institutions` | GET | List user's institutions (requires JWT) |
| `/api/v1/auth/tenant/select` | POST | Select active tenant (requires JWT) |
| `/api/v1/auth/tenant` | GET | Get current tenant context (requires JWT + tenant) |
| `/api/v1/auth/authorization-check` | GET | Verify authorization for current tenant |

## 4. Tenant Context

### Header: `X-Institution-Id`

Most endpoints require the `X-Institution-Id` header to scope requests to a specific institution.

| Behavior | Description |
|----------|-------------|
| Required | For all tenant-scoped endpoints (students, courses, grades, etc.) |
| Not required | Auth endpoints (login, refresh, forgot-password, reset-password), health, institutions list/create |
| SUPER_ADMIN | Can access cross-tenant data when `X-Institution-Id` is not provided |
| Tenant-scoped user | Must provide valid institution ID they have a membership for |

The `TenantContextGuard` validates the header and resolves the institution context.

## 5. Request ID

### Header: `X-Request-Id`

| Behavior | Description |
|----------|-------------|
| Client-provided | You may supply your own request ID (max 128 chars, alphanumeric + `-_.`) |
| Auto-generated | If omitted or invalid, the backend generates a UUID v4 |
| Response | Always returned in the `X-Request-Id` response header |
| Error responses | Included in the error body as `requestId` field |
| Purpose | Distributed tracing and debugging |

## 6. HTTP Conventions

| Convention | Detail |
|------------|--------|
| Base URL | `/api/v1` |
| Content-Type | `application/json` (except file uploads: `multipart/form-data`) |
| IDs | UUID v4 format |
| Dates | ISO 8601 date-time strings (`2024-01-15T10:30:00.000Z`) |
| Times | `HH:MM` or `HH:MM:SS` format |
| Pagination | `page` (default 1) + `limit` (default 20, max 100) |
| Soft deletes | Entities are deactivated, not physically deleted |

## 7. Pagination

List endpoints return paginated results:

```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 150,
  "totalPages": 8
}
```

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | — | Page number |
| `limit` | integer | 20 | 100 | Items per page |
| `search` | string | — | — | Full-text search (where supported) |

## 8. Error Handling

### Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["field should not be empty"],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/students",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### HTTP Status Codes

| Code | When |
|------|------|
| 200 | Successful read/update |
| 201 | Successful creation |
| 204 | Successful deletion (no body) |
| 400 | Validation error / bad request |
| 401 | Missing or invalid JWT token |
| 403 | Insufficient permissions (RBAC) |
| 404 | Resource not found |
| 409 | Conflict (duplicate, already exists) |
| 429 | Rate limit exceeded |
| 500 | Internal server error (message hidden in production) |
| 503 | Service unavailable (health readiness failure) |

## 9. RBAC (Role-Based Access Control)

Permissions are enforced via `@RequirePermission` decorator and `PermissionGuard`.

### Permission Format

```
module:action
```

### Permission Actions

| Action | Description |
|--------|-------------|
| `read` | View/list resources |
| `create` | Create new resources |
| `update` | Modify existing resources |
| `delete` | Deactivate/delete resources |
| `manage` | Full CRUD access |
| `request` | Create signature requests |
| `sign` | Sign or decline signature requests |
| `upload` | Upload files |

### Module Permissions

| Module | Permissions |
|--------|-------------|
| students | `students:read`, `students:manage` |
| courses | `courses:read`, `courses:manage` |
| subjects | `subjects:read`, `subjects:manage` |
| grades | `grades:read`, `grades:manage` |
| schedules | `schedules:read`, `schedules:manage` |
| tasks | `tasks:read`, `tasks:manage` |
| communications | `communications:read`, `communications:manage` |
| signatures | `signatures:read`, `signatures:request`, `signatures:sign` |
| notifications | `notifications:read`, `notifications:manage` |
| school-grades | `school-grades:read`, `school-grades:manage` |
| academic-periods | `academic-periods:read`, `academic-periods:manage` |
| guardians | `guardians:read`, `guardians:manage` |
| enrollments | `enrollments:read`, `enrollments:manage` |
| teacher-assignments | `teacher-assignments:read`, `teacher-assignments:manage` |
| users | `users:read`, `users:create`, `users:update`, `users:delete` |
| memberships | `memberships:read`, `memberships:manage` |
| institution | `institution:read`, `institution:manage` |
| files | `files:read`, `files:upload`, `files:manage` |

## 10. Modules

| Module | Tag | Endpoints | Description |
|--------|-----|-----------|-------------|
| Auth | Auth | 10 | Login, refresh, logout, password recovery, profile, tenant |
| Health | Health | 2 | Liveness and readiness probes |
| Institutions | Institutions | 5 | CRUD + deactivate |
| Users | Users | 5 | CRUD + deactivate |
| Memberships | Memberships | 7 | Link/unlink users, assign/remove roles |
| Students | Students | 5 | CRUD + deactivate |
| Courses | Courses | 5 | CRUD + deactivate |
| Subjects | Subjects | 5 | CRUD + deactivate |
| Grades | Grades | 5 | CRUD + deactivate |
| Schedules | Schedules | 5 | CRUD + deactivate |
| Tasks | Tasks | 10 | CRUD + publish/close/deactivate + attachments |
| Task Assignments | Task Assignments | 5 | CRUD + deactivate |
| Task Submissions | Task Submissions | 4 | Create/update submission + grade |
| Communications | Communications | 9 | CRUD + publish/deactivate + attachments |
| Communication Recipients | Communication Recipients | 4 | List, unread count, mark read |
| Signatures | Signatures | 8 | CRUD + publish/sign/decline/deactivate |
| Notifications | Notifications | 7 | CRUD + mark read + delete all |
| School Grades | School Grades | 5 | CRUD + deactivate |
| Academic Periods | Academic Periods | 5 | CRUD + deactivate |
| Guardians | Guardians | 4 | Link/unlink students, find relationships |
| Enrollments | Enrollments | 5 | CRUD + deactivate |
| Teacher Assignments | Teacher Assignments | 5 | CRUD + deactivate |
| Files | Files | 4 | Upload, metadata, download, delete |

**Total: ~120+ endpoints across 23 modules**

## 11. OpenAPI Generation

The OpenAPI specification is automatically generated from code via `@nestjs/swagger`.

- Swagger UI: `GET /api/docs`
- JSON spec: `GET /api/docs-json`
- Generated from: Controller decorators + DTO metadata
- No manual JSON maintenance required

## 12. Frontend Consumption Guidance

The OpenAPI spec is designed for consumption by:

- `apps/web/` (React/Vite frontend)
- API clients (OpenAPI Generator, or-tools)
- Postman collections

### Key patterns for frontend:

1. **Login flow**: `POST /auth/login` → store tokens → use `Authorization: Bearer` header
2. **Tenant selection**: `GET /auth/institutions` → `POST /auth/tenant/select` → use `X-Institution-Id` header
3. **CRUD operations**: Standard REST patterns with pagination
4. **File uploads**: `POST /files` with `multipart/form-data`
5. **Error handling**: Check `statusCode` and `message` fields in error responses
6. **Tracing**: Use `X-Request-Id` from responses for debugging

## 13. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 50 | 60s |
| `POST /auth/refresh` | 20 | 60s |
| `POST /auth/forgot-password` | 100 | 3600s |
| `POST /auth/reset-password` | 100 | 3600s |
| All other endpoints | 100 | 60s (configurable) |

Rate limit exceeded returns `429 Too Many Requests`.

## 14. Security

- JWT Bearer authentication on all protected endpoints
- Tenant isolation via `TenantContextGuard` + `PermissionGuard`
- Helmet security headers
- CORS configured per environment
- Input validation via `class-validator` + `ValidationPipe` (whitelist + forbidNonWhitelisted)
- Request ID for distributed tracing
- Structured logging with request context
- Production-safe error messages (500 errors return generic message)
