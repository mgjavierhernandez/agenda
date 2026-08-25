# 26 — Security Hardening, Test Isolation & Production Readiness

**Version:** 1.0
**Date:** August 22, 2026
**Status:** Implemented

---

## 1. Security Headers (Helmet)

Helmet middleware is registered via `SecurityModule` (NestJS middleware), ensuring headers are applied in both production and E2E tests.

**Headers configured:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `X-XSS-Protection: 0`
- `Strict-Transport-Security` (production only)
- `Content-Security-Policy` (production only, configurable)

**Files:**
- `src/common/security/security.module.ts`

---

## 2. Rate Limiting

Implemented via `@nestjs/throttler` v6 with global and per-route limits.

**Global defaults** (configurable via env):
- `RATE_LIMIT_TTL`: Window in seconds (default: 60)
- `RATE_LIMIT_LIMIT`: Max requests per window (default: 100)

**Per-route overrides (auth endpoints):**
| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/login | 50 | 60s |
| POST /auth/refresh | 20 | 60s |
| POST /auth/forgot-password | 100 | 1h |
| POST /auth/reset-password | 100 | 1h |

**Test mode:** When `NODE_ENV=test`, global limits are set to 10000/1s to avoid blocking E2E tests.

**Files:**
- `src/app.module.ts` (ThrottlerModule configuration)
- `src/modules/auth/auth.controller.ts` (per-route @Throttle)

---

## 3. CORS Configuration

- **Development:** When `CORS_ORIGIN` is not set, `origin: true` allows any origin (with credentials).
- **Production:** `CORS_ORIGIN` must be explicitly set. Multiple origins supported (comma-separated).
- **Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers:** Content-Type, Authorization, X-Institution-Id, X-Request-Id
- **Credentials:** Always enabled

**Files:**
- `src/main.ts`

---

## 4. Request ID

Every request receives a unique `X-Request-Id` header.

**Rules:**
- Client can provide `X-Request-Id` if it matches `/^[a-zA-Z0-9\-_.]+$/` and length ≤ 128
- Otherwise, a UUID v4 is generated
- Returned in response header
- Available throughout request lifecycle via `req.requestId`
- Included in structured logs

**Files:**
- `src/common/middleware/request-id.middleware.ts`
- `src/common/security/security.module.ts`

---

## 5. Structured Logging

`LoggingInterceptor` logs every HTTP request/response with:

```
METHOD /path STATUS DURATIONms [rid:UUID] [uid:UUID] [tid:UUID]
```

**Fields logged:**
- HTTP method and path
- Status code
- Duration in ms
- Request ID (from middleware)
- User ID (when authenticated)
- Tenant/Institution ID (when in tenant context)

**Error logging:** 5xx errors logged with stack trace.

**Files:**
- `src/common/interceptors/logging.interceptor.ts`

---

## 6. Error Handling

`AllExceptionsFilter` provides production-safe error responses:

**5xx errors in production:** Stack traces and internal details are stripped. Response contains only `statusCode`, `message` ("Internal server error"), `timestamp`, `path`, and `requestId`.

**5xx errors in development:** Full error details and stack traces included.

**4xx errors:** Validation details and error messages preserved (no sensitive data exposure).

**Files:**
- `src/common/filters/all-exceptions.filter.ts`

---

## 7. Health / Readiness

**GET /api/v1/health** — Liveness check
- Returns `{ status: "ok", timestamp, uptime }`
- Always 200 if the process is running

**GET /api/v1/health/readiness** — Readiness check
- Tests database connectivity via `SELECT 1`
- Returns `{ status: "ok"|"error", timestamp, database: "connected"|"error" }`
- 200 when healthy, body indicates status

**Files:**
- `src/modules/health/health.controller.ts`
- `src/modules/health/health.controller.spec.ts`

---

## 8. Graceful Shutdown

`app.enableShutdownHooks()` registered in main.ts. PrismaService already implements `OnModuleDestroy` for clean disconnect.

---

## 9. IDOR/BOLA Audit — Memberships Controller

**Critical fix:** Memberships controller previously used `@Param('institutionId')` (URL parameter) instead of `req.tenant.institutionId` (validated by TenantContextGuard). This allowed cross-tenant membership manipulation by changing the URL path.

**Fix applied:** All controller methods now use `req.tenant!.institutionId` from the validated tenant context, ignoring the URL parameter value.

**Files:**
- `src/modules/memberships/memberships.controller.ts`

---

## 10. Tenant Isolation Audit

Full query-by-query audit performed across all 20+ service modules. Key findings:

| Category | Count | Status |
|----------|-------|--------|
| SAFE (institutionId in query) | ~150 | ✅ |
| MEDIUM (update by id after findFirst check) | ~30 | ⚠️ Acceptable TOCTOU pattern |
| HIGH (Memberships IDOR) | 7 | ✅ Fixed |
| CRITICAL (Memberships controller) | 1 | ✅ Fixed |

**TOCTOU pattern (MEDIUM):** Many services do `findFirst({id, institutionId})` then `update({id})`. This is a standard pattern — the findFirst validates tenant access, and the update is on the same resource. The TOCTOU window is negligible in single-service architecture.

---

## 11. Input Validation Audit

- Global `ValidationPipe` with `whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`
- All DTOs use class-validator decorators
- String limits enforced on all text fields
- UUID validation on all ID fields
- Enum validation on status/type fields

---

## 12. Pagination Audit

All list endpoints use `skip`/`take` with configurable defaults. Max limit enforced at service level.

---

## 13. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | No | development | Environment mode |
| PORT | No | 3000 | Server port |
| CORS_ORIGIN | No | (allows all in dev) | Comma-separated allowed origins |
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| JWT_ACCESS_SECRET | Yes | — | JWT signing secret |
| JWT_ACCESS_EXPIRES_IN | No | 15m | Access token expiry |
| JWT_REFRESH_EXPIRES_IN | No | 7d | Refresh token expiry |
| PASSWORD_RESET_TOKEN_EXPIRES_MINUTES | No | 60 | Reset token lifetime |
| RATE_LIMIT_TTL | No | 60 | Rate limit window (seconds) |
| RATE_LIMIT_LIMIT | No | 100 | Rate limit max requests |
| FILE_STORAGE_PROVIDER | No | local | Storage backend |
| FILE_STORAGE_PATH | No | ./storage | Local storage path |
| FILE_MAX_SIZE_MB | No | 10 | Max upload size |
| MAX_TASK_ATTACHMENTS | No | 10 | Max attachments per task |
| MAX_COMMUNICATION_ATTACHMENTS | No | 10 | Max attachments per communication |

---

## 14. Files Created

| File | Purpose |
|------|---------|
| `src/common/security/security.module.ts` | Helmet + RequestId middleware registration |
| `src/common/middleware/request-id.middleware.ts` | X-Request-Id generation/validation |
| `src/common/interceptors/logging.interceptor.ts` | Structured HTTP request logging |
| `src/common/filters/all-exceptions.filter.ts` | Production-safe error handling |
| `test/health.e2e-spec.ts` | Health endpoint + security header E2E tests |
| `test/test-utils.ts` | Shared E2E test utilities |
| `docs/26-security-hardening.md` | This document |

## 15. Files Modified

| File | Changes |
|------|---------|
| `src/main.ts` | Added LoggingInterceptor, AllExceptionsFilter, CORS hardening, graceful shutdown |
| `src/app.module.ts` | Added ThrottlerModule, SecurityModule, APP_GUARD for ThrottlerGuard |
| `src/modules/auth/auth.controller.ts` | Added @Throttle to sensitive endpoints |
| `src/modules/health/health.controller.ts` | Added readiness endpoint with DB check |
| `src/modules/health/health.controller.spec.ts` | Updated for readiness tests |
| `src/modules/memberships/memberships.controller.ts` | Fixed IDOR: use req.tenant.institutionId |
| `.env.example` | Added RATE_LIMIT_TTL, RATE_LIMIT_LIMIT |
| `.env` | Added RATE_LIMIT_TTL, RATE_LIMIT_LIMIT, PASSWORD_RESET_TOKEN_EXPIRES_MINUTES |
| `package.json` | Added helmet, @nestjs/throttler |
| `test/app.e2e-spec.ts` | Updated health assertion for new response format |
| `test/memberships.e2e-spec.ts` | Fixed unused variable lint error |
| `test/schedules.e2e-spec.ts` | Fixed `any` type lint error |
| `test/users.e2e-spec.ts` | Fixed unused variable lint errors |
| `test/notifications.e2e-spec.ts` | Fixed static email unique constraint |
| `test/signatures.e2e-spec.ts` | Fixed static email unique constraint |
| `prisma/seed.ts` | Added files:manage permission, fixed duplicate variable |
| `prisma/schema.prisma` | Fixed @map("mime_type") on FileAsset.mimeType |
